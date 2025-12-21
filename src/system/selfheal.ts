import fs from 'fs-extra';
import { PATHS } from './paths.js';
import { checkEnvironment, setupEnvironment } from './env.js';
import { isServiceInstalled, installService } from './service.js';
import { getLatestVersion, downloadProxy } from '../core/updater.js';
import { generateScripts } from './ps1.js';
import { logger } from '../core/logger.js';
import { isAdmin } from './powershell.js';
import { readConfig } from '../core/config.js';

export async function selfHeal() {
    logger.info('Running self-healing checks...');

    const admin = await isAdmin();
    const scope = admin ? 'Machine' : 'User';

    // 1. Check Environment Variables
    if (!await checkEnvironment(scope)) {
        if (admin) {
            logger.warn(`Environment variables (${scope}) missing or incorrect. Fixing...`);
            try {
                await setupEnvironment(scope);
            } catch (e) {
                logger.error('Failed to fix environment variables', e);
            }
        } else {
            logger.warn('Environment variables missing or incorrect. Run as Administrator to fix Machine scope, or we will fix User scope now.');
            try {
                await setupEnvironment(scope);
            } catch (e) {
                logger.error('Failed to fix environment variables', e);
            }
        }
    }

    // 2. Check Proxy Binary
    if (!await fs.pathExists(PATHS.PROXY_EXE)) {
        logger.warn('Proxy binary missing. Downloading...');
        try {
            const version = await getLatestVersion();
            await downloadProxy(version, PATHS.PROXY_EXE);
        } catch (e) {
            logger.error('Failed to download proxy binary', e);
        }
    }

    // 3. Check Scripts
    try {
        await generateScripts();
    } catch (e) {
        logger.error('Failed to generate PowerShell scripts', e);
    }

    // 4. Check Service
    if (!await isServiceInstalled()) {
        if (admin) {
            const config = await readConfig();
            if (config.selectedInstance) {
                logger.warn('Service not installed. Installing...');
                try {
                    await installService(config.selectedInstance, config.proxyPort || 5432);
                } catch (e) {
                    logger.error('Failed to install service', e);
                }
            } else {
                logger.info('Service not installed and no instance configured. Skipping service restoration.');
            }
        } else {
            logger.warn('Service not installed. Run as Administrator to fix.');
        }
    }

    logger.info('Self-healing complete.');
}
