import fs from 'fs-extra';
import { PATHS } from '../system/paths.js';

export { PATHS };

export interface AppConfig {
    selectedInstance?: string;
    proxyPort?: number;
    autoUpdate?: boolean;
    lastUpdateCheck?: string;
    gcloudPath?: string;
}

export async function ensureDirs() {
    await fs.ensureDir(PATHS.HOME);
    await fs.ensureDir(PATHS.LOGS);
    await fs.ensureDir(PATHS.BIN);
}

export async function readConfig(): Promise<AppConfig> {
    try {
        await ensureDirs();
        if (!await fs.pathExists(PATHS.CONFIG_FILE)) {
            return {};
        }
        return await fs.readJson(PATHS.CONFIG_FILE);
    } catch (_error) {
        return {};
    }
}

export async function writeConfig(config: Partial<AppConfig>) {
    await ensureDirs();
    const current = await readConfig();
    await fs.writeJson(PATHS.CONFIG_FILE, { ...current, ...config }, { spaces: 2 });
}
