import { Command } from 'commander';
import { logger } from '../core/logger.js';
import { PATHS } from '../core/config.js';
import fs from 'fs-extra';

export const resetCommand = new Command('reset')
    .description('Reset configuration and remove local files')
    .action(async () => {
        try {
            logger.warn('This will remove all configuration and logs.');
            // In a real app, ask for confirmation
            await fs.remove(PATHS.CONFIG_FILE);
            await fs.remove(PATHS.LOGS);
            // Maybe keep the binary?
            logger.info('Reset complete.');
        } catch (error) {
            logger.error('Reset failed', error);
            process.exit(1);
        }
    });
