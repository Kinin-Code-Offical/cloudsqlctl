import { Command } from 'commander';
import inquirer from 'inquirer';
import { logger } from '../core/logger.js';
import { checkGcloudInstalled, getActiveAccount, checkAdc, login, adcLogin, listInstances } from '../core/gcloud.js';
import { getLatestVersion, downloadProxy } from '../core/updater.js';
import { PATHS } from '../system/paths.js';
import fs from 'fs-extra';
import { writeConfig } from '../core/config.js';

export const setupCommand = new Command('setup')
    .description('Interactive setup wizard')
    .action(async () => {
        logger.info('Starting Cloud SQL Proxy Setup Wizard...');

        // 1. Check gcloud
        if (!await checkGcloudInstalled()) {
            logger.warn('gcloud CLI is not installed.');
            const { installGcloud } = await inquirer.prompt([{
                type: 'confirm',
                name: 'installGcloud',
                message: 'Do you want to install gcloud CLI now?',
                default: true
            }]);

            if (installGcloud) {
                logger.info('Please run "cloudsqlctl gcloud install" and restart setup.');
                return;
            } else {
                logger.error('gcloud CLI is required.');
                return;
            }
        }

        // 2. Check Login
        if (!await getActiveAccount()) {
            logger.warn('Not logged in to gcloud.');
            const { doLogin } = await inquirer.prompt([{
                type: 'confirm',
                name: 'doLogin',
                message: 'Do you want to login now?',
                default: true
            }]);

            if (doLogin) {
                await login();
            }
        }

        // 3. Check ADC
        if (!await checkAdc()) {
            logger.warn('Application Default Credentials not configured.');
            const { doAdc } = await inquirer.prompt([{
                type: 'confirm',
                name: 'doAdc',
                message: 'Do you want to configure ADC now?',
                default: true
            }]);

            if (doAdc) {
                await adcLogin();
            }
        }

        // 4. Check Proxy
        if (!await fs.pathExists(PATHS.PROXY_EXE)) {
            logger.warn('Cloud SQL Proxy binary not found.');
            const { doInstall } = await inquirer.prompt([{
                type: 'confirm',
                name: 'doInstall',
                message: 'Do you want to install the proxy binary now?',
                default: true
            }]);

            if (doInstall) {
                try {
                    logger.info('Fetching latest version...');
                    const version = await getLatestVersion();
                    logger.info(`Installing Cloud SQL Proxy version ${version}...`);
                    await downloadProxy(version);
                    logger.info('Installation successful.');
                } catch (error) {
                    logger.error('Failed to install proxy', error);
                    return;
                }
            }
        }

        // 5. Select Instance
        try {
            logger.info('Fetching available instances...');
            const instances = await listInstances();

            if (instances.length === 0) {
                logger.warn('No Cloud SQL instances found in the current project.');
                return;
            }

            const choices = instances.map(i => ({ name: `${i.name} (${i.project})`, value: i.connectionName }));

            const { instance } = await inquirer.prompt([{
                type: 'list',
                name: 'instance',
                message: 'Select Cloud SQL Instance:',
                choices
            }]);

            const { port } = await inquirer.prompt([{
                type: 'number',
                name: 'port',
                message: 'Enter local port:',
                default: 5432
            }]);

            await writeConfig({ selectedInstance: instance, proxyPort: port });
            logger.info('Configuration saved.');
            logger.info('Setup complete! You can now run "cloudsqlctl start" to start the proxy.');

        } catch (error) {
            logger.error('Failed to list instances. Ensure you have permissions.', error);
        }
    });
