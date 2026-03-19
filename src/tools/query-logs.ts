import { z } from 'zod';
import { queryLogs, parseTimeRange, formatTimestamp, LogEntry } from '../sls-client.js';

export const queryLogsSchema = z.object({
  project: z.string().describe('SLS project name'),
  logstore: z.string().describe('SLS logstore name'),
  query: z
    .string()
    .default('*')
    .describe(
      'SLS query statement. Examples: "*" for all logs, "level: ERROR", "content: timeout", "level: ERROR AND status: 500"'
    ),
  time_range: z
    .string()
    .default('15m')
    .describe('Relative time range. Formats: 1m, 5m, 15m, 30m, 1h, 2h, 6h, 12h, 1d, 3d, 7d'),
  from: z
    .number()
    .optional()
    .describe('Start time as Unix timestamp (seconds). Overrides time_range if provided.'),
  to: z
    .number()
    .optional()
    .describe('End time as Unix timestamp (seconds). Used with from parameter.'),
  max_logs: z
    .number()
    .min(1)
    .max(500)
    .default(50)
    .describe('Maximum number of logs to return (1-500). Default: 50'),
  region: z
    .string()
    .optional()
    .describe('Alibaba Cloud region ID, e.g. cn-hangzhou. Defaults to SLS_REGION env variable.'),
});

export type QueryLogsInput = z.infer<typeof queryLogsSchema>;

function formatLogEntry(log: LogEntry, index: number): string {
  const timestamp = log['__time__']
    ? formatTimestamp(parseInt(log['__time__'], 10))
    : 'unknown time';

  const lines: string[] = [`[${index + 1}] ${timestamp}`];

  const priorityFields = ['level', 'severity', 'content', 'message', 'msg', 'error', 'caller', 'trace_id', 'span_id', 'request_id'];
  const systemFields = new Set(['__time__', '__source__', '__tag__:__path__', '__topic__']);

  for (const field of priorityFields) {
    if (log[field] !== undefined) {
      lines.push(`  ${field}: ${log[field]}`);
    }
  }

  for (const [key, value] of Object.entries(log)) {
    if (!systemFields.has(key) && !priorityFields.includes(key)) {
      lines.push(`  ${key}: ${value}`);
    }
  }

  return lines.join('\n');
}

export async function handleQueryLogs(input: QueryLogsInput): Promise<string> {
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

  const result = await queryLogs({
    project: input.project,
    logstore: input.logstore,
    query: input.query,
    from,
    to,
    maxLogs: input.max_logs,
    region: input.region,
  });

  const fromStr = formatTimestamp(from);
  const toStr = formatTimestamp(to);

  const header = [
    `## SLS Query Results`,
    `**Project**: ${input.project} / **Logstore**: ${input.logstore}`,
    `**Time**: ${fromStr} → ${toStr}`,
    `**Query**: \`${input.query}\``,
    `**Returned**: ${result.logs.length} logs${result.hasMore ? ` (more available, total count: ${result.count})` : ` / total: ${result.count}`}`,
  ].join('\n');

  if (result.logs.length === 0) {
    return `${header}\n\nNo logs found matching the query.`;
  }

  const logEntries = result.logs.map((log, i) => formatLogEntry(log, i)).join('\n\n---\n\n');

  const footer = result.hasMore
    ? `\n\n> **Note**: Results truncated at ${input.max_logs}. Increase \`max_logs\` or narrow the query/time range.`
    : '';

  return `${header}\n\n${logEntries}${footer}`;
}
