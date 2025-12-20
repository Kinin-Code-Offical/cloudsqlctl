import { Command } from 'commander';
import { startProxy, isRunning } from '../core/proxy.js';
import { logger } from '../core/logger.js';

export const connectCommand = new Command('connect')
    .description('Connect to a specific Cloud SQL instance')
    .argument('<instance>', 'Instance connection name (e.g., project:region:instance)')
    .option('-p, --port <port>', 'Port to listen on', parseInt, 5432)
    .action(async (instance, options) => {
        try {
            if (await isRunning()) {
                logger.warn('Proxy is already running. Please stop it first using "cloudsqlctl stop".');
                return;
            }

            logger.info(`Starting proxy for ${instance} on port ${options.port}...`);
            const pid = await startProxy(instance, options.port);
            logger.info(`Proxy started with PID ${pid}`);
        } catch (error) {
            logger.error('Failed to start proxy', error);
            process.exit(1);
        }
    });
