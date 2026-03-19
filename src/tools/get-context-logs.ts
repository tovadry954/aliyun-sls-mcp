import { z } from 'zod';
import { getContextLogs, formatTimestamp, LogEntry } from '../sls-client.js';

export const getContextLogsSchema = z.object({
  project: z.string().describe('SLS project name'),
  logstore: z.string().describe('SLS logstore name'),
  pack_id: z
    .string()
    .describe(
      'The pack_id of the target log entry. Found in the __tag__:__pack_id__ field of any log. Example: "7FDBA9CB41D1D6F93C49A936ADF9C8FC-1B54"'
    ),
  pack_meta: z
    .string()
    .describe(
      'The pack_meta (unique context identifier) of the target log entry within the log group. Found in the __tag__:__pack_meta__ field. Example: "0|MTY1NTcwNTUzODY5MTY0MDk1Mg==|3|0"'
    ),
  back_lines: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .describe('Number of log lines before the target log (default: 10, max: 100)'),
  forward_lines: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .describe('Number of log lines after the target log (default: 10, max: 100)'),
  region: z
    .string()
    .optional()
    .describe('Alibaba Cloud region ID, e.g. cn-hangzhou. Defaults to SLS_REGION env variable.'),
});

export type GetContextLogsInput = z.infer<typeof getContextLogsSchema>;

function formatLogEntry(log: LogEntry, label: string): string {
  const timestamp = log['__time__']
    ? formatTimestamp(parseInt(log['__time__'], 10))
    : 'unknown';

  const fields = Object.entries(log)
    .filter(([k]) => !k.startsWith('__'))
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  return `${label} ${timestamp}\n${fields}`;
}

export async function handleGetContextLogs(input: GetContextLogsInput): Promise<string> {
  const result = await getContextLogs({
    project: input.project,
    logstore: input.logstore,
    packId: input.pack_id,
    packMeta: input.pack_meta,
    backLines: input.back_lines,
    forwardLines: input.forward_lines,
    region: input.region,
  });

  const header = [
    `## Context Logs`,
    `**Project**: ${input.project} / **Logstore**: ${input.logstore}`,
    `**Pack ID**: ${input.pack_id}`,
    `**Context**: ${result.backCount} before + ${result.forwardCount} after`,
  ].join('\n');

  if (result.logs.length === 0) {
    return `${header}\n\nNo context logs found.`;
  }

  const targetIndex = result.backCount;

  const entries = result.logs.map((log, i) => {
    let label: string;
    if (i < targetIndex) label = `[↑ before ${targetIndex - i}]`;
    else if (i === targetIndex) label = `[★ TARGET]`;
    else label = `[↓ after ${i - targetIndex}]`;
    return formatLogEntry(log, label);
  });

  return `${header}\n\n${entries.join('\n\n---\n\n')}`;
}
