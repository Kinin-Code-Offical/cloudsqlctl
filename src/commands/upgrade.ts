import { Command } from 'commander';
import path from 'path';
import { logger } from '../core/logger.js';
import { USER_PATHS } from '../system/paths.js';
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
    .option('--json', 'Output status in JSON format')
    .action(async (options) => {
        try {
            const currentVersion = process.env.CLOUDSQLCTL_VERSION || '0.0.0';

            if (!options.json) {
                logger.info(`Checking for updates (Current: v${currentVersion})...`);
            }

            const status = await checkForUpdates(currentVersion);

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
