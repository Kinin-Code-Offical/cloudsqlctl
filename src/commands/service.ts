import { Command } from 'commander';
import { installService, uninstallService, startService, stopService, isServiceInstalled, isServiceRunning, updateServiceBinPath } from '../system/service.js';
import { logger } from '../core/logger.js';

export const serviceCommand = new Command('service')
    .description('Manage the Cloud SQL Proxy Windows Service (Requires Admin)');

serviceCommand.command('install')
    .description('Install the Windows Service')
    .requiredOption('-i, --instance <connectionName>', 'Instance connection name')
    .option('-p, --port <port>', 'Port number', '5432')
    .action(async (options) => {
        try {
            await installService(options.instance, parseInt(options.port), []);
            logger.info('Service installed successfully.');
        } catch (error) {
            logger.error('Failed to install service', error);
            process.exit(1);
        }
    });

serviceCommand.command('configure')
    .description('Update Service Configuration')
    .requiredOption('-i, --instance <connectionName>', 'Instance connection name')
    .option('-p, --port <port>', 'Port number', '5432')
    .action(async (options) => {
        try {
            await updateServiceBinPath(options.instance, parseInt(options.port), []);
            logger.info('Service configured successfully.');
        } catch (error) {
            logger.error('Failed to configure service', error);
            process.exit(1);
        }
    });

serviceCommand.command('remove')
    .description('Remove the Windows Service')
    .action(async () => {
        try {
            await uninstallService();
            logger.info('Service removed successfully.');
        } catch (error) {
            logger.error('Failed to remove service', error);
            process.exit(1);
        }
    });

serviceCommand.command('start')
    .description('Start the Windows Service')
    .action(async () => {
        try {
            await startService();
            logger.info('Service started successfully.');
        } catch (error) {
            logger.error('Failed to start service', error);
            process.exit(1);
        }
    });

serviceCommand.command('stop')
    .description('Stop the Windows Service')
    .action(async () => {
        try {
            await stopService();
            logger.info('Service stopped successfully.');
        } catch (error) {
            logger.error('Failed to stop service', error);
            process.exit(1);
        }
    });

serviceCommand.command('status')
    .description('Check Service Status')
    .action(async () => {
        try {
            const installed = await isServiceInstalled();
            if (!installed) {
                logger.info('Service is NOT installed.');
                return;
            }
            const running = await isServiceRunning();
            logger.info(`Service is ${running ? 'RUNNING' : 'STOPPED'}.`);
        } catch (error) {
            logger.error('Failed to check service status', error);
            process.exit(1);
        }
    });
