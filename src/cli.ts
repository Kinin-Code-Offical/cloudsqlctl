#!/usr/bin/env node
import { Command } from 'commander';
import { installCommand } from './commands/install.js';
import { updateCommand } from './commands/update.js';
import { selectCommand } from './commands/select.js';
import { listCommand } from './commands/list.js';
import { connectCommand } from './commands/connect.js';
import { startCommand } from './commands/start.js';
import { stopCommand } from './commands/stop.js';
import { statusCommand } from './commands/status.js';
import { logsCommand } from './commands/logs.js';
import { doctorCommand } from './commands/doctor.js';
import { resetCommand } from './commands/reset.js';
import { logger } from './core/logger.js';

const program = new Command();

program
    .name('cloudsqlctl')
    .description('CLI for managing Google Cloud SQL Auth Proxy')
    .version('1.0.0');

program.addCommand(installCommand);
program.addCommand(updateCommand);
program.addCommand(selectCommand);
program.addCommand(listCommand);
program.addCommand(connectCommand);
program.addCommand(startCommand);
program.addCommand(stopCommand);
program.addCommand(statusCommand);
program.addCommand(logsCommand);
program.addCommand(doctorCommand);
program.addCommand(resetCommand);

program.parseAsync(process.argv).catch(err => {
    logger.error('Unhandled error', err);
    process.exit(1);
});
