import { Command } from 'commander';
import { checkGcloudInstalled, getActiveAccount } from '../core/gcloud.js';
import { logger } from '../core/logger.js';
import { readConfig, writeConfig } from '../core/config.js';
import { PATHS } from '../system/paths.js';
import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import { execa } from 'execa';

// Official Google Cloud SDK download URL pattern
const GCLOUD_DOWNLOAD_URL = 'https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-windows-x86_64.zip';

export const gcloudCommand = new Command('gcloud')
    .description('Manage Google Cloud CLI');

gcloudCommand.command('status')
    .description('Check gcloud CLI status')
    .action(async () => {
        const config = await readConfig();
        logger.info(`Configured gcloud path: ${config.gcloudPath || '(default)'}`);

        const installed = await checkGcloudInstalled();
        if (installed) {
            logger.info('✅ gcloud CLI is installed and reachable.');
            const account = await getActiveAccount();
            logger.info(`Active account: ${account || 'None'}`);
        } else {
            logger.warn('❌ gcloud CLI is NOT installed or not found.');
        }
    });

gcloudCommand.command('install')
    .description('Install portable Google Cloud CLI')
    .action(async () => {
        try {
            logger.info('Installing portable Google Cloud CLI...');
            await fs.ensureDir(PATHS.GCLOUD_DIR);

            const zipPath = path.join(PATHS.TEMP, 'google-cloud-sdk.zip');
            await fs.ensureDir(PATHS.TEMP);

            logger.info(`Downloading from ${GCLOUD_DOWNLOAD_URL}...`);
            const response = await axios({
                url: GCLOUD_DOWNLOAD_URL,
                method: 'GET',
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(zipPath);
            response.data.pipe(writer);

            await new Promise<void>((resolve, reject) => {
                writer.on('finish', () => resolve());
                writer.on('error', reject);
            });

            logger.info('Extracting...');
            // Use PowerShell to extract
            await execa('powershell', ['-Command', `Expand-Archive -Path "${zipPath}" -DestinationPath "${PATHS.GCLOUD_DIR}" -Force`]);

            const gcloudExe = path.join(PATHS.GCLOUD_DIR, 'google-cloud-sdk', 'bin', 'gcloud.cmd');

            if (await fs.pathExists(gcloudExe)) {
                logger.info(`gcloud installed to ${gcloudExe}`);
                await writeConfig({ gcloudPath: gcloudExe });
                logger.info('Configuration updated.');
            } else {
                throw new Error('gcloud.cmd not found after extraction');
            }

            // Cleanup
            await fs.remove(zipPath);

        } catch (error) {
            logger.error('Failed to install gcloud', error);
            process.exit(1);
        }
    });
