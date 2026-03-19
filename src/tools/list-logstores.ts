import { z } from 'zod';
import { listLogStores } from '../sls-client.js';

export const listLogStoresSchema = z.object({
  project: z.string().describe('SLS project name'),
  region: z
    .string()
    .optional()
    .describe('Alibaba Cloud region ID, e.g. cn-hangzhou. Defaults to SLS_REGION env variable.'),
});

export type ListLogStoresInput = z.infer<typeof listLogStoresSchema>;

export async function handleListLogStores(input: ListLogStoresInput): Promise<string> {
  const logstores = await listLogStores(input.project, input.region);

  if (logstores.length === 0) {
    return `No logstores found in project: ${input.project}`;
  }

  const lines = logstores.map((l) => `- **${l.logstoreName}**`);

  return [
    `Found **${logstores.length}** logstores in project **${input.project}**:\n`,
    lines.join('\n'),
    '\nUse `query_logs` to query log data from a logstore.',
  ].join('\n');
}
