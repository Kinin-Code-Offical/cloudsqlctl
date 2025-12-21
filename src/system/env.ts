import { runPs, isAdmin } from './powershell.js';
import { SYSTEM_PATHS, USER_PATHS, ENV_VARS } from './paths.js';
import { logger } from '../core/logger.js';
import fs from 'fs-extra';

export async function setEnv(name: string, value: string, scope: 'Machine' | 'User') {
    if (scope === 'Machine' && !await isAdmin()) {
        throw new Error('Admin privileges required to set system environment variables.');
    }
    logger.info(`Setting ${scope} environment variable: ${name}=${value}`);
    await runPs('& { [Environment]::SetEnvironmentVariable($args[0], $args[1], $args[2]) }', [name, value, scope]);
}

export async function setupEnvironment(scope: 'Machine' | 'User' = 'User', force: boolean = false) {
    logger.info(`Configuring ${scope} environment variables...`);
    const paths = scope === 'Machine' ? SYSTEM_PATHS : USER_PATHS;

    const currentHome = await runPs('& { [Environment]::GetEnvironmentVariable($args[0], $args[1]) }', [ENV_VARS.HOME, scope]);
    if (force || !currentHome) {
        await setEnv(ENV_VARS.HOME, paths.HOME, scope);
    }

    const currentLogs = await runPs('& { [Environment]::GetEnvironmentVariable($args[0], $args[1]) }', [ENV_VARS.LOGS, scope]);
    if (force || !currentLogs) {
        await setEnv(ENV_VARS.LOGS, paths.LOGS, scope);
    }

    const currentProxy = await runPs('& { [Environment]::GetEnvironmentVariable($args[0], $args[1]) }', [ENV_VARS.PROXY_PATH, scope]);
    if (force || !currentProxy) {
        await setEnv(ENV_VARS.PROXY_PATH, paths.PROXY_EXE, scope);
    }
}

/** @deprecated Use checkEnvironmentDetailed instead */
export async function checkEnvironment(scope: 'Machine' | 'User' = 'User'): Promise<boolean> {
    const result = await checkEnvironmentDetailed(scope);
    return result.ok;
}

export async function checkEnvironmentDetailed(scope: 'Machine' | 'User' = 'User'): Promise<{ ok: boolean, problems: string[], values: { home: string, logs: string, proxy: string } }> {
    const home = await runPs('& { [Environment]::GetEnvironmentVariable($args[0], $args[1]) }', [ENV_VARS.HOME, scope]);
    const logs = await runPs('& { [Environment]::GetEnvironmentVariable($args[0], $args[1]) }', [ENV_VARS.LOGS, scope]);
    const proxy = await runPs('& { [Environment]::GetEnvironmentVariable($args[0], $args[1]) }', [ENV_VARS.PROXY_PATH, scope]);

    const problems: string[] = [];

    if (!home) {
        problems.push(`${ENV_VARS.HOME} is not set.`);
    } else {
        try {
            await fs.ensureDir(home);
        } catch {
            problems.push(`${ENV_VARS.HOME} path (${home}) does not exist and cannot be created.`);
        }
    }

    if (!logs) {
        problems.push(`${ENV_VARS.LOGS} is not set.`);
    } else {
        try {
            await fs.ensureDir(logs);
        } catch {
            problems.push(`${ENV_VARS.LOGS} path (${logs}) does not exist and cannot be created.`);
        }
    }

    if (!proxy) {
        problems.push(`${ENV_VARS.PROXY_PATH} is not set.`);
    } else if (!fs.existsSync(proxy)) {
        problems.push(`${ENV_VARS.PROXY_PATH} points to non-existent file (${proxy}).`);
    }

    return {
        ok: problems.length === 0,
        problems,
        values: { home, logs, proxy }
    };
}
