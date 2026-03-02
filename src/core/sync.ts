import http from 'http';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs-extra';
import axios from 'axios';
import { spawn } from 'child_process';
import { execa } from 'execa';
import { PATHS } from '../system/paths.js';
import { logger } from './logger.js';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 4780;
const MAX_BODY_BYTES = 100 * 1024 * 1024; // 100MB
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', '.history']);

export interface SyncPaths {
    root: string;
    dataDir: string;
    pidFile: string;
}

export interface SnapshotFile {
    path: string;
    contentBase64: string;
    sha256: string;
    size: number;
}

export interface SyncSnapshot {
    repo: string;
    version: number;
    createdAt: string;
    message?: string;
    files: SnapshotFile[];
}

interface RepoIndex {
    latestVersion: number;
    versions: number[];
}

interface PushPayload {
    repo: string;
    message?: string;
    files: SnapshotFile[];
}

export interface DockerStatus {
    installed: boolean;
    version?: string;
    attemptedInstall?: boolean;
    installMessage?: string;
}

export function getSyncPaths(): SyncPaths {
    const root = path.join(PATHS.HOME, 'sync');
    return {
        root,
        dataDir: path.join(root, 'server-data'),
        pidFile: path.join(root, 'sync-server.pid')
    };
}

function safeRepoName(repo: string): string {
    const cleaned = repo.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-');
    if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '..') {
        throw new Error(`Invalid repo name: '${repo}'`);
    }
    return cleaned;
}

export function normalizeSnapshotPath(input: string): string {
    const normalized = input.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized || normalized.includes('..') || normalized.includes(':')) {
        throw new Error(`Unsafe snapshot path: '${input}'`);
    }
    return normalized;
}

function shouldIgnore(relativePath: string): boolean {
    const parts = relativePath.split(path.sep);
    return parts.some(p => IGNORED_DIRS.has(p));
}

async function collectFiles(rootDir: string, currentDir: string = rootDir): Promise<string[]> {
    const entries = await fs.readdir(currentDir);
    const files: string[] = [];

    for (const entry of entries) {
        const abs = path.join(currentDir, entry);
        const rel = path.relative(rootDir, abs);
        if (shouldIgnore(rel)) continue;

        const stat = await fs.stat(abs);
        if (stat.isDirectory()) {
            files.push(...await collectFiles(rootDir, abs));
        } else if (stat.isFile()) {
            files.push(abs);
        }
    }

    return files;
}

export async function createSnapshotFromDirectory(sourceDir: string, repo: string, message?: string): Promise<Omit<SyncSnapshot, 'version'>> {
    if (!await fs.pathExists(sourceDir)) {
        throw new Error(`Source directory does not exist: ${sourceDir}`);
    }

    const files = await collectFiles(sourceDir);
    const payloadFiles: SnapshotFile[] = [];

    for (const absPath of files) {
        const rel = normalizeSnapshotPath(path.relative(sourceDir, absPath));
        const buf = await fs.readFile(absPath);
        const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
        payloadFiles.push({
            path: rel,
            contentBase64: buf.toString('base64'),
            sha256,
            size: buf.length
        });
    }

    return {
        repo: safeRepoName(repo),
        createdAt: new Date().toISOString(),
        message,
        files: payloadFiles
    };
}

export async function restoreSnapshotToDirectory(snapshot: SyncSnapshot, targetDir: string): Promise<void> {
    await fs.ensureDir(targetDir);

    for (const file of snapshot.files) {
        const rel = normalizeSnapshotPath(file.path);
        const dest = path.join(targetDir, rel);
        const destDir = path.dirname(dest);
        await fs.ensureDir(destDir);

        const buf = Buffer.from(file.contentBase64, 'base64');
        const hash = crypto.createHash('sha256').update(buf).digest('hex');
        if (hash.toLowerCase() !== file.sha256.toLowerCase()) {
            throw new Error(`Checksum mismatch in snapshot file: ${file.path}`);
        }

        await fs.writeFile(dest, buf);
    }
}

function getRepoDir(repo: string): string {
    const paths = getSyncPaths();
    return path.join(paths.dataDir, safeRepoName(repo));
}

function getVersionsDir(repo: string): string {
    return path.join(getRepoDir(repo), 'versions');
}

function getIndexFile(repo: string): string {
    return path.join(getRepoDir(repo), 'index.json');
}

async function loadIndex(repo: string): Promise<RepoIndex> {
    const indexFile = getIndexFile(repo);
    if (!await fs.pathExists(indexFile)) {
        return { latestVersion: 0, versions: [] };
    }
    return await fs.readJson(indexFile) as RepoIndex;
}

async function saveIndex(repo: string, index: RepoIndex): Promise<void> {
    const indexFile = getIndexFile(repo);
    await fs.ensureDir(path.dirname(indexFile));
    await fs.writeJson(indexFile, index, { spaces: 2 });
}

async function writeServerSnapshot(payload: PushPayload): Promise<SyncSnapshot> {
    const repo = safeRepoName(payload.repo);
    const index = await loadIndex(repo);
    const nextVersion = index.latestVersion + 1;

    const snapshot: SyncSnapshot = {
        repo,
        version: nextVersion,
        createdAt: new Date().toISOString(),
        message: payload.message,
        files: payload.files
    };

    const versionsDir = getVersionsDir(repo);
    await fs.ensureDir(versionsDir);
    const snapshotFile = path.join(versionsDir, `v${nextVersion}.json`);
    await fs.writeJson(snapshotFile, snapshot);

    index.latestVersion = nextVersion;
    index.versions.push(nextVersion);
    await saveIndex(repo, index);

    return snapshot;
}

async function readServerSnapshot(repo: string, version: string): Promise<SyncSnapshot> {
    const safeRepo = safeRepoName(repo);
    const index = await loadIndex(safeRepo);
    if (index.latestVersion === 0) {
        throw new Error(`No snapshots found for repo '${safeRepo}'`);
    }

    const resolvedVersion = version === 'latest' ? index.latestVersion : Number(version);
    if (!Number.isFinite(resolvedVersion) || resolvedVersion <= 0) {
        throw new Error(`Invalid version '${version}'`);
    }

    const file = path.join(getVersionsDir(safeRepo), `v${resolvedVersion}.json`);
    if (!await fs.pathExists(file)) {
        throw new Error(`Version v${resolvedVersion} not found for repo '${safeRepo}'`);
    }

    return await fs.readJson(file) as SyncSnapshot;
}

function writeJson(res: http.ServerResponse, statusCode: number, payload: unknown): void {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
}

async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    let received = 0;

    return await new Promise((resolve, reject) => {
        req.on('data', (chunk: Buffer) => {
            received += chunk.length;
            if (received > MAX_BODY_BYTES) {
                reject(new Error('Request body too large'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            try {
                const raw = Buffer.concat(chunks).toString('utf8');
                resolve(raw ? JSON.parse(raw) : {});
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}

export async function runSyncDaemon(host: string = DEFAULT_HOST, port: number = DEFAULT_PORT): Promise<void> {
    const paths = getSyncPaths();
    await fs.ensureDir(paths.dataDir);
    await fs.ensureDir(path.dirname(paths.pidFile));

    const startedAt = new Date().toISOString();

    const server = http.createServer(async (req, res) => {
        try {
            const url = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`);
            const method = req.method || 'GET';

            if (method === 'GET' && url.pathname === '/health') {
                writeJson(res, 200, { ok: true, pid: process.pid, startedAt, host, port });
                return;
            }

            if (method === 'POST' && url.pathname === '/push') {
                const body = await readJsonBody(req) as PushPayload;
                if (!body?.repo || !Array.isArray(body.files)) {
                    writeJson(res, 400, { error: 'Invalid payload. Expected { repo, files[] }' });
                    return;
                }
                const snapshot = await writeServerSnapshot(body);
                writeJson(res, 200, { ok: true, version: snapshot.version, fileCount: snapshot.files.length });
                return;
            }

            if (method === 'GET' && url.pathname === '/pull') {
                const repo = url.searchParams.get('repo') || '';
                const version = url.searchParams.get('version') || 'latest';
                const snapshot = await readServerSnapshot(repo, version);
                writeJson(res, 200, snapshot);
                return;
            }

            if (method === 'GET' && url.pathname === '/history') {
                const repo = url.searchParams.get('repo') || '';
                const index = await loadIndex(repo);
                writeJson(res, 200, {
                    repo: safeRepoName(repo),
                    latestVersion: index.latestVersion,
                    versions: index.versions
                });
                return;
            }

            writeJson(res, 404, { error: 'Not found' });
        } catch (error) {
            writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
        }
    });

    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => resolve());
    });

    await fs.writeJson(paths.pidFile, {
        pid: process.pid,
        host,
        port,
        startedAt
    });

    logger.info(`Mock sync server started at http://${host}:${port} (pid: ${process.pid})`);

    const cleanup = async () => {
        try {
            await fs.remove(paths.pidFile);
        } catch {
            // ignore cleanup error
        }
        server.close();
    };

    process.on('SIGINT', () => {
        void cleanup().finally(() => process.exit(0));
    });
    process.on('SIGTERM', () => {
        void cleanup().finally(() => process.exit(0));
    });
}

export async function getSyncServerStatus(): Promise<{ running: boolean; pid?: number; host?: string; port?: number }> {
    const paths = getSyncPaths();
    if (!await fs.pathExists(paths.pidFile)) {
        return { running: false };
    }

    const info = await fs.readJson(paths.pidFile) as { pid: number; host: string; port: number };
    try {
        process.kill(info.pid, 0);
        return { running: true, pid: info.pid, host: info.host, port: info.port };
    } catch {
        await fs.remove(paths.pidFile);
        return { running: false };
    }
}

export async function startSyncServer(host: string = DEFAULT_HOST, port: number = DEFAULT_PORT): Promise<void> {
    const status = await getSyncServerStatus();
    if (status.running) {
        logger.info(`Sync server is already running (pid: ${status.pid})`);
        return;
    }

    const isNodeExec = path.basename(process.execPath).toLowerCase() === 'node.exe';
    const args = isNodeExec
        ? [process.argv[1], 'sync', 'daemon', '--host', host, '--port', String(port)]
        : ['sync', 'daemon', '--host', host, '--port', String(port)];

    const child = spawn(process.execPath, args, {
        detached: true,
        windowsHide: true,
        stdio: 'ignore'
    });
    child.unref();

    const healthUrl = `http://${host}:${port}/health`;
    const attempts = 20;
    for (let i = 0; i < attempts; i++) {
        try {
            await axios.get(healthUrl, { timeout: 800 });
            logger.info(`Sync server started at ${healthUrl}`);
            return;
        } catch {
            await new Promise(resolve => setTimeout(resolve, 250));
        }
    }

    throw new Error('Sync server failed to start in time');
}

export async function stopSyncServer(): Promise<void> {
    const status = await getSyncServerStatus();
    if (!status.running || !status.pid) {
        logger.info('Sync server is not running.');
        return;
    }

    if (process.platform === 'win32') {
        await execa('taskkill', ['/PID', String(status.pid), '/T', '/F']);
    } else {
        process.kill(status.pid, 'SIGTERM');
    }

    const paths = getSyncPaths();
    await fs.remove(paths.pidFile);
    logger.info('Sync server stopped.');
}

export async function pushDirectoryToSyncServer(options: {
    sourceDir: string;
    repo: string;
    serverUrl: string;
    message?: string;
}): Promise<{ version: number; fileCount: number }> {
    const snapshot = await createSnapshotFromDirectory(options.sourceDir, options.repo, options.message);

    const response = await axios.post<{ ok: boolean; version: number; fileCount: number }>(
        `${options.serverUrl.replace(/\/$/, '')}/push`,
        {
            repo: snapshot.repo,
            message: snapshot.message,
            files: snapshot.files
        },
        {
            timeout: 120000
        }
    );

    return {
        version: response.data.version,
        fileCount: response.data.fileCount
    };
}

export async function pullDirectoryFromSyncServer(options: {
    targetDir: string;
    repo: string;
    serverUrl: string;
    version?: string;
}): Promise<{ version: number; fileCount: number }> {
    const response = await axios.get<SyncSnapshot>(`${options.serverUrl.replace(/\/$/, '')}/pull`, {
        params: {
            repo: options.repo,
            version: options.version || 'latest'
        },
        timeout: 120000
    });

    await restoreSnapshotToDirectory(response.data, options.targetDir);
    return {
        version: response.data.version,
        fileCount: response.data.files.length
    };
}

export async function getSyncHistory(serverUrl: string, repo: string): Promise<{ latestVersion: number; versions: number[] }> {
    const response = await axios.get<{ latestVersion: number; versions: number[] }>(`${serverUrl.replace(/\/$/, '')}/history`, {
        params: { repo },
        timeout: 10000
    });
    return response.data;
}

export async function checkDockerAndOptionallyInstall(installIfMissing: boolean): Promise<DockerStatus> {
    try {
        const { stdout } = await execa('docker', ['--version']);
        return { installed: true, version: stdout.trim() };
    } catch {
        if (!installIfMissing) {
            return {
                installed: false,
                installMessage: 'Docker is not installed. Re-run with --install to install via winget.'
            };
        }

        if (process.platform !== 'win32') {
            return {
                installed: false,
                attemptedInstall: true,
                installMessage: 'Automatic Docker installation is currently supported only on Windows via winget.'
            };
        }

        await execa('winget', [
            'install',
            '-e',
            '--id', 'Docker.DockerDesktop',
            '--accept-package-agreements',
            '--accept-source-agreements'
        ], { stdio: 'inherit' });

        return {
            installed: false,
            attemptedInstall: true,
            installMessage: 'Docker installation command executed. Please complete Docker Desktop setup and restart your shell.'
        };
    }
}
