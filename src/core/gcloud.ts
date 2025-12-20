import { execa } from 'execa';
import { logger } from './logger.js';

export interface GcloudInstance {
    connectionName: string;
    name: string;
    region: string;
    project: string;
    databaseVersion: string;
    state: string;
}

export async function listInstances(): Promise<GcloudInstance[]> {
    try {
        const { stdout } = await execa('gcloud', ['sql', 'instances', 'list', '--format=json']);
        return JSON.parse(stdout);
    } catch (error) {
        logger.error('Failed to list instances', error);
        throw error;
    }
}

export async function checkGcloudInstalled(): Promise<boolean> {
    try {
        await execa('gcloud', ['--version']);
        return true;
    } catch (_error) {
        return false;
    }
}

export async function getActiveAccount(): Promise<string | null> {
    try {
        const { stdout } = await execa('gcloud', ['config', 'get-value', 'account']);
        return stdout.trim();
    } catch (_error) {
        return null;
    }
}
