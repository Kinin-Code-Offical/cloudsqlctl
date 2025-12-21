import path from 'path';
import os from 'os';
import fs from 'fs-extra';

const PROGRAM_DATA = process.env.ProgramData || 'C:\\ProgramData';
const LOCAL_APP_DATA = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

export const USER_PATHS = {
    HOME: path.join(LOCAL_APP_DATA, 'CloudSQLCTL'),
    LOGS: path.join(LOCAL_APP_DATA, 'CloudSQLCTL', 'logs'),
    BIN: path.join(LOCAL_APP_DATA, 'CloudSQLCTL', 'bin'),
    PROXY_EXE: path.join(LOCAL_APP_DATA, 'CloudSQLCTL', 'bin', 'cloud-sql-proxy.exe'),
    CONFIG_DIR: path.join(LOCAL_APP_DATA, 'CloudSQLCTL'),
    CONFIG_FILE: path.join(LOCAL_APP_DATA, 'CloudSQLCTL', 'config.json'),
    TEMP: path.join(LOCAL_APP_DATA, 'CloudSQLCTL', 'temp'),
    GCLOUD_DIR: path.join(LOCAL_APP_DATA, 'CloudSQLCTL', 'gcloud'),
    PID_FILE: path.join(LOCAL_APP_DATA, 'CloudSQLCTL', 'proxy.pid'),
    SECRETS: path.join(LOCAL_APP_DATA, 'CloudSQLCTL', 'secrets'),
};

export const SYSTEM_PATHS = {
    HOME: path.join(PROGRAM_DATA, 'CloudSQLCTL'),
    LOGS: path.join(PROGRAM_DATA, 'CloudSQLCTL', 'logs'),
    BIN: path.join(PROGRAM_DATA, 'CloudSQLCTL', 'bin'),
    PROXY_EXE: path.join(PROGRAM_DATA, 'CloudSQLCTL', 'bin', 'cloud-sql-proxy.exe'),
    SCRIPTS: path.join(PROGRAM_DATA, 'CloudSQLCTL', 'scripts'),
    SECRETS: path.join(PROGRAM_DATA, 'CloudSQLCTL', 'secrets'),
};

export const ENV_VARS = {
    HOME: 'CLOUDSQLCTL_HOME',
    LOGS: 'CLOUDSQLCTL_LOGS',
    PROXY_PATH: 'CLOUDSQLCTL_PROXY_PATH',
    GOOGLE_CREDS: 'GOOGLE_APPLICATION_CREDENTIALS'
};

function resolvePaths() {
    // 1. Priority: Environment Variables
    const envProxyPath = process.env[ENV_VARS.PROXY_PATH];
    if (envProxyPath) {
        const proxyPath = envProxyPath;
        const home = process.env[ENV_VARS.HOME] || path.dirname(path.dirname(proxyPath)); // Guess home from proxy
        return {
            HOME: home,
            LOGS: process.env[ENV_VARS.LOGS] || path.join(home, 'logs'),
            BIN: path.dirname(proxyPath),
            PROXY_EXE: proxyPath,
            CONFIG_DIR: home,
            CONFIG_FILE: path.join(home, 'config.json'),
            TEMP: path.join(home, 'temp'),
            GCLOUD_DIR: path.join(home, 'gcloud'),
            PID_FILE: path.join(home, 'proxy.pid'),
            SECRETS: path.join(home, 'secrets'),
        };
    }

    // 2. Fallback: Check for existing proxy file (System then User)
    if (fs.existsSync(SYSTEM_PATHS.PROXY_EXE)) {
        return {
            ...SYSTEM_PATHS,
            CONFIG_DIR: SYSTEM_PATHS.HOME,
            CONFIG_FILE: path.join(SYSTEM_PATHS.HOME, 'config.json'),
            TEMP: path.join(SYSTEM_PATHS.HOME, 'temp'),
            GCLOUD_DIR: path.join(SYSTEM_PATHS.HOME, 'gcloud'),
            PID_FILE: path.join(SYSTEM_PATHS.HOME, 'proxy.pid'),
        };
    }

    if (fs.existsSync(USER_PATHS.PROXY_EXE)) {
        return USER_PATHS;
    }

    // 3. Default: System Paths (Target for new installation)
    return {
        ...SYSTEM_PATHS,
        CONFIG_DIR: SYSTEM_PATHS.HOME,
        CONFIG_FILE: path.join(SYSTEM_PATHS.HOME, 'config.json'),
        TEMP: path.join(SYSTEM_PATHS.HOME, 'temp'),
        GCLOUD_DIR: path.join(SYSTEM_PATHS.HOME, 'gcloud'),
        PID_FILE: path.join(SYSTEM_PATHS.HOME, 'proxy.pid'),
    };
}

// Default to resolved paths
export const PATHS = resolvePaths();

export const SERVICE_NAME = 'cloudsql-proxy';
