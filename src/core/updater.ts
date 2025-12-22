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
        await axios.get(releaseUrl);

        // Google Cloud SQL Proxy v2 binaries are hosted on GCS
        downloadUrl = `https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/${version}/${ASSET_NAME}`;

        // Fetch checksum from deterministic GCS sidecar file
        const checksumUrl = `${downloadUrl}.sha256`;
        const checksumResponse = await axios.get(checksumUrl, { responseType: 'text' });
        const checksumText = String(checksumResponse.data).trim();
        const checksumMatch = checksumText.match(/[a-f0-9]{64}/i);
        if (!checksumMatch) {
            throw new Error(`Checksum file did not contain a valid SHA256 hash (${checksumUrl})`);
        }
        expectedChecksum = checksumMatch[0];

        logger.info(`Downloading ${ASSET_NAME} from ${downloadUrl}...`);

        // Ensure directory exists
        await fs.ensureDir(path.dirname(targetPath));

        const tmpPath = `${targetPath}.download`;
        await fs.remove(tmpPath);

        const writer = fs.createWriteStream(tmpPath);
        const responseStream = await axios({
            url: downloadUrl,
            method: 'GET',
            responseType: 'stream'
        });

        try {
            responseStream.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            logger.info('Download complete.');

            logger.info('Verifying checksum...');
            const isValid = await verifyChecksum(tmpPath, expectedChecksum);
            if (!isValid) {
                throw new Error('Checksum verification failed');
            }
            logger.info('Checksum verified.');

            await fs.move(tmpPath, targetPath, { overwrite: true });
        } catch (err) {
            logger.warn('Failed to download/verify proxy', err);
            await fs.remove(tmpPath);
            throw err;
        }

    } catch (error) {
        logger.error('Failed to download proxy', error);
        throw error;
    }
}


