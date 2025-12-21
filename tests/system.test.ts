import { jest } from '@jest/globals';
import { USER_PATHS, SERVICE_NAME } from '../src/system/paths.js';

jest.unstable_mockModule('execa', () => ({
    execa: jest.fn()
}));

const { checkEnvironment } = await import('../src/system/env.js');
const { isServiceInstalled } = await import('../src/system/service.js');
const { execa } = await import('execa');

describe('System Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Environment', () => {
        it('should check environment variables', async () => {
            (execa as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValueOnce({ stdout: USER_PATHS.HOME });
            (execa as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValueOnce({ stdout: USER_PATHS.LOGS });
            (execa as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValueOnce({ stdout: USER_PATHS.PROXY_EXE });

            const result = await checkEnvironment();
            expect(result).toBe(true);
            expect(execa).toHaveBeenCalledTimes(3);
        });

        it('should return false if env vars mismatch', async () => {
            (execa as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValueOnce({ stdout: 'WRONG_PATH' });
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
            expect(execa).toHaveBeenCalledWith('powershell', expect.arrayContaining([expect.stringContaining(`Get-Service -Name "${SERVICE_NAME}"`)]));
        });

        it('should return false if service check fails', async () => {
            (execa as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>).mockRejectedValueOnce(new Error('Service not found'));

            const result = await isServiceInstalled();
            expect(result).toBe(false);
        });
    });
});
