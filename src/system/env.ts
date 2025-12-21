import { runPs, isAdmin } from './powershell.js';
import { SYSTEM_PATHS, USER_PATHS, ENV_VARS } from './paths.js';
import { logger } from '../core/logger.js';

export async function setEnv(name: string, value: string, scope: 'Machine' | 'User') {
    if (scope === 'Machine' && !await isAdmin()) {
        throw new Error('Admin privileges required to set system environment variables.');
    }
    logger.info(`Setting ${scope} environment variable: ${name}=${value}`);
    await runPs(`[Environment]::SetEnvironmentVariable("${name}", "${value}", "${scope}")`);
}

export async function setupEnvironment(scope: 'Machine' | 'User' = 'User') {
    logger.info(`Configuring ${scope} environment variables...`);
    const paths = scope === 'Machine' ? SYSTEM_PATHS : USER_PATHS;

    await setEnv(ENV_VARS.HOME, paths.HOME, scope);
    await setEnv(ENV_VARS.LOGS, paths.LOGS, scope);
    await setEnv(ENV_VARS.PROXY_PATH, paths.PROXY_EXE, scope);
}

export async function checkEnvironment(scope: 'Machine' | 'User' = 'User'): Promise<boolean> {
    const paths = scope === 'Machine' ? SYSTEM_PATHS : USER_PATHS;
    const home = await runPs(`[Environment]::GetEnvironmentVariable("${ENV_VARS.HOME}", "${scope}")`);
    const logs = await runPs(`[Environment]::GetEnvironmentVariable("${ENV_VARS.LOGS}", "${scope}")`);
    const proxy = await runPs(`[Environment]::GetEnvironmentVariable("${ENV_VARS.PROXY_PATH}", "${scope}")`);

    return home === paths.HOME &&
        logs === paths.LOGS &&
        proxy === paths.PROXY_EXE;
}
