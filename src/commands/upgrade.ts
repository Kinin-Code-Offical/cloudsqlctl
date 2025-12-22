import { Command } from 'commander';
import path from 'path';
import { logger } from '../core/logger.js';
import { readConfig, writeConfig } from '../core/config.js';
import { USER_PATHS } from '../system/paths.js';
import { readPolicy, resolveUpgradePolicy } from '../core/policy.js';
import {
    checkForUpdates,
    pickAsset,
    fetchSha256Sums,
    downloadFile,
    verifySha256,
    applyUpdateInstaller,
    applyUpdatePortableExe,
    detectInstallContext
} from '../core/selfUpdate.js';
import { isAdmin } from '../system/powershell.js';

function isSystemScopePath(filePath: string): boolean {
    const normalized = filePath.toLowerCase();
    return normalized.includes('\\program files') || normalized.includes('\\program files (x86)') || normalized.includes('\\programdata');
}

export const upgradeCommand = new Command('upgrade')
    .description('Upgrade cloudsqlctl to the latest version')
    .option('--check-only', 'Only check for updates, do not download or install')
    .option('--no-install', 'Download only, do not install')
    .option('--asset <mode>', 'Asset type to download (auto, installer, exe)', 'auto')
    .option('--dir <path>', 'Download directory', path.join(USER_PATHS.HOME, 'downloads', 'updates'))
    .option('--force', 'Force update even if version is same or older')
    .option('--no-silent', 'Run installer in interactive mode (installer only)')
    .option('--no-elevate', 'Do not attempt to elevate privileges (installer only)')
    .option('--channel <channel>', 'Update channel (stable or beta)')
    .option('--version <version>', 'Install a specific version (e.g. 0.4.14 or v0.4.14)')
    .option('--pin <version>', 'Pin to a specific version for future upgrades')
    .option('--unpin', 'Clear pinned version')
    .option('--json', 'Output status in JSON format')
    .action(async (options) => {
        try {
            const currentVersion = process.env.CLOUDSQLCTL_VERSION || '0.0.0';
            const policy = await readPolicy();
            const config = await readConfig();
            const policyResolved = resolveUpgradePolicy(policy, {
                channel: options.channel,
                version: options.version,
                pin: options.pin,
                unpin: options.unpin
            });

            const channel = ((policyResolved.channel || options.channel || config.updateChannel || 'stable') as 'stable' | 'beta');

            if (channel !== 'stable' && channel !== 'beta') {
                throw new Error(`Invalid channel '${channel}'. Use 'stable' or 'beta'.`);
            }

            if (options.unpin) {
                await writeConfig({ pinnedVersion: undefined });
            }

            if (options.pin) {
                await writeConfig({ pinnedVersion: options.pin, updateChannel: channel });
            } else if (options.channel) {
                await writeConfig({ updateChannel: channel });
            }
            const targetVersion = policyResolved.targetVersion || options.version || options.pin || (options.unpin ? undefined : config.pinnedVersion);

            if (!options.json) {
                const suffix = targetVersion ? ` (target: ${targetVersion})` : '';
                logger.info(`Checking for updates (Current: v${currentVersion}, channel: ${channel})${suffix}...`);
            }

            const status = await checkForUpdates(currentVersion, { channel, targetVersion });

            if (options.json) {
                console.log(JSON.stringify(status, null, 2));
                if (options.checkOnly) return;
            }

            if (!status.updateAvailable && !options.force) {
                if (!options.json) logger.info(`You are already on the latest version (v${status.latestVersion}).`);
                return;
            }

            if (!options.json) logger.info(`New version available: v${status.latestVersion}`);

            if (options.checkOnly) return;

            if (!status.releaseInfo) {
                throw new Error('Release info missing');
            }

            // 1. Pick Asset
            const assetMode = options.asset as 'auto' | 'installer' | 'exe';
            const asset = pickAsset(status.releaseInfo, assetMode);
            if (!options.json) logger.info(`Selected asset: ${asset.name}`);

            // 2. Fetch Checksums
            if (!options.json) logger.info('Fetching checksums...');
            const checksums = await fetchSha256Sums(status.releaseInfo);
            const expectedHash = checksums.get(asset.name);

            if (!expectedHash) {
                throw new Error(`No checksum found for ${asset.name}`);
            }

            // 3. Download
            const downloadDir = options.dir;
            const downloadPath = path.join(downloadDir, asset.name);
            if (!options.json) logger.info(`Downloading to ${downloadPath}...`);

            await downloadFile(asset.url, downloadPath);

            // 4. Verify
            if (!options.json) logger.info('Verifying checksum...');
            const valid = await verifySha256(downloadPath, expectedHash);
            if (!valid) {
                throw new Error('Checksum verification failed! File may be corrupted.');
            }
            if (!options.json) logger.info('Checksum verified.');

            if (!options.install) {
                if (!options.json) logger.info('Download complete. Install skipped (--no-install).');
                return;
            }

            // 5. Apply Update
            const context = options.asset === 'auto' ? detectInstallContext() : options.asset;
            const admin = await isAdmin();
            const systemScope = isSystemScopePath(process.execPath);

            if (context === 'installer' && !admin && options.elevate === false) {
                throw new Error('System-scope update requires elevation. Re-run without --no-elevate or run as admin.');
            }

            if (context === 'installer' || asset.name.endsWith('.exe') && asset.name.includes('setup')) {
                if (!options.json) logger.info('Applying update via installer...');
                const shouldElevate = !admin && options.elevate !== false;
                await applyUpdateInstaller(downloadPath, options.silent !== false, shouldElevate);
            } else {
                if (!options.json) logger.info('Applying portable update...');
                if (systemScope && !admin) {
                    throw new Error('Portable updates to system-scope installs require admin. Use the installer or re-run as admin.');
                }
                // For portable, we need to know the target exe. 
                // If running packaged, it's process.execPath.
                // If running node, we can't really update "node.exe", so we assume dev env and warn.
                if (path.basename(process.execPath).toLowerCase() === 'node.exe') {
                    logger.warn('Cannot auto-update when running via node. Please update source code or download binary manually.');
                    return;
                }
                await applyUpdatePortableExe(downloadPath, process.execPath);
            }

        } catch (error) {
            if (options.json) {
                console.log(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
            } else {
                logger.error('Upgrade failed', error);
            }
            process.exit(1);
        }
    });
