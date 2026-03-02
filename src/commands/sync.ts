import { Command } from 'commander';
import path from 'path';
import { logger } from '../core/logger.js';
import {
    startSyncServer,
    stopSyncServer,
    getSyncServerStatus,
    pushDirectoryToSyncServer,
    pullDirectoryFromSyncServer,
    getSyncHistory,
    runSyncDaemon,
    checkDockerAndOptionallyInstall
} from '../core/sync.js';

const DEFAULT_SERVER_URL = 'http://127.0.0.1:4780';

export const syncCommand = new Command('sync')
    .description('Mock remote sync features (GitHub-like push/pull for local environments)');

syncCommand.command('start')
    .description('Start local mock sync server')
    .option('--host <host>', 'Bind host', '127.0.0.1')
    .option('--port <port>', 'Bind port', '4780')
    .action(async (options) => {
        try {
            await startSyncServer(options.host, Number(options.port));
        } catch (error) {
            logger.error('Failed to start sync server', error);
            process.exit(1);
        }
    });

syncCommand.command('stop')
    .description('Stop local mock sync server')
    .action(async () => {
        try {
            await stopSyncServer();
        } catch (error) {
            logger.error('Failed to stop sync server', error);
            process.exit(1);
        }
    });

syncCommand.command('status')
    .description('Show local mock sync server status')
    .action(async () => {
        try {
            const status = await getSyncServerStatus();
            if (!status.running) {
                logger.info('Sync server: STOPPED');
                return;
            }
            logger.info(`Sync server: RUNNING (pid: ${status.pid}, host: ${status.host}, port: ${status.port})`);
        } catch (error) {
            logger.error('Failed to read sync server status', error);
            process.exit(1);
        }
    });

syncCommand.command('push')
    .description('Push a local directory snapshot to mock sync server')
    .requiredOption('--repo <name>', 'Repository name on sync server')
    .option('--source <dir>', 'Local source directory', process.cwd())
    .option('--server <url>', 'Sync server URL', DEFAULT_SERVER_URL)
    .option('--message <message>', 'Snapshot message')
    .action(async (options) => {
        try {
            const sourceDir = path.resolve(options.source);
            logger.info(`Preparing snapshot from: ${sourceDir}`);
            const result = await pushDirectoryToSyncServer({
                sourceDir,
                repo: options.repo,
                serverUrl: options.server,
                message: options.message
            });

            logger.info(`Push complete. Version: v${result.version}, files: ${result.fileCount}`);
        } catch (error) {
            logger.error('Sync push failed', error);
            process.exit(1);
        }
    });

syncCommand.command('pull')
    .description('Pull a snapshot from mock sync server into local directory')
    .requiredOption('--repo <name>', 'Repository name on sync server')
    .option('--target <dir>', 'Local target directory', process.cwd())
    .option('--server <url>', 'Sync server URL', DEFAULT_SERVER_URL)
    .option('--version <version>', 'Snapshot version (default: latest)', 'latest')
    .action(async (options) => {
        try {
            const targetDir = path.resolve(options.target);
            logger.info(`Pulling into: ${targetDir}`);
            const result = await pullDirectoryFromSyncServer({
                targetDir,
                repo: options.repo,
                serverUrl: options.server,
                version: options.version
            });

            logger.info(`Pull complete. Version: v${result.version}, files: ${result.fileCount}`);
        } catch (error) {
            logger.error('Sync pull failed', error);
            process.exit(1);
        }
    });

syncCommand.command('history')
    .description('Show snapshot history for a repo on mock sync server')
    .requiredOption('--repo <name>', 'Repository name on sync server')
    .option('--server <url>', 'Sync server URL', DEFAULT_SERVER_URL)
    .action(async (options) => {
        try {
            const history = await getSyncHistory(options.server, options.repo);
            logger.info(`Latest: v${history.latestVersion}`);
            logger.info(`Versions: ${history.versions.length ? history.versions.map(v => `v${v}`).join(', ') : '(none)'}`);
        } catch (error) {
            logger.error('Failed to fetch sync history', error);
            process.exit(1);
        }
    });

syncCommand.command('docker')
    .description('Check Docker availability (optional auto install via winget)')
    .option('--install', 'Install Docker Desktop on Windows if missing')
    .action(async (options) => {
        try {
            const status = await checkDockerAndOptionallyInstall(Boolean(options.install));
            if (status.installed) {
                logger.info(`Docker: INSTALLED (${status.version})`);
                return;
            }

            logger.warn('Docker: NOT INSTALLED');
            if (status.installMessage) {
                logger.info(status.installMessage);
            }
        } catch (error) {
            logger.error('Docker check/install failed', error);
            process.exit(1);
        }
    });

syncCommand.command('daemon', { hidden: true })
    .option('--host <host>', 'Bind host', '127.0.0.1')
    .option('--port <port>', 'Bind port', '4780')
    .action(async (options) => {
        try {
            await runSyncDaemon(options.host, Number(options.port));
        } catch (error) {
            logger.error('Sync daemon failed', error);
            process.exit(1);
        }
    });
