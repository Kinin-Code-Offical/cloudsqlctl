import { readConfig, writeConfig, PATHS } from '../src/core/config.js';
import fs from 'fs-extra';

describe('Config Module', () => {
    beforeAll(async () => {
        await fs.ensureDir(PATHS.HOME);
    });

    it('should read empty config if file does not exist', async () => {
        await fs.remove(PATHS.CONFIG_FILE);
        const config = await readConfig();
        expect(config).toEqual({});
    });

    it('should write and read config', async () => {
        const testConfig = { selectedInstance: 'test-instance' };
        await writeConfig(testConfig);
        const config = await readConfig();
        expect(config.selectedInstance).toBe('test-instance');
    });
});
