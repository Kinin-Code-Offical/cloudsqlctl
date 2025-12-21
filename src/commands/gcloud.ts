import { Command } from 'commander';
import { checkGcloudInstalled, getActiveAccount } from '../core/gcloud.js';
import { installPortableGcloud } from '../core/gcloud-installer.js';
import { logger } from '../core/logger.js';
import { readConfig } from '../core/config.js';

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
            await installPortableGcloud();
        } catch (error) {
            logger.error('Failed to install gcloud', error);
            process.exit(1);
        }
    });

