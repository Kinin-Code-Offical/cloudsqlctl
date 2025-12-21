import axios from 'axios';
import fs from 'fs-extra';
import crypto from 'crypto';
import { PATHS } from '../system/paths.js';
import { logger } from './logger.js';

const GITHUB_REPO = 'GoogleCloudPlatform/cloud-sql-proxy';
const ASSET_NAME = 'cloud-sql-proxy.x64.exe';
const CHECKSUM_ASSET_NAME = 'cloud-sql-proxy.x64.exe.sha256';

export async function getLatestVersion(): Promise<string> {
    try {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
        const response = await axios.get(url);
        return response.data.tag_name;
    } catch (error) {
        logger.error('Failed to fetch latest version', error);
        throw error;
    }
}

async function verifyChecksum(filePath: string, expectedChecksum: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('error', err => reject(err));
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => {
            const fileHash = hash.digest('hex');
            resolve(fileHash === expectedChecksum);
        });
    });
}

export async function downloadProxy(version: string) {
    let downloadUrl: string | undefined;
    let checksumUrl: string | undefined;

    try {
        const releaseUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${version}`;
        const response = await axios.get(releaseUrl);
        const assets = response.data.assets;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const asset = assets.find((a: any) => a.name === ASSET_NAME);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checksumAsset = assets.find((a: any) => a.name === CHECKSUM_ASSET_NAME);

        if (asset) {
            downloadUrl = asset.browser_download_url;
        }
        if (checksumAsset) {
            checksumUrl = checksumAsset.browser_download_url;
        }
    } catch (_e) {
        logger.warn('Failed to find asset in GitHub release, falling back to storage URL');
    }

    if (!downloadUrl) {
        const vVersion = version.startsWith('v') ? version : `v${version}`;
        downloadUrl = `https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/${vVersion}/${ASSET_NAME}`;
        checksumUrl = `https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/${vVersion}/${CHECKSUM_ASSET_NAME}`;
    }

    logger.info(`Downloading Cloud SQL Proxy ${version} from ${downloadUrl}`);

    await fs.ensureDir(PATHS.BIN);
    const tempFile = `${PATHS.PROXY_EXE}.temp`;
    const writer = fs.createWriteStream(tempFile);

    const response = await axios({
        url: downloadUrl,
        method: 'GET',
        responseType: 'stream',
    });

    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });

    if (checksumUrl) {
        logger.info('Verifying checksum...');
        try {
            const checksumResponse = await axios.get(checksumUrl);
            const expectedChecksum = checksumResponse.data.trim().split(' ')[0]; // Handle "hash filename" format
            const isValid = await verifyChecksum(tempFile, expectedChecksum);
            if (!isValid) {
                await fs.remove(tempFile);
                throw new Error('Checksum verification failed');
            }
            logger.info('Checksum verified successfully');
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                logger.warn('Checksum file not found, skipping verification.');
            } else {
                logger.warn('Checksum verification failed: ' + error);
                // If it was a verification failure (not 404), we should probably fail.
                // But if it was a network error fetching the checksum, maybe we should also fail?
                // For now, if we have a checksum URL and it fails to verify (mismatch), we threw Error above.
                // If axios failed with other than 404, we rethrow.
                if (!(axios.isAxiosError(error) && error.response?.status === 404)) {
                    throw error;
                }
            }
        }
    }

    await fs.move(tempFile, PATHS.PROXY_EXE, { overwrite: true });
    logger.info('Installation successful');
}
