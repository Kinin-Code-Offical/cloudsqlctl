import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
    createSnapshotFromDirectory,
    restoreSnapshotToDirectory,
    normalizeSnapshotPath
} from '../src/core/sync.js';

describe('Sync Module', () => {
    const root = path.join(os.tmpdir(), `cloudsqlctl-sync-test-${Date.now()}`);
    const sourceDir = path.join(root, 'source');
    const targetDir = path.join(root, 'target');

    beforeAll(async () => {
        await fs.ensureDir(sourceDir);
        await fs.writeFile(path.join(sourceDir, 'file1.txt'), 'hello world');
        await fs.ensureDir(path.join(sourceDir, 'nested'));
        await fs.writeFile(path.join(sourceDir, 'nested', 'file2.txt'), 'nested content');
    });

    afterAll(async () => {
        await fs.remove(root);
    });

    it('should create and restore a snapshot', async () => {
        const draft = await createSnapshotFromDirectory(sourceDir, 'demo-repo', 'test snapshot');
        const snapshot = { ...draft, version: 1 };

        expect(snapshot.files.length).toBeGreaterThan(0);

        await restoreSnapshotToDirectory(snapshot, targetDir);

        const restored1 = await fs.readFile(path.join(targetDir, 'file1.txt'), 'utf8');
        const restored2 = await fs.readFile(path.join(targetDir, 'nested', 'file2.txt'), 'utf8');

        expect(restored1).toBe('hello world');
        expect(restored2).toBe('nested content');
    });

    it('should reject unsafe relative paths', () => {
        expect(() => normalizeSnapshotPath('../evil.txt')).toThrow();
        expect(() => normalizeSnapshotPath('C:/temp/evil.txt')).toThrow();
        expect(() => normalizeSnapshotPath('safe/path.txt')).not.toThrow();
    });
});
