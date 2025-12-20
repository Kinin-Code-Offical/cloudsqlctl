import { Command } from 'commander';
import { listInstances } from '../core/gcloud.js';
import { logger } from '../core/logger.js';

export const listCommand = new Command('list')
    .description('List available Cloud SQL instances')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
        try {
            const instances = await listInstances();
            
            if (options.json) {
                console.log(JSON.stringify(instances, null, 2));
                return;
            }

            if (instances.length === 0) {
                logger.info('No instances found.');
                return;
            }

            console.table(instances.map(i => ({
                Name: i.name,
                'Connection Name': i.connectionName,
                Region: i.region,
                State: i.state,
                Version: i.databaseVersion
            })));

        } catch (error) {
            logger.error('Failed to list instances', error);
            process.exit(1);
        }
    });
