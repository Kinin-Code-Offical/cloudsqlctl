import { Command } from 'commander';
import { logger } from '../core/logger.js';
import { PATHS } from '../core/config.js';
import { getTail } from '../core/utils.js';
import path from 'path';

export const logsCommand = new Command('logs')
    .description('View the tail of the proxy logs')
    .option('-n, --lines <lines>', 'Number of lines to show', parseInt, 20)
    .action(async (options) => {
        try {
            const logFile = path.join(PATHS.LOGS, 'combined.log');
            const lines = await getTail(logFile, options.lines);
            lines.forEach(line => console.log(line));
        } catch (error) {
            logger.error('Failed to read logs', error);
            process.exit(1);
        }
    });
