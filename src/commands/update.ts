import { Command } from 'commander';
import { getLatestVersion, downloadProxy } from '../core/updater.js';
import { logger } from '../core/logger.js';
import { isRunning, stopProxy } from '../core/proxy.js';
import { isServiceInstalled, isServiceRunning, startService, stopService } from '../system/service.js';
import { isAdmin } from '../system/powershell.js';

export const updateCommand = new Command('update')
    .description('Update Cloud SQL Proxy to the latest version')
    .option('--check-only', 'Only check latest version, do not download')
    .option('--version <version>', 'Download a specific version tag (e.g. v2.18.2)')
    .option('--base-url <url>', 'Custom download base URL for proxy binary/checksum')
    .option('--timeout <ms>', 'HTTP timeout in milliseconds', '60000')
    .option('--retries <count>', 'Retry count for network operations', '2')
    .option('--json', 'Output machine-readable JSON result')
    .action(async (options) => {
        const serviceInstalled = await isServiceInstalled();
        const serviceWasRunning = serviceInstalled && await isServiceRunning();
        let serviceStopped = false;

        try {
            if (serviceWasRunning) {
                const admin = await isAdmin();
                if (!admin) {
                    throw new Error('Windows Service is running but this shell is not elevated. Re-run as Administrator or stop the service manually before update.');
                }
                logger.info('Stopping Windows Service before update...');
                await stopService();
                serviceStopped = true;
            }

            const processRunning = await isRunning();
            if (processRunning) {
                logger.info('Stopping running proxy before update...');
                await stopProxy();
            }

            logger.info('Checking for updates...');
            const version = options.version || await getLatestVersion(Number(options.timeout));

            if (options.checkOnly) {
                if (options.json) {
                    console.log(JSON.stringify({ ok: true, latestVersion: version, checkOnly: true }));
                } else {
                    logger.info(`Latest version is ${version}.`);
                }
                return;
            }

            logger.info(`Target version is ${version}. Updating...`);
            await downloadProxy(version, {
                baseUrl: options.baseUrl,
                timeoutMs: Number(options.timeout),
                retries: Number(options.retries)
            });

            if (options.json) {
                console.log(JSON.stringify({ ok: true, version, updated: true }));
            } else {
                logger.info('Update successful.');
            }
        } catch (error) {
            if (options.json) {
                console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
            } else {
                logger.error('Update failed', error);
            }
            process.exit(1);
        } finally {
            if (serviceStopped) {
                try {
                    logger.info('Restarting Windows Service...');
                    await startService();
                } catch (error) {
                    logger.warn('Failed to restart Windows Service after update attempt', error);
                }
            }
        }
    });
