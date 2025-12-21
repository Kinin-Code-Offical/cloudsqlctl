import { Command } from 'commander';
import { setupEnvironment } from '../system/env.js';
import { logger } from '../core/logger.js';

export const envCommand = new Command('env')
    .description('Manage environment variables');

envCommand.command('set')
    .description('Set environment variables')
    .option('--scope <scope>', 'Scope of environment variables (User|Machine)', 'User')
    .action(async (options) => {
        try {
            const scope = options.scope === 'Machine' ? 'Machine' : 'User';
            await setupEnvironment(scope);
            logger.info('Environment variables set successfully.');
        } catch (error) {
            logger.error('Failed to set environment variables', error);
            process.exit(1);
        }
    });
