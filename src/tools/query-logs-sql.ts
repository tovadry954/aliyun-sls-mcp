import { z } from 'zod';
import { queryLogsBySQL, parseTimeRange, formatTimestamp, LogEntry } from '../sls-client.js';

export const queryLogsSQLSchema = z.object({
  project: z.string().describe('SLS project name'),
  query: z
    .string()
    .describe(
      'SQL query with mandatory time range. Must include FROM clause with logstore and time filter using __date__ or __time__. Example: "SELECT status, count(*) as cnt FROM <logstore> WHERE __date__ > \'2024-01-01 00:00:00\' GROUP BY status ORDER BY cnt DESC"'
    ),
  time_range: z
    .string()
    .default('1h')
    .describe('Relative time range used to fill __time__ filter. Formats: 15m, 1h, 6h, 1d'),
  from: z.number().optional().describe('Start time as Unix timestamp (seconds). Overrides time_range.'),
  to: z.number().optional().describe('End time as Unix timestamp (seconds).'),
  region: z
    .string()
    .optional()
    .describe('Alibaba Cloud region ID, e.g. cn-hangzhou. Defaults to SLS_REGION env variable.'),
});

export type QueryLogsSQLInput = z.infer<typeof queryLogsSQLSchema>;

function formatRow(row: LogEntry): string {
  return Object.entries(row)
    .filter(([k]) => !k.startsWith('__'))
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ');
}

export async function handleQueryLogsSQL(input: QueryLogsSQLInput): Promise<string> {
  let from: number;
  let to: number;

  if (input.from && input.to) {
    from = input.from;
    to = input.to;
  } else {
    const range = parseTimeRange(input.time_range);
    from = range.from;
    to = range.to;
  }

  const result = await queryLogsBySQL({
    project: input.project,
    query: input.query,
    from,
    to,
    region: input.region,
  });

  const fromStr = formatTimestamp(from);
  const toStr = formatTimestamp(to);

  const header = [
    `## SLS SQL Query Results`,
    `**Project**: ${input.project}`,
    `**Time**: ${fromStr} → ${toStr}`,
    `**Query**: \`${input.query}\``,
    `**Rows**: ${result.logs.length}${result.processedRows ? ` (processed ${result.processedRows} rows)` : ''}`,
  ].join('\n');

  if (result.logs.length === 0) {
    return `${header}\n\nNo results returned.`;
  }

  const rows = result.logs.map((row, i) => `[${i + 1}] ${formatRow(row)}`).join('\n');

  return `${header}\n\n${rows}`;
}
