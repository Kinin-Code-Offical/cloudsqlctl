import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import extract from 'extract-zip';
import { PATHS } from '../system/paths.js';
import { logger } from './logger.js';
import { writeConfig } from './config.js';

const GCLOUD_DOWNLOAD_URL = 'https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-windows-x86_64.zip';
const MAX_RETRIES = 2;
const TIMEOUT_MS = 60000; // 60 seconds

export async function installPortableGcloud(): Promise<string> {
    logger.info('Installing portable Google Cloud CLI...');
    await fs.ensureDir(PATHS.GCLOUD_DIR);
    await fs.ensureDir(PATHS.TEMP);

    const zipPath = path.join(PATHS.TEMP, 'google-cloud-sdk.zip');

    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
        try {
            logger.info(`Downloading from ${GCLOUD_DOWNLOAD_URL} (Attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);

            const response = await axios({
                url: GCLOUD_DOWNLOAD_URL,
                method: 'GET',
                responseType: 'stream',
                timeout: TIMEOUT_MS,
                headers: {
                    'User-Agent': 'cloudsqlctl/installer'
                }
            });

            const writer = fs.createWriteStream(zipPath);
            response.data.pipe(writer);

            await new Promise<void>((resolve, reject) => {
                writer.on('finish', () => resolve());
                writer.on('error', reject);
            });

            break; // Download successful
        } catch (error) {
            attempt++;
            if (attempt > MAX_RETRIES) {
                logger.error('Failed to download gcloud after multiple attempts.');
                throw error;
            }
            logger.warn(`Download failed, retrying... (${error})`);
        }
    }

    try {
        logger.info('Extracting (this may take a moment)...');
        await extract(zipPath, { dir: PATHS.GCLOUD_DIR });

        const gcloudExe = path.join(PATHS.GCLOUD_DIR, 'google-cloud-sdk', 'bin', 'gcloud.cmd');

        if (await fs.pathExists(gcloudExe)) {
            logger.info(`gcloud installed to ${gcloudExe}`);
            await writeConfig({ gcloudPath: gcloudExe });
            logger.info('Configuration updated.');

            // Cleanup
            await fs.remove(zipPath);

            return gcloudExe;
        } else {
            throw new Error('gcloud.cmd not found after extraction');
        }
    } catch (error) {
        // Cleanup on failure too
        await fs.remove(zipPath).catch(() => { });
        throw error;
    }
}
