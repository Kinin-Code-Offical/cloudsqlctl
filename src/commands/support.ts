import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import { logger } from '../core/logger.js';
import { readConfig } from '../core/config.js';
import { isRunning } from '../core/proxy.js';
import { checkGcloudInstalled, getActiveAccount, checkAdc, listInstances } from '../core/gcloud.js';
import { checkEnvironmentDetailed } from '../system/env.js';
import { isServiceInstalled, isServiceRunning } from '../system/service.js';
import { getEnvVar, runPs } from '../system/powershell.js';
import { PATHS, PATHS_REASON, PATHS_SOURCE, ENV_VARS } from '../system/paths.js';

function formatTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

function buildPathsReport(): string {
    const lines = [
        'CloudSQLCTL Paths',
        `Home: ${PATHS.HOME}`,
        `Bin: ${PATHS.BIN}`,
        `Logs: ${PATHS.LOGS}`,
        `Config: ${PATHS.CONFIG_FILE}`,
        `Proxy: ${PATHS.PROXY_EXE}`,
        `Secrets: ${PATHS.SECRETS}`,
        '',
        `Resolution Source: ${PATHS_SOURCE}`,
        `Reason: ${PATHS_REASON}`,
    ];
    return `${lines.join('\n')}\n`;
}

async function buildStatusReport(): Promise<string> {
    const processRunning = await isRunning();
    const serviceInstalled = await isServiceInstalled();
    const serviceRunning = serviceInstalled ? await isServiceRunning() : false;
    const config = await readConfig();

    const lines = [
        'CloudSQLCTL Status',
        `Service: ${serviceInstalled ? (serviceRunning ? 'RUNNING' : 'STOPPED') : 'NOT INSTALLED'}`,
        `Process: ${processRunning ? 'RUNNING' : 'STOPPED'}`,
        `Instance: ${config.selectedInstance || 'Unknown'}`,
        `Port: ${config.proxyPort || 5432}`,
    ];

    return `${lines.join('\n')}\n`;
}

async function buildDoctorReport(): Promise<string> {
    const lines: string[] = [];
    lines.push('CloudSQLCTL Diagnostics');

    const gcloudInstalled = await checkGcloudInstalled();
    lines.push(`gcloud: ${gcloudInstalled ? 'OK' : 'FAIL'}`);

    const account = await getActiveAccount();
    lines.push(`gcloud account: ${account || 'none'}`);

    const adc = await checkAdc();
    lines.push(`ADC: ${adc ? 'OK' : 'WARN'}`);

    try {
        await listInstances();
        lines.push('list instances: OK');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        lines.push(`list instances: FAIL (${message})`);
    }

    const machineEnv = await checkEnvironmentDetailed('Machine');
    if (machineEnv.ok) {
        lines.push('env (machine): OK');
    } else {
        lines.push('env (machine): WARN');
        machineEnv.problems.forEach(p => lines.push(`  - ${p}`));
    }

    const userEnv = await checkEnvironmentDetailed('User');
    if (userEnv.ok) {
        lines.push('env (user): OK');
    } else {
        lines.push('env (user): WARN');
        userEnv.problems.forEach(p => lines.push(`  - ${p}`));
    }

    const proxyExists = await fs.pathExists(PATHS.PROXY_EXE);
    lines.push(`proxy binary: ${proxyExists ? 'OK' : 'FAIL'}`);

    const serviceInstalled = await isServiceInstalled();
    lines.push(`service installed: ${serviceInstalled ? 'yes' : 'no'}`);

    if (serviceInstalled) {
        const serviceCreds = await getEnvVar(ENV_VARS.GOOGLE_CREDS, 'Machine');
        lines.push(`service creds: ${serviceCreds ? 'set' : 'not set'}`);
    }

    try {
        await axios.get('https://api.github.com', { timeout: 5000 });
        lines.push('github api: OK');
    } catch {
        lines.push('github api: FAIL');
    }

    return `${lines.join('\n')}\n`;
}

export const supportCommand = new Command('support')
    .description('Support utilities');

supportCommand
    .command('bundle')
    .description('Create a support bundle zip with logs, config, doctor, paths, and status')
    .option('--output <path>', 'Output zip path')
    .option('--keep', 'Keep staging directory after bundling')
    .action(async (options) => {
        try {
            const timestamp = formatTimestamp();
            const stagingDir = path.join(PATHS.TEMP, `support-bundle-${timestamp}`);
            const outputPath = options.output
                ? path.resolve(options.output)
                : path.join(PATHS.TEMP, `cloudsqlctl-support-${timestamp}.zip`);

            await fs.ensureDir(stagingDir);
            await fs.ensureDir(path.dirname(outputPath));

            await fs.writeFile(path.join(stagingDir, 'paths.txt'), buildPathsReport());
            await fs.writeFile(path.join(stagingDir, 'status.txt'), await buildStatusReport());
            await fs.writeFile(path.join(stagingDir, 'doctor.txt'), await buildDoctorReport());

            if (await fs.pathExists(PATHS.CONFIG_FILE)) {
                await fs.copy(PATHS.CONFIG_FILE, path.join(stagingDir, 'config.json'));
            } else {
                await fs.writeFile(path.join(stagingDir, 'config-missing.txt'), 'config.json not found');
            }

            if (await fs.pathExists(PATHS.LOGS)) {
                await fs.copy(PATHS.LOGS, path.join(stagingDir, 'logs'));
            } else {
                await fs.writeFile(path.join(stagingDir, 'logs-missing.txt'), 'logs directory not found');
            }

            await runPs('& { Compress-Archive -Path $args[0] -DestinationPath $args[1] -Force }', [
                path.join(stagingDir, '*'),
                outputPath
            ]);

            if (!options.keep) {
                await fs.remove(stagingDir);
            }

            logger.info(`Support bundle created: ${outputPath}`);
        } catch (error) {
            logger.error('Failed to create support bundle', error);
            process.exit(1);
        }
    });
