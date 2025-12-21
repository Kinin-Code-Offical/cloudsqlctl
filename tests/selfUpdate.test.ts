import { jest } from '@jest/globals';

jest.unstable_mockModule('axios', () => ({
    default: {
        get: jest.fn(async () => ({}))
    }
}));

jest.unstable_mockModule('fs-extra', () => ({
    default: {
        ensureDir: jest.fn(),
        createWriteStream: jest.fn(),
        createReadStream: jest.fn(),
        writeFile: jest.fn(),
        existsSync: jest.fn(() => false),
        pathExists: jest.fn(async () => false),
        readFileSync: jest.fn()
    }
}));

jest.unstable_mockModule('execa', () => ({
    execa: jest.fn()
}));

const { checkForUpdates, pickAsset } = await import('../src/core/selfUpdate.js');
const axios = (await import('axios')).default;

describe('Self Update Module', () => {
    const mockRelease = {
        tag_name: 'v1.0.0',
        assets: [
            { name: 'cloudsqlctl.exe', browser_download_url: 'http://example.com/exe' },
            { name: 'cloudsqlctl-setup.exe', browser_download_url: 'http://example.com/setup' },
            { name: 'SHA256SUMS.txt', browser_download_url: 'http://example.com/sums' }
        ],
        body: 'Release notes'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should detect update available', async () => {
        (axios.get as jest.Mock).mockImplementation(async () => ({ data: mockRelease }));

        const status = await checkForUpdates('0.9.0');
        expect(status.updateAvailable).toBe(true);
        expect(status.latestVersion).toBe('v1.0.0');
    });

    it('should detect no update available', async () => {
        (axios.get as jest.Mock).mockImplementation(async () => ({ data: mockRelease }));

        const status = await checkForUpdates('1.0.0');
        expect(status.updateAvailable).toBe(false);
    });

    it('should pick correct asset for installer mode', () => {
        const asset = pickAsset(mockRelease, 'installer');
        expect(asset.name).toBe('cloudsqlctl-setup.exe');
    });

    it('should pick correct asset for portable mode', () => {
        const asset = pickAsset(mockRelease, 'exe');
        expect(asset.name).toBe('cloudsqlctl.exe');
    });
});
