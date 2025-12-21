import { Command } from 'commander';
import { logger } from '../core/logger.js';
import { getActiveAccount, getProject, checkAdc, login, adcLogin, setProject } from '../core/gcloud.js';
import { setEnv } from '../system/env.js';
import { SYSTEM_PATHS, USER_PATHS, ENV_VARS } from '../system/paths.js';
import { runPs } from '../system/powershell.js';
import fs from 'fs-extra';
import path from 'path';

export const authCommand = new Command('auth')
    .description('Manage authentication and credentials');

authCommand.command('status')
    .description('Check authentication status')
    .action(async () => {
        const account = await getActiveAccount();
        const project = await getProject();
        const adc = await checkAdc();
        const credsEnv = process.env[ENV_VARS.GOOGLE_CREDS];

        logger.info('Authentication Status:');
        logger.info(`  Active Account: ${account || 'Not logged in'}`);
        logger.info(`  Active Project: ${project || 'Not set'}`);
        logger.info(`  ADC Status:     ${adc ? '✅ Configured' : '❌ Not configured'}`);
        if (credsEnv) {
            logger.info(`  Credentials:    ${credsEnv}`);
        }
    });

authCommand.command('login')
    .description('Login via gcloud')
    .action(async () => {
        try {
            await login();
            logger.info('Successfully logged in.');
        } catch (error) {
            logger.error('Login failed', error);
            process.exit(1);
        }
    });

authCommand.command('adc')
    .description('Setup Application Default Credentials')
    .action(async () => {
        try {
            await adcLogin();
            logger.info('ADC configured successfully.');
        } catch (error) {
            logger.error('ADC setup failed', error);
            process.exit(1);
        }
    });

authCommand.command('project')
    .description('Set active project')
    .argument('<projectId>', 'Project ID')
    .action(async (projectId) => {
        try {
            await setProject(projectId);
            logger.info(`Project set to ${projectId}`);
        } catch (error) {
            logger.error('Failed to set project', error);
            process.exit(1);
        }
    });

authCommand.command('set-service-account')
    .description('Configure service account credentials')
    .requiredOption('-f, --file <path>', 'Path to service account JSON key')
    .option('-s, --scope <scope>', 'Scope (Machine or User)', 'User')
    .action(async (options) => {
        const { file, scope } = options;
        if (!['Machine', 'User'].includes(scope)) {
            logger.error('Scope must be either Machine or User');
            process.exit(1);
        }

        try {
            if (!await fs.pathExists(file)) {
                logger.error(`File not found: ${file}`);
                process.exit(1);
            }

            const paths = scope === 'Machine' ? SYSTEM_PATHS : USER_PATHS;
            await fs.ensureDir(paths.SECRETS);

            const fileName = path.basename(file);
            const dest = path.join(paths.SECRETS, fileName);

            await fs.copy(file, dest, { overwrite: true });
            logger.info(`Copied credentials to ${dest}`);

            if (scope === 'Machine') {
                // Hardening ACLs
                // Remove inheritance, grant Administrators and SYSTEM full access
                await runPs(`icacls "${dest}" /inheritance:r /grant:r "Administrators:(R)" "SYSTEM:(R)"`);
                logger.info('Applied security ACLs to credentials file.');
            }

            await setEnv(ENV_VARS.GOOGLE_CREDS, dest, scope);
            logger.info(`Set ${ENV_VARS.GOOGLE_CREDS} environment variable.`);

        } catch (error) {
            logger.error('Failed to set service account', error);
            process.exit(1);
        }
    });
