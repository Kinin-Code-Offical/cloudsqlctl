import { Command } from 'commander';
import { getLatestVersion, downloadProxy } from '../core/updater.js';
import { logger } from '../core/logger.js';
import { isRunning, stopProxy } from '../core/proxy.js';
import { isServiceInstalled, isServiceRunning, startService, stopService } from '../system/service.js';

export const installCommand = new Command('install')
    .description('Download and install Cloud SQL Proxy')
    .option('-v, --version <version>', 'Specific version to install')
    .action(async (options) => {
        const serviceInstalled = await isServiceInstalled();
        const serviceWasRunning = serviceInstalled && await isServiceRunning();
        let serviceStopped = false;

        try {
            if (serviceWasRunning) {
                logger.info('Stopping Windows Service before installation...');
                await stopService();
                serviceStopped = true;
            }

            if (await isRunning()) {
                logger.info('Stopping running proxy before installation...');
                await stopProxy();
            }

            let { version } = options;
            if (!version) {
                logger.info('Fetching latest version...');
                version = await getLatestVersion();
            }
            logger.info(`Installing Cloud SQL Proxy version ${version}...`);
            await downloadProxy(version);

            logger.info('Installation successful.');
        } catch (error) {
            logger.error('Installation failed', error);
            process.exit(1);
        } finally {
            if (serviceStopped) {
                try {
                    logger.info('Restarting Windows Service...');
                    await startService();
                } catch (error) {
                    logger.warn('Failed to restart Windows Service after installation attempt', error);
                }
            }
        }
    });
