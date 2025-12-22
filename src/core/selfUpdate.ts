import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import semver from 'semver';
import { execa } from 'execa';
import { logger } from './logger.js';
import { writeConfig } from './config.js';

const REPO_OWNER = 'Kinin-Code-Offical';
const REPO_NAME = 'cloudsqlctl';
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
const GITHUB_RELEASES_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`;
const GITHUB_RELEASE_TAG_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags`;
const TIMEOUT_MS = 60000;
const MAX_RETRIES = 2;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export interface ReleaseInfo {
    tag_name: string;
    assets: Array<{
        name: string;
        browser_download_url: string;
    }>;
    body: string;
}

export interface UpdateStatus {
    currentVersion: string;
    latestVersion: string;
    updateAvailable: boolean;
    releaseInfo?: ReleaseInfo;
}

function getGithubHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'User-Agent': 'cloudsqlctl/upgrade' };
    const token = process.env.CLOUDSQLCTL_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}

function getRateLimitMessage(error: unknown): string | null {
    if (axios.isAxiosError(error) && error.response) {
        const remaining = error.response.headers['x-ratelimit-remaining'];
        const reset = error.response.headers['x-ratelimit-reset'];
        if (remaining === '0' && reset) {
            const resetTime = new Date(Number(reset) * 1000).toISOString();
            return `GitHub API rate limit exceeded. Resets at ${resetTime}.`;
        }
    }
    return null;
}

function shouldRetry(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
        if (!error.response) return true;
        return RETRYABLE_STATUS.has(error.response.status);
    }
    return false;
}

async function githubGet<T>(url: string) {
    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
        try {
            return await axios.get<T>(url, {
                timeout: TIMEOUT_MS,
                headers: getGithubHeaders()
            });
        } catch (error) {
            attempt++;
            const rateLimit = getRateLimitMessage(error);
            if (rateLimit) {
                logger.warn(rateLimit);
            }
            if (attempt > MAX_RETRIES || !shouldRetry(error)) {
                throw error;
            }
            const delayMs = 1000 * attempt;
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    throw new Error('GitHub API request failed after retries');
}

export async function getLatestRelease(): Promise<ReleaseInfo> {
    try {
        const response = await githubGet<ReleaseInfo>(GITHUB_API_URL);
        return response.data;
    } catch (error) {
        logger.error('Failed to fetch latest release info', error);
        throw error;
    }
}

function normalizeTag(tag: string): string {
    return tag.startsWith('v') ? tag : `v${tag}`;
}

export async function getReleaseByTag(tag: string): Promise<ReleaseInfo> {
    try {
        const response = await githubGet<ReleaseInfo>(`${GITHUB_RELEASE_TAG_URL}/${normalizeTag(tag)}`);
        return response.data;
    } catch (error) {
        logger.error('Failed to fetch release by tag', error);
        throw error;
    }
}

export async function getLatestPrerelease(): Promise<ReleaseInfo> {
    try {
        const response = await githubGet<ReleaseInfo[]>(GITHUB_RELEASES_URL);
        const releases = Array.isArray(response.data) ? response.data : [];
        const prerelease = releases.find((r: { prerelease?: boolean; draft?: boolean }) => r.prerelease && !r.draft);
        if (!prerelease) {
            throw new Error('No prerelease found');
        }
        return prerelease;
    } catch (error) {
        logger.error('Failed to fetch latest prerelease info', error);
        throw error;
    }
}

export async function checkForUpdates(
    currentVersion: string,
    options: { channel?: 'stable' | 'beta'; targetVersion?: string } = {}
): Promise<UpdateStatus> {
    let release: ReleaseInfo;
    if (options.targetVersion) {
        release = await getReleaseByTag(options.targetVersion);
    } else if (options.channel === 'beta') {
        release = await getLatestPrerelease();
    } else {
        release = await getLatestRelease();
    }
    // Remove 'v' prefix if present for semver comparison
    const latestVer = release.tag_name.replace(/^v/, '');
    const currentVer = currentVersion.replace(/^v/, '');

    const updateAvailable = semver.gt(latestVer, currentVer);

    // Update config with check info
    try {
        await writeConfig({
            lastUpdateCheck: new Date().toISOString(),
            lastUpdateAvailableVersion: updateAvailable ? release.tag_name : undefined
        });
    } catch (_e) {
        // Ignore config write errors during check
    }

    return {
        currentVersion,
        latestVersion: release.tag_name,
        updateAvailable,
        releaseInfo: release
    };
}

export async function fetchSha256Sums(release: ReleaseInfo): Promise<Map<string, string>> {
    const checksumAsset = release.assets.find(a => a.name === 'SHA256SUMS.txt');
    if (!checksumAsset) {
        throw new Error('SHA256SUMS.txt not found in release assets');
    }

    const response = await axios.get(checksumAsset.browser_download_url, {
        responseType: 'text',
        timeout: TIMEOUT_MS,
        headers: getGithubHeaders()
    });

    const sums = new Map<string, string>();
    const lines = response.data.split('\n');
    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
            // Format: <hash>  <filename>
            sums.set(parts[1], parts[0]);
        }
    }
    return sums;
}

export async function downloadFile(url: string, destPath: string): Promise<void> {
    await fs.ensureDir(path.dirname(destPath));

    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
        try {
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream',
                timeout: TIMEOUT_MS,
                headers: { 'User-Agent': 'cloudsqlctl/upgrade' }
            });

            const writer = fs.createWriteStream(destPath);
            response.data.pipe(writer);

            await new Promise<void>((resolve, reject) => {
                writer.on('finish', () => resolve());
                writer.on('error', reject);
            });
            return;
        } catch (error) {
            attempt++;
            if (attempt > MAX_RETRIES) throw error;
            logger.warn(`Download failed, retrying... (${error})`);
        }
    }
}

export async function verifySha256(filePath: string, expectedHash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('error', err => reject(err));
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => {
            const fileHash = hash.digest('hex');
            resolve(fileHash.toLowerCase() === expectedHash.toLowerCase());
        });
    });
}

export function detectInstallContext(): 'installer' | 'portable' {
    const { execPath } = process;
    // If running from source (node.exe), default to portable logic but likely won't work well
    if (path.basename(execPath).toLowerCase() === 'node.exe') {
        return 'portable';
    }

    // Check if running from Program Files
    if (execPath.includes('Program Files')) {
        return 'installer';
    }

    return 'portable';
}

export function pickAsset(release: ReleaseInfo, mode: 'auto' | 'installer' | 'exe'): { name: string, url: string } {
    const context = mode === 'auto' ? detectInstallContext() : mode;

    let assetNamePattern: RegExp;
    if (context === 'installer') {
        assetNamePattern = /cloudsqlctl-setup\.exe$/i;
    } else {
        assetNamePattern = /cloudsqlctl\.exe$/i;
    }

    const asset = release.assets.find(a => assetNamePattern.test(a.name));
    if (!asset) {
        throw new Error(`Could not find suitable asset for mode '${context}' (pattern: ${assetNamePattern})`);
    }

    return { name: asset.name, url: asset.browser_download_url };
}

export async function applyUpdateInstaller(installerPath: string, silent: boolean, elevate: boolean) {
    logger.info('Launching installer...');

    const args: string[] = [];
    if (silent) {
        args.push('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART');
    }

    // Use PowerShell Start-Process with environment variables for both elevated and non-elevated runs
    const envVars: Record<string, string> = {
        'PS_INSTALLER_PATH': installerPath,
        'PS_INSTALLER_ARGS': args.join(' ')
    };

    const basePsCommand = `
        $p = [System.Environment]::GetEnvironmentVariable('PS_INSTALLER_PATH')
        $a = [System.Environment]::GetEnvironmentVariable('PS_INSTALLER_ARGS')
    `.trim();

    if (elevate) {
        // Elevated: use -Verb RunAs
        const psCommand = `
            ${basePsCommand}
            Start-Process -FilePath $p -ArgumentList $a -Verb RunAs -Wait
        `.trim();

        await execa('powershell', ['-NoProfile', '-NonInteractive', '-Command', psCommand], {
            env: { ...process.env, ...envVars }
        });
    } else {
        // Non-elevated: run without -Verb RunAs
        const psCommand = `
            ${basePsCommand}
            Start-Process -FilePath $p -ArgumentList $a -Wait
        `.trim();

        await execa('powershell', ['-NoProfile', '-NonInteractive', '-Command', psCommand], {
            env: { ...process.env, ...envVars }
        });
    }
}

export async function applyUpdatePortableExe(newExePath: string, targetExePath: string) {
    logger.info('Applying portable update...');

    const updateScriptPath = path.join(path.dirname(targetExePath), 'apply-update.ps1');
    const backupPath = `${targetExePath}.bak`;
    const { pid } = process;

    // PowerShell script to wait for PID exit, swap files, and restart
    const psScript = `
param($PidToWait, $NewExe, $TargetExe, $BackupExe)

Write-Host "Waiting for process $PidToWait to exit..."
try {
    $p = Get-Process -Id $PidToWait -ErrorAction SilentlyContinue
    if ($p) { $p.WaitForExit() }
} catch {}

Write-Host "Swapping binaries..."
Move-Item -Path $TargetExe -Destination $BackupExe -Force -ErrorAction SilentlyContinue
Move-Item -Path $NewExe -Destination $TargetExe -Force

Write-Host "Starting new version..."
Start-Process -FilePath $TargetExe -ArgumentList "--version"
`;

    await fs.writeFile(updateScriptPath, psScript);

    // Spawn detached PowerShell process
    const child = execa('powershell', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', updateScriptPath,
        '-PidToWait', pid.toString(),
        '-NewExe', newExePath,
        '-TargetExe', targetExePath,
        '-BackupExe', backupPath
    ], {
        detached: true,
        stdio: 'ignore'
    });

    child.unref();
    logger.info('Update script spawned. Exiting to allow update to proceed.');
    process.exit(0);
}
