import { Command } from 'commander';
import { logger } from '../core/logger.js';
import { checkGcloudInstalled, getActiveAccount, checkAdc, listInstances } from '../core/gcloud.js';
import { checkEnvironment } from '../system/env.js';
import { isServiceInstalled } from '../system/service.js';
import { getEnvVar } from '../system/powershell.js';
import { PATHS, ENV_VARS } from '../system/paths.js';
import fs from 'fs-extra';
import axios from 'axios';

export const doctorCommand = new Command('doctor')
    .description('Run diagnostics to verify environment setup')
    .action(async () => {
        logger.info('Running diagnostics...');

        // Check gcloud
        const gcloudInstalled = await checkGcloudInstalled();
        if (gcloudInstalled) {
            logger.info('✅ gcloud CLI is installed');
        } else {
            logger.error('❌ gcloud CLI is NOT installed');
        }

        // Check Auth
        const account = await getActiveAccount();
        if (account) {
            logger.info(`✅ Authenticated as: ${account}`);
        } else {
            logger.warn('⚠️ No active gcloud account found. Run "gcloud auth login"');
        }

        // Check ADC
        const adc = await checkAdc();
        if (adc) {
            logger.info('✅ Application Default Credentials configured');
        } else {
            logger.warn('⚠️ Application Default Credentials NOT configured');
        }

        // Check Network/Permissions
        try {
            await listInstances();
            logger.info('✅ Network/Permissions OK (Can list instances)');
        } catch {
            logger.error('❌ Network/Permissions Check Failed (Cannot list instances)');
        }

        // Check Environment Variables
        const envOk = await checkEnvironment('Machine');
        if (envOk) {
            logger.info('✅ System Environment Variables are correct');
        } else {
            logger.warn('⚠️ System Environment Variables are missing or incorrect');
        }

        // Check Proxy Binary
        if (await fs.pathExists(PATHS.PROXY_EXE)) {
            logger.info('✅ Cloud SQL Proxy binary found');
        } else {
            logger.error('❌ Cloud SQL Proxy binary NOT found');
        }

        // Check Service
        if (await isServiceInstalled()) {
            logger.info('✅ Windows Service is installed');
            const serviceCreds = await getEnvVar(ENV_VARS.GOOGLE_CREDS, 'Machine');
            if (serviceCreds) {
                logger.info('✅ Service Credentials configured');
            } else {
                logger.warn('⚠️ Service Credentials NOT configured (Service might fail)');
            }
        } else {
            logger.info('ℹ️ Windows Service is NOT installed (Optional)');
        }

        // Check Network (GitHub API)
        try {
            await axios.get('https://api.github.com');
            logger.info('✅ GitHub API is reachable');
        } catch (_e) {
            logger.error('❌ GitHub API is NOT reachable');
        }

        logger.info('Diagnostics complete.');
    });
