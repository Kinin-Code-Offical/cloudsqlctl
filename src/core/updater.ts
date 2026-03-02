import axios from 'axios';
import fs from 'fs-extra';
import crypto from 'crypto';
import path from 'path';
import { PATHS } from '../system/paths.js';
import { logger } from './logger.js';

const GITHUB_REPO = 'GoogleCloudPlatform/cloud-sql-proxy';
const ASSET_NAME = 'cloud-sql-proxy.x64.exe';
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_RETRIES = 2;

export interface DownloadProxyOptions {
    targetPath?: string;
    baseUrl?: string;
    timeoutMs?: number;
    retries?: number;
}

function buildAxiosConfig(timeoutMs: number) {
    return {
        timeout: timeoutMs,
        headers: {
            'User-Agent': 'cloudsqlctl/update-proxy'
        }
    };
}

function isRetryable(error: unknown): boolean {
    if (!axios.isAxiosError(error)) return false;
    if (!error.response) return true;
    return [408, 429, 500, 502, 503, 504].includes(error.response.status);
}

async function withRetry<T>(label: string, retries: number, fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        } catch (error) {
            attempt++;
            if (attempt > retries || !isRetryable(error)) {
                throw error;
            }
            logger.warn(`${label} failed (attempt ${attempt}/${retries + 1}), retrying...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
    }
}

function enrichNetworkError(error: unknown): Error {
    const base = error instanceof Error ? error.message : String(error);
    const hint = 'Network/proxy issue detected. If you are behind a corporate proxy, set HTTPS_PROXY/HTTP_PROXY env vars and retry.';
    return new Error(`${base}. ${hint}`, { cause: error instanceof Error ? error : undefined });
}

export async function getLatestVersion(timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<string> {
    try {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
        const response = await axios.get(url, buildAxiosConfig(timeoutMs));
        return response.data.tag_name;
    } catch (error) {
        logger.error('Failed to fetch latest version', error);
        throw enrichNetworkError(error);
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

export async function downloadProxy(version: string, options: DownloadProxyOptions = {}) {
    const targetPath = options.targetPath || PATHS.PROXY_EXE;
    const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    const retries = options.retries ?? DEFAULT_RETRIES;
    let downloadUrl: string | undefined;
    let expectedChecksum: string | undefined;

    try {
        const releaseUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${version}`;
        await withRetry('Release metadata request', retries, () => axios.get(releaseUrl, buildAxiosConfig(timeoutMs)));

        // Google Cloud SQL Proxy v2 binaries are hosted on GCS
        const defaultBase = `https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/${version}`;
        const baseUrl = (options.baseUrl || defaultBase).replace(/\/$/, '');
        downloadUrl = `${baseUrl}/${ASSET_NAME}`;

        // Fetch checksum from deterministic GCS sidecar file
        const checksumUrl = `${downloadUrl}.sha256`;
        const checksumResponse = await withRetry('Checksum request', retries, () => axios.get(checksumUrl, {
            ...buildAxiosConfig(timeoutMs),
            responseType: 'text'
        }));
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
        const responseStream = await withRetry('Binary download', retries, () => axios({
            url: downloadUrl,
            method: 'GET',
            responseType: 'stream',
            ...buildAxiosConfig(timeoutMs)
        }));

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
        throw enrichNetworkError(error);
    }
}


