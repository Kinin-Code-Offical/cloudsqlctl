import { execa } from 'execa';
import { logger } from '../core/logger.js';

export async function runPs(command: string, args: string[] = []): Promise<string> {
    try {
        const { stdout } = await execa('powershell', [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            command,
            ...args
        ]);
        return stdout.trim();
    } catch (error) {
        logger.debug(`PowerShell command failed: ${command}`, error);
        throw error;
    }
}

export async function isAdmin(): Promise<boolean> {
    try {
        // 'net session' only works with admin privileges
        await execa('net', ['session'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

export async function getEnvVar(name: string, scope: 'Machine' | 'User' | 'Process' = 'Machine'): Promise<string | null> {
    try {
        const val = await runPs('& { [Environment]::GetEnvironmentVariable($args[0], $args[1]) }', [name, scope]);
        return val || null;
    } catch {
        return null;
    }
}
