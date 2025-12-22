import { Command } from 'commander';
import { getLatestVersion, downloadProxy } from '../core/updater.js';
import { logger } from '../core/logger.js';
import { isRunning, stopProxy } from '../core/proxy.js';
import { isServiceInstalled, isServiceRunning, startService, stopService } from '../system/service.js';

export const updateCommand = new Command('update')
    .description('Update Cloud SQL Proxy to the latest version')
    .action(async () => {
        const serviceInstalled = await isServiceInstalled();
        const serviceWasRunning = serviceInstalled && await isServiceRunning();
        let serviceStopped = false;

        try {
            if (serviceWasRunning) {
                logger.info('Stopping Windows Service before update...');
                await stopService();
                serviceStopped = true;
            }

            if (await isRunning()) {
                logger.info('Stopping running proxy before update...');
                await stopProxy();
            }

            logger.info('Checking for updates...');
            const version = await getLatestVersion();
            logger.info(`Latest version is ${version}. Updating...`);
            await downloadProxy(version);
            logger.info('Update successful.');
        } catch (error) {
            logger.error('Update failed', error);
            process.exit(1);
        } finally {
            if (serviceStopped) {
                try {
                    logger.info('Restarting Windows Service...');
                    await startService();
                } catch (error) {
                    logger.warn('Failed to restart Windows Service after update attempt', error);
                }
            }
        }
    });
