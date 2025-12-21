import { runPs, isAdmin } from './powershell.js';
import { SERVICE_NAME, SYSTEM_PATHS } from './paths.js';
import { logger } from '../core/logger.js';

export async function isServiceInstalled(): Promise<boolean> {
    try {
        await runPs(`Get-Service -Name "${SERVICE_NAME}" -ErrorAction Stop`);
        return true;
    } catch {
        return false;
    }
}

export async function isServiceRunning(): Promise<boolean> {
    try {
        const status = await runPs(`(Get-Service -Name "${SERVICE_NAME}").Status`);
        return status === 'Running';
    } catch {
        return false;
    }
}

export async function installService(instance: string, port: number = 5432, extraArgs: string[] = []) {
    if (!await isAdmin()) {
        throw new Error('Admin privileges required to install service.');
    }

    if (await isServiceInstalled()) {
        logger.info('Service already installed.');
        return;
    }

    logger.info(`Installing service ${SERVICE_NAME}...`);

    const binPath = `\\"${SYSTEM_PATHS.PROXY_EXE}\\" ${instance} --port=${port} ${extraArgs.join(' ')}`;

    // Use sc.exe for better control over binPath with spaces/quotes
    // New-Service can be tricky with complex quoting
    await runPs(`New-Service -Name "${SERVICE_NAME}" -BinaryPathName '${binPath}' -StartupType Automatic`);
}

export async function updateServiceBinPath(instance: string, port: number = 5432, extraArgs: string[] = []) {
    if (!await isAdmin()) {
        throw new Error('Admin privileges required to update service configuration.');
    }

    const binPath = `\\"${SYSTEM_PATHS.PROXY_EXE}\\" ${instance} --port=${port} ${extraArgs.join(' ')}`;

    // Use sc.exe to config binPath as Set-Service doesn't always support it easily for args
    // sc.exe config "cloudsql-proxy" binPath= "..."
    // Note: sc.exe requires a space after binPath=
    await runPs(`sc.exe config "${SERVICE_NAME}" binPath= "${binPath}"`);
}

export async function uninstallService() {
    if (!await isAdmin()) {
        throw new Error('Admin privileges required to uninstall service.');
    }

    if (!await isServiceInstalled()) {
        return;
    }

    logger.info(`Uninstalling service ${SERVICE_NAME}...`);
    await stopService();
    // Remove-Service is available in PowerShell 6+, or use sc.exe
    // PowerShell 5.1 (default on Win10) might not have Remove-Service? It does.
    await runPs(`Remove-Service -Name "${SERVICE_NAME}"`);
}

export async function startService() {
    if (!await isAdmin()) {
        throw new Error('Admin privileges required to start service.');
    }
    logger.info(`Starting service ${SERVICE_NAME}...`);
    await runPs(`Start-Service -Name "${SERVICE_NAME}"`);
}

export async function stopService() {
    if (!await isAdmin()) {
        throw new Error('Admin privileges required to stop service.');
    }
    logger.info(`Stopping service ${SERVICE_NAME}...`);
    await runPs(`Stop-Service -Name "${SERVICE_NAME}" -Force`);
}
