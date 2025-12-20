import { listInstances } from '../src/core/gcloud.js';
import { execa } from 'execa';

jest.mock('execa');

describe('Gcloud Module', () => {
    it('should list instances', async () => {
        const mockInstances = [
            {
                connectionName: 'project:region:instance',
                name: 'instance',
                region: 'region',
                project: 'project',
                databaseVersion: 'POSTGRES_13',
                state: 'RUNNABLE'
            }
        ];

        (execa as any).mockResolvedValue({
            stdout: JSON.stringify(mockInstances)
        });

        const instances = await listInstances();
        expect(instances).toEqual(mockInstances);
        expect(execa).toHaveBeenCalledWith('gcloud', ['sql', 'instances', 'list', '--format=json']);
    });

    it('should throw error if gcloud fails', async () => {
        (execa as any).mockRejectedValue(new Error('gcloud failed'));
        await expect(listInstances()).rejects.toThrow('gcloud failed');
    });
});
