import path from 'path';
import os from 'os';

const PROGRAM_DATA = process.env.ProgramData || 'C:\\ProgramData';
const APP_DATA = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
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
};

export const SYSTEM_PATHS = {
    HOME: path.join(PROGRAM_DATA, 'CloudSQLCTL'),
    LOGS: path.join(PROGRAM_DATA, 'CloudSQLCTL', 'logs'),
    BIN: path.join(PROGRAM_DATA, 'CloudSQLCTL', 'bin'),
    PROXY_EXE: path.join(PROGRAM_DATA, 'CloudSQLCTL', 'bin', 'cloud-sql-proxy.exe'),
    SCRIPTS: path.join(PROGRAM_DATA, 'CloudSQLCTL', 'scripts')
};

export const ENV_VARS = {
    HOME: 'CLOUDSQLCTL_HOME',
    LOGS: 'CLOUDSQLCTL_LOGS',
    PROXY_PATH: 'CLOUDSQLCTL_PROXY_PATH',
    GOOGLE_CREDS: 'GOOGLE_APPLICATION_CREDENTIALS'
};

function resolvePaths() {
    const home = process.env[ENV_VARS.HOME] || USER_PATHS.HOME;
    const logs = process.env[ENV_VARS.LOGS] || path.join(home, 'logs');
    const bin = path.join(home, 'bin');
    const proxyExe = process.env[ENV_VARS.PROXY_PATH] || path.join(bin, 'cloud-sql-proxy.exe');

    return {
        HOME: home,
        LOGS: logs,
        BIN: bin,
        PROXY_EXE: proxyExe,
        CONFIG_DIR: home,
        CONFIG_FILE: path.join(home, 'config.json'),
        TEMP: path.join(home, 'temp'),
        GCLOUD_DIR: path.join(home, 'gcloud'),
        PID_FILE: path.join(home, 'proxy.pid'),
    };
}

// Default to resolved paths (User scope by default, or ENV overrides)
export const PATHS = resolvePaths();

export const SERVICE_NAME = 'cloudsql-proxy';
