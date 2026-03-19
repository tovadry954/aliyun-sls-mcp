import { z } from 'zod';
import { getLogHistogram, parseTimeRange, formatTimestamp } from '../sls-client.js';

export const getLogHistogramSchema = z.object({
  project: z.string().describe('SLS project name'),
  logstore: z.string().describe('SLS logstore name'),
  query: z.string().default('*').describe('SLS query statement to filter logs. Default: "*" for all logs'),
  time_range: z
    .string()
    .default('1h')
    .describe('Relative time range. Formats: 15m, 1h, 6h, 12h, 1d, 3d'),
  from: z.number().optional().describe('Start time as Unix timestamp (seconds). Overrides time_range.'),
  to: z.number().optional().describe('End time as Unix timestamp (seconds).'),
  region: z
    .string()
    .optional()
    .describe('Alibaba Cloud region ID, e.g. cn-hangzhou. Defaults to SLS_REGION env variable.'),
});

export type GetLogHistogramInput = z.infer<typeof getLogHistogramSchema>;

function renderBar(count: number, maxCount: number, width = 30): string {
  if (maxCount === 0) return '░'.repeat(width);
  const filled = Math.round((count / maxCount) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export async function handleGetLogHistogram(input: GetLogHistogramInput): Promise<string> {
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

  const histograms = await getLogHistogram({
    project: input.project,
    logstore: input.logstore,
    query: input.query,
    from,
    to,
    region: input.region,
  });

  const fromStr = formatTimestamp(from);
  const toStr = formatTimestamp(to);
  const totalCount = histograms.reduce((sum, h) => sum + h.count, 0);
  const maxCount = Math.max(...histograms.map((h) => h.count), 1);

  const header = [
    `## Log Distribution`,
    `**Project**: ${input.project} / **Logstore**: ${input.logstore}`,
    `**Time**: ${fromStr} → ${toStr}`,
    `**Query**: \`${input.query}\``,
    `**Total Logs**: ${totalCount}`,
  ].join('\n');

  if (histograms.length === 0) {
    return `${header}\n\nNo data in this time range.`;
  }

  const rows = histograms
    .filter((h) => h.count > 0)
    .map((h) => {
      const timeStr = formatTimestamp(h.from);
      const bar = renderBar(h.count, maxCount);
      return `${timeStr}  ${bar}  ${h.count}`;
    })
    .join('\n');

  return `${header}\n\n\`\`\`\n${rows}\n\`\`\`\n\nUse this distribution to identify time windows with unusual activity, then query specific windows for detailed logs.`;
}
