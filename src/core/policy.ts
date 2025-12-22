import fs from 'fs-extra';
import path from 'path';
import { SYSTEM_PATHS } from '../system/paths.js';

export type PolicyUpdateChannel = 'stable' | 'beta';
export type PolicyScope = 'User' | 'Machine';

export interface EnterprisePolicy {
    updates?: {
        enabled?: boolean;
        channel?: PolicyUpdateChannel;
        pinnedVersion?: string;
    };
    auth?: {
        allowUserLogin?: boolean;
        allowAdcLogin?: boolean;
        allowServiceAccountKey?: boolean;
        allowedScopes?: PolicyScope[];
    };
}

export interface ResolvedUpgradePolicy {
    channel?: PolicyUpdateChannel;
    targetVersion?: string;
}

export function getPolicyPath(): string {
    const fromEnv = process.env.CLOUDSQLCTL_POLICY_PATH;
    if (fromEnv) return path.resolve(fromEnv);
    return SYSTEM_PATHS.POLICY_FILE;
}

function normalizeVersion(version: string): string {
    return version.startsWith('v') ? version.slice(1) : version;
}

export async function readPolicy(): Promise<EnterprisePolicy | null> {
    const policyPath = getPolicyPath();
    if (!await fs.pathExists(policyPath)) return null;

    const content = await fs.readFile(policyPath, 'utf8');
    try {
        return JSON.parse(content) as EnterprisePolicy;
    } catch (error) {
        throw new Error(`Invalid policy.json at ${policyPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export function resolveUpgradePolicy(policy: EnterprisePolicy | null, options: { channel?: string; version?: string; pin?: string; unpin?: boolean; }) {
    if (!policy) return {} satisfies ResolvedUpgradePolicy;

    if (policy.updates?.enabled === false) {
        throw new Error('Updates are disabled by enterprise policy.');
    }

    const enforcedChannel = policy.updates?.channel;
    if (enforcedChannel && options.channel && options.channel !== enforcedChannel) {
        throw new Error(`Update channel is restricted by enterprise policy (allowed: ${enforcedChannel}).`);
    }

    const enforcedPinned = policy.updates?.pinnedVersion;
    if (enforcedPinned) {
        if (options.pin || options.unpin) {
            throw new Error('Pin/unpin is managed by enterprise policy.');
        }

        const requested = options.version ? normalizeVersion(options.version) : undefined;
        const enforced = normalizeVersion(enforcedPinned);
        if (requested && requested !== enforced) {
            throw new Error(`Target version is restricted by enterprise policy (allowed: ${enforced}).`);
        }

        return { channel: enforcedChannel, targetVersion: enforced };
    }

    return { channel: enforcedChannel };
}

export function assertPolicyAllowsAuth(policy: EnterprisePolicy | null, action: 'login' | 'adc' | 'set-service-account', scope?: PolicyScope) {
    if (!policy) return;

    if (action === 'login' && policy.auth?.allowUserLogin === false) {
        throw new Error('Interactive gcloud login is disabled by enterprise policy.');
    }
    if (action === 'adc' && policy.auth?.allowAdcLogin === false) {
        throw new Error('ADC login is disabled by enterprise policy.');
    }
    if (action === 'set-service-account' && policy.auth?.allowServiceAccountKey === false) {
        throw new Error('Service account key management is disabled by enterprise policy.');
    }

    if (action === 'set-service-account' && scope && policy.auth?.allowedScopes && !policy.auth.allowedScopes.includes(scope)) {
        throw new Error(`Scope '${scope}' is not allowed by enterprise policy.`);
    }
}

