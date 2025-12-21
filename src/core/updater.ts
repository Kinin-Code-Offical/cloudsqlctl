import axios from 'axios';
import fs from 'fs-extra';
import crypto from 'crypto';
import path from 'path';
import { PATHS } from '../system/paths.js';
import { logger } from './logger.js';

const GITHUB_REPO = 'GoogleCloudPlatform/cloud-sql-proxy';
const ASSET_NAME = 'cloud-sql-proxy.x64.exe';

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

export async function downloadProxy(version: string, targetPath: string = PATHS.PROXY_EXE) {
    let downloadUrl: string | undefined;
    let expectedChecksum: string | undefined;

    try {
        const releaseUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${version}`;
        const response = await axios.get(releaseUrl);

        // Google Cloud SQL Proxy v2 binaries are hosted on GCS
        downloadUrl = `https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/${version}/${ASSET_NAME}`;

        // Extract checksum from release body
        const body = response.data.body;
        // Regex to match: | [cloud-sql-proxy.x64.exe](...) | <hash> |
        const checksumRegex = new RegExp(`\\| \\[${ASSET_NAME.replace(/\./g, '\\.')}\\]\\(.*?\\) \\| ([a-f0-9]{64}) \\|`);
        const match = body.match(checksumRegex);

        if (match && match[1]) {
            expectedChecksum = match[1];
        } else {
            logger.warn(`Could not extract checksum for ${ASSET_NAME} from release notes.`);
        }

        logger.info(`Downloading ${ASSET_NAME} from ${downloadUrl}...`);

        // Ensure directory exists
        await fs.ensureDir(path.dirname(targetPath));

        const writer = fs.createWriteStream(targetPath);
        const responseStream = await axios({
            url: downloadUrl,
            method: 'GET',
            responseType: 'stream'
        });

        responseStream.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        logger.info('Download complete.');

        if (expectedChecksum) {
            logger.info('Verifying checksum...');
            try {
                const isValid = await verifyChecksum(targetPath, expectedChecksum);

                if (!isValid) {
                    throw new Error('Checksum verification failed');
                }
                logger.info('Checksum verified.');
            } catch (err) {
                logger.warn('Failed to verify checksum', err);
                // If verification fails, we should probably remove the file
                await fs.remove(targetPath);
                throw err;
            }
        } else {
            logger.warn('Skipping checksum verification (checksum not found).');
        }

    } catch (error) {
        logger.error('Failed to download proxy', error);
        throw error;
    }
}


