import { runPs, isAdmin, getEnvVar } from './powershell.js';
import { SERVICE_NAME, SYSTEM_PATHS, ENV_VARS } from './paths.js';
import { logger } from '../core/logger.js';

export async function isServiceInstalled(): Promise<boolean> {
    try {
        await runPs('& { Get-Service -Name $args[0] -ErrorAction Stop }', [SERVICE_NAME]);
        return true;
    } catch {
        return false;
    }
}

export async function isServiceRunning(): Promise<boolean> {
    try {
        const status = await runPs('& { (Get-Service -Name $args[0]).Status }', [SERVICE_NAME]);
        return status === 'Running';
    } catch {
        return false;
    }
}

function buildServiceBinPath(proxyExe: string, instance: string, port: number, extraArgs: string[]): string {
    return `"${proxyExe}" ${instance} --port=${port} ${extraArgs.join(' ')}`.trim();
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

    // Auto-detect credentials if not provided in extraArgs
    if (!extraArgs.some(arg => arg.includes('--credentials-file'))) {
        const machineCreds = await getEnvVar(ENV_VARS.GOOGLE_CREDS, 'Machine');
        if (machineCreds) {
            logger.info(`Auto-detected machine-level credentials: ${machineCreds}`);
            extraArgs.push(`--credentials-file "${machineCreds}"`);
        } else {
            const userCreds = await getEnvVar(ENV_VARS.GOOGLE_CREDS, 'User');
            if (userCreds) {
                logger.warn('Detected user-level credentials. Services running as LocalSystem may not be able to access them.');
                logger.warn('Recommendation: Use "cloudsqlctl auth set-service-account --file <path> --scope Machine"');
                extraArgs.push(`--credentials-file "${userCreds}"`);
            }
        }
    }

    const binPath = buildServiceBinPath(SYSTEM_PATHS.PROXY_EXE, instance, port, extraArgs);

    // Use New-Service with arguments to avoid injection
    await runPs('& { New-Service -Name $args[0] -BinaryPathName $args[1] -StartupType Automatic }', [SERVICE_NAME, binPath]);
}

export async function updateServiceBinPath(instance: string, port: number = 5432, extraArgs: string[] = []) {
    if (!await isAdmin()) {
        throw new Error('Admin privileges required to update service configuration.');
    }

    // Auto-detect credentials if not provided in extraArgs
    if (!extraArgs.some(arg => arg.includes('--credentials-file'))) {
        const machineCreds = await getEnvVar(ENV_VARS.GOOGLE_CREDS, 'Machine');
        if (machineCreds) {
            extraArgs.push(`--credentials-file "${machineCreds}"`);
        }
    }

    const binPath = buildServiceBinPath(SYSTEM_PATHS.PROXY_EXE, instance, port, extraArgs);

    // Use CIM/WMI to update service path with arguments
    await runPs('& { $svc = Get-CimInstance Win32_Service -Filter "Name=$($args[0])"; Invoke-CimMethod -InputObject $svc -MethodName Change -Arguments @{ PathName = $args[1] } }', [SERVICE_NAME, binPath]);
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

    // Use sc.exe delete instead of Remove-Service for better compatibility
    await runPs('& { sc.exe delete $args[0] }', [SERVICE_NAME]);
}

export async function startService() {
    if (!await isAdmin()) {
        throw new Error('Admin privileges required to start service.');
    }
    logger.info(`Starting service ${SERVICE_NAME}...`);
    await runPs('& { Start-Service -Name $args[0] }', [SERVICE_NAME]);
}

export async function stopService() {
    if (!await isAdmin()) {
        throw new Error('Admin privileges required to stop service.');
    }
    logger.info(`Stopping service ${SERVICE_NAME}...`);
    await runPs('& { Stop-Service -Name $args[0] -Force }', [SERVICE_NAME]);
}

export async function setServiceStartupType(type: 'Automatic' | 'Manual' | 'Disabled' | 'Delayed') {
    if (!await isAdmin()) {
        throw new Error('Admin privileges required to change service startup type.');
    }

    if (type === 'Delayed') {
        // Delayed start is a special case of Automatic
        await runPs('& { Set-Service -Name $args[0] -StartupType Automatic }', [SERVICE_NAME]);
        await runPs('& { sc.exe config $args[0] start= delayed-auto }', [SERVICE_NAME]);
    } else {
        await runPs('& { Set-Service -Name $args[0] -StartupType $args[1] }', [SERVICE_NAME, type]);
    }
    logger.info(`Service startup type set to ${type}.`);
}
