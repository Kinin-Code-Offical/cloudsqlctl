import { execa } from 'execa';
import { logger } from './logger.js';
import { readConfig } from './config.js';

export interface GcloudInstance {
    connectionName: string;
    name: string;
    region: string;
    project: string;
    databaseVersion: string;
    state: string;
}

async function getGcloudCommand(): Promise<string> {
    const config = await readConfig();
    return config.gcloudPath || 'gcloud';
}

export async function listInstances(): Promise<GcloudInstance[]> {
    const cmd = await getGcloudCommand();
    try {
        const { stdout } = await execa(cmd, ['sql', 'instances', 'list', '--format=json']);
        return JSON.parse(stdout);
    } catch (error) {
        logger.error('Failed to list instances', error);
        throw error;
    }
}

export async function checkGcloudInstalled(): Promise<boolean> {
    const cmd = await getGcloudCommand();
    try {
        await execa(cmd, ['--version']);
        return true;
    } catch (_error) {
        return false;
    }
}

export async function getActiveAccount(): Promise<string | null> {
    const cmd = await getGcloudCommand();
    try {
        const { stdout } = await execa(cmd, ['config', 'get-value', 'account']);
        return stdout.trim();
    } catch (_error) {
        return null;
    }
}

export async function getProject(): Promise<string | null> {
    const cmd = await getGcloudCommand();
    try {
        const { stdout } = await execa(cmd, ['config', 'get-value', 'project']);
        return stdout.trim();
    } catch (_error) {
        return null;
    }
}

export async function setProject(projectId: string): Promise<void> {
    const cmd = await getGcloudCommand();
    await execa(cmd, ['config', 'set', 'project', projectId]);
}

export async function login(): Promise<void> {
    const cmd = await getGcloudCommand();
    await execa(cmd, ['auth', 'login'], { stdio: 'inherit' });
}

export async function adcLogin(): Promise<void> {
    const cmd = await getGcloudCommand();
    await execa(cmd, ['auth', 'application-default', 'login'], { stdio: 'inherit' });
}

export async function checkAdc(): Promise<boolean> {
    // 1. Check GOOGLE_APPLICATION_CREDENTIALS
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return true;
    }

    // 2. Check gcloud ADC
    const cmd = await getGcloudCommand();
    try {
        await execa(cmd, ['auth', 'application-default', 'print-access-token']);
        return true;
    } catch {
        return false;
    }
}
