import { jest } from '@jest/globals';

// Mock fs-extra
jest.unstable_mockModule('fs-extra', () => ({
    default: {
        pathExists: jest.fn().mockReturnValue(Promise.resolve(false)),
        readFile: jest.fn(),
        writeFile: jest.fn(),
        remove: jest.fn(),
        ensureDir: jest.fn(),
        openSync: jest.fn(),
    }
}));

// Mock execa
jest.unstable_mockModule('execa', () => ({
    execa: jest.fn(),
}));

// Mock child_process
jest.unstable_mockModule('child_process', () => ({
    spawn: jest.fn().mockReturnValue({
        unref: jest.fn(),
        pid: 12345,
    }),
}));

const { isRunning, startProxy, stopProxy } = await import('../src/core/proxy.js');
const fs = (await import('fs-extra')).default;

describe('Proxy Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return false if PID file does not exist', async () => {
        (fs.pathExists as unknown as jest.Mock).mockReturnValue(Promise.resolve(false));
        const running = await isRunning();
        expect(running).toBe(false);
    });

    it('should start proxy if not running', async () => {
        (fs.pathExists as unknown as jest.Mock).mockReturnValue(Promise.resolve(false));
        const pid = await startProxy('test-connection');
        expect(pid).toBe(12345);
        expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should stop proxy if running', async () => {
        (fs.pathExists as unknown as jest.Mock).mockReturnValue(Promise.resolve(true));
        (fs.readFile as unknown as jest.Mock).mockReturnValue(Promise.resolve('12345'));

        await stopProxy();

        expect(fs.remove).toHaveBeenCalled();
    });
});
