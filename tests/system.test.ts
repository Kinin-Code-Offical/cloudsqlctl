import { jest } from '@jest/globals';
import { USER_PATHS, SERVICE_NAME } from '../src/system/paths.js';

jest.unstable_mockModule('execa', () => ({
    execa: jest.fn()
}));

jest.unstable_mockModule('fs-extra', () => ({
    default: {
        existsSync: jest.fn(),
        ensureDir: jest.fn(),
        pathExists: jest.fn()
    }
}));

const { checkEnvironment } = await import('../src/system/env.js');
const { isServiceInstalled } = await import('../src/system/service.js');
const { execa } = await import('execa');
const fs = (await import('fs-extra')).default;

describe('System Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (fs.ensureDir as unknown as jest.Mock).mockReturnValue(Promise.resolve());
        (fs.existsSync as unknown as jest.Mock).mockReturnValue(true);
    });

    describe('Environment', () => {
        it('should check environment variables', async () => {
            (execa as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValueOnce({ stdout: USER_PATHS.HOME });
            (execa as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValueOnce({ stdout: USER_PATHS.LOGS });
            (execa as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValueOnce({ stdout: USER_PATHS.PROXY_EXE });

            const result = await checkEnvironment();
            expect(result).toBe(true);
        });

        it('should return false if env vars are missing', async () => {
            (execa as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValueOnce({ stdout: '' }); // Missing HOME
            (execa as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValueOnce({ stdout: USER_PATHS.LOGS });
            (execa as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValueOnce({ stdout: USER_PATHS.PROXY_EXE });

            const result = await checkEnvironment();
            expect(result).toBe(false);
        });
    });

    describe('Service', () => {
        it('should check if service is installed', async () => {
            (execa as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValueOnce({ stdout: '' }); // Success means installed

            const result = await isServiceInstalled();
            expect(result).toBe(true);
            expect(execa).toHaveBeenCalledWith('powershell', expect.arrayContaining([expect.stringContaining('Get-Service -Name $args[0]')]));
        });

        it('should return false if service check fails', async () => {
            (execa as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>).mockRejectedValueOnce(new Error('Service not found'));

            const result = await isServiceInstalled();
            expect(result).toBe(false);
        });
    });
});
