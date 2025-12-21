import { Command } from 'commander';
import { checkEnvironment } from '../system/env.js';
import { isServiceInstalled, isServiceRunning } from '../system/service.js';
import { PATHS } from '../system/paths.js';
import fs from 'fs-extra';
import { logger } from '../core/logger.js';

export const checkCommand = new Command('check')
    .description('Verify full system configuration')
    .action(async () => {
        try {
            logger.info('Checking system configuration...');

            const envOk = await checkEnvironment();
            logger.info(`Environment Variables: ${envOk ? 'OK' : 'MISSING/INCORRECT'}`);

            const binaryOk = await fs.pathExists(PATHS.PROXY_EXE);
            logger.info(`Proxy Binary: ${binaryOk ? 'OK' : 'MISSING'}`);

            const serviceInstalled = await isServiceInstalled();
            logger.info(`Service Installed: ${serviceInstalled ? 'YES' : 'NO'}`);

            if (serviceInstalled) {
                const serviceRunning = await isServiceRunning();
                logger.info(`Service Running: ${serviceRunning ? 'YES' : 'NO'}`);
            }

            if (envOk && binaryOk && serviceInstalled) {
                logger.info('System check passed.');
            } else {
                logger.warn('System check failed. Run "cloudsqlctl repair" to fix.');
                process.exit(1);
            }
        } catch (error) {
            logger.error('Check failed', error);
            process.exit(1);
        }
    });
