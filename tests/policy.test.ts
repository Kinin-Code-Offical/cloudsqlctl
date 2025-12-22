import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { readPolicy, resolveUpgradePolicy, assertPolicyAllowsAuth } from '../src/core/policy.js';

function tmpFile(name: string) {
    return path.join(os.tmpdir(), `cloudsqlctl-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
}

describe('Policy Module', () => {
    const originalEnv = process.env.CLOUDSQLCTL_POLICY_PATH;

    afterEach(async () => {
        if (originalEnv === undefined) {
            delete process.env.CLOUDSQLCTL_POLICY_PATH;
        } else {
            process.env.CLOUDSQLCTL_POLICY_PATH = originalEnv;
        }
    });

    it('returns null if policy does not exist', async () => {
        process.env.CLOUDSQLCTL_POLICY_PATH = tmpFile('missing');
        const policy = await readPolicy();
        expect(policy).toBeNull();
    });

    it('throws if policy exists but is invalid json', async () => {
        const p = tmpFile('invalid');
        await fs.writeFile(p, '{not-json', 'utf8');
        process.env.CLOUDSQLCTL_POLICY_PATH = p;
        await expect(readPolicy()).rejects.toThrow(/Invalid policy\.json/);
        await fs.remove(p);
    });

    it('enforces upgrades disabled', () => {
        expect(() => resolveUpgradePolicy({ updates: { enabled: false } }, {})).toThrow(/Updates are disabled/);
    });

    it('enforces pinned version and channel restrictions', () => {
        const policy = { updates: { channel: 'stable', pinnedVersion: '0.4.15' } };
        expect(() => resolveUpgradePolicy(policy, { channel: 'beta' })).toThrow(/channel is restricted/i);
        expect(() => resolveUpgradePolicy(policy, { pin: '0.4.16' })).toThrow(/Pin\/unpin is managed/i);
        expect(() => resolveUpgradePolicy(policy, { version: '0.4.16' })).toThrow(/Target version is restricted/i);
        expect(resolveUpgradePolicy(policy, {})).toEqual({ channel: 'stable', targetVersion: '0.4.15' });
        expect(resolveUpgradePolicy(policy, { version: 'v0.4.15' })).toEqual({ channel: 'stable', targetVersion: '0.4.15' });
    });

    it('enforces auth guardrails', () => {
        const policy = { auth: { allowUserLogin: false, allowedScopes: ['Machine'] as const } };
        expect(() => assertPolicyAllowsAuth(policy, 'login')).toThrow(/disabled/i);
        expect(() => assertPolicyAllowsAuth(policy, 'set-service-account', 'User')).toThrow(/not allowed/i);
        expect(() => assertPolicyAllowsAuth(policy, 'set-service-account', 'Machine')).not.toThrow();
    });
});

