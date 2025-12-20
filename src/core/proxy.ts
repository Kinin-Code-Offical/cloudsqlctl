import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { PATHS } from './config.js';
import { logger } from './logger.js';
import { execa } from 'execa';

export async function isRunning(): Promise<boolean> {
    if (!await fs.pathExists(PATHS.PID_FILE)) {
        return false;
    }
    const pidStr = await fs.readFile(PATHS.PID_FILE, 'utf-8');
    const pid = parseInt(pidStr.trim(), 10);
    if (isNaN(pid)) return false;

    try {
        process.kill(pid, 0); // Check if running
        return true;
    } catch (_e) {
        // Process doesn't exist
        // Clean up stale PID file
        await fs.remove(PATHS.PID_FILE);
        return false;
    }
}

export async function startProxy(connectionName: string, port: number = 5432): Promise<number> {
    if (await isRunning()) {
        throw new Error('Proxy is already running');
    }

    const args = [
        connectionName,
        `--port=${port}`
    ];

    logger.info(`Starting proxy with args: ${args.join(' ')}`);

    // Redirect output to a log file
    const outLog = fs.openSync(path.join(PATHS.LOG_DIR, 'proxy.out.log'), 'a');
    const errLog = fs.openSync(path.join(PATHS.LOG_DIR, 'proxy.err.log'), 'a');

    const subprocess = spawn(PATHS.PROXY_EXE, args, {
        detached: true,
        stdio: ['ignore', outLog, errLog],
        windowsHide: true
    });

    subprocess.unref();

    if (subprocess.pid) {
        await fs.writeFile(PATHS.PID_FILE, subprocess.pid.toString());
        return subprocess.pid;
    } else {
        throw new Error('Failed to start proxy process');
    }
}

export async function stopProxy(): Promise<void> {
    if (!await fs.pathExists(PATHS.PID_FILE)) {
        logger.warn('No PID file found');
        return;
    }

    const pidStr = await fs.readFile(PATHS.PID_FILE, 'utf-8');
    const pid = parseInt(pidStr.trim(), 10);

    try {
        if (process.platform === 'win32') {
            // Force kill tree
            await execa('taskkill', ['/PID', pid.toString(), '/T', '/F']);
        } else {
            process.kill(pid, 'SIGTERM');
        }
    } catch (e) {
        logger.warn(`Failed to kill process ${pid}`, e);
    }

    await fs.remove(PATHS.PID_FILE);
}
