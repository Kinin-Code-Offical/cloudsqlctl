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
import { envCommand } from './commands/env.js';
import { serviceCommand } from './commands/service.js';
import { ps1Command } from './commands/ps1.js';
import { repairCommand } from './commands/repair.js';
import { checkCommand } from './commands/check.js';
import { gcloudCommand } from './commands/gcloud.js';
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
program.addCommand(envCommand);
program.addCommand(serviceCommand);
program.addCommand(ps1Command);
program.addCommand(repairCommand);
program.addCommand(checkCommand);
program.addCommand(gcloudCommand);

program.parseAsync(process.argv).catch(err => {
    logger.error('Unhandled error', err);
    process.exit(1);
});
