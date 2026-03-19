import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// alicloud SDKs are CJS, must use require() in ESM context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SlsClient: any = require('@alicloud/sls20201230/dist/client.js').default;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SlsModels: any = require('@alicloud/sls20201230/dist/models/model.js');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { $OpenApiUtil } = require('@alicloud/openapi-core/dist/client.js') as any;

export interface SlsConfig {
  accessKeyId: string;
  accessKeySecret: string;
  region: string;
  network?: 'public' | 'vpc';
}

export interface LogEntry {
  [key: string]: string;
}

export interface QueryLogsResult {
  logs: LogEntry[];
  count: number;
  processedRows?: number;
  hasMore: boolean;
  progress?: string;
}

export interface LogHistogram {
  from: number;
  to: number;
  count: number;
  progress: string;
}

export interface ContextLogsResult {
  logs: LogEntry[];
  backCount: number;
  forwardCount: number;
}

function buildEndpoint(region: string, network: 'public' | 'vpc' = 'public'): string {
  if (network === 'vpc') {
    return `${region}-intranet.log.aliyuncs.com`;
  }
  return `${region}.log.aliyuncs.com`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildClient(slsConfig: SlsConfig): any {
  const endpoint = buildEndpoint(slsConfig.region, slsConfig.network);
  const config = new $OpenApiUtil.Config({
    accessKeyId: slsConfig.accessKeyId,
    accessKeySecret: slsConfig.accessKeySecret,
    endpoint,
  });
  return new SlsClient(config);
}

function getConfigFromEnv(): SlsConfig {
  const accessKeyId = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;

  if (!accessKeyId || !accessKeySecret) {
    throw new Error(
      'Missing required environment variables: ALIBABA_CLOUD_ACCESS_KEY_ID and ALIBABA_CLOUD_ACCESS_KEY_SECRET'
    );
  }

  return {
    accessKeyId,
    accessKeySecret,
    region: process.env.SLS_REGION || 'cn-hangzhou',
    network: (process.env.SLS_NETWORK as 'public' | 'vpc') || 'public',
  };
}

export async function listProjects(
  region?: string
): Promise<{ projectName: string; description: string; region: string }[]> {
  const baseConfig = getConfigFromEnv();
  const targetRegion = region || baseConfig.region;
  const client = buildClient({ ...baseConfig, region: targetRegion });

  const result: { projectName: string; description: string; region: string }[] = [];
  let offset = 0;
  const size = 100;

  while (true) {
    const resp = await client.listProject(new SlsModels.ListProjectRequest({ offset, size }));
    const projects: { projectName?: string; description?: string }[] = resp.body?.projects || [];

    for (const p of projects) {
      result.push({
        projectName: p.projectName || '',
        description: p.description || '',
        region: targetRegion,
      });
    }

    const total: number = resp.body?.count || 0;
    offset += projects.length;

    if (offset >= total || projects.length === 0) break;
  }

  return result;
}

export async function listLogStores(
  project: string,
  region?: string
): Promise<{ logstoreName: string }[]> {
  const baseConfig = getConfigFromEnv();
  const targetRegion = region || baseConfig.region;
  const client = buildClient({ ...baseConfig, region: targetRegion });

  const result: { logstoreName: string }[] = [];
  let offset = 0;
  const size = 100;

  while (true) {
    const resp = await client.listLogStores(project, new SlsModels.ListLogStoresRequest({ offset, size }));
    const logstores: string[] = resp.body?.logstores || [];

    for (const name of logstores) {
      result.push({ logstoreName: name });
    }

    const total: number = resp.body?.total || 0;
    offset += logstores.length;

    if (offset >= total || logstores.length === 0) break;
  }

  return result;
}

export async function queryLogs(params: {
  project: string;
  logstore: string;
  query: string;
  from: number;
  to: number;
  maxLogs?: number;
  region?: string;
}): Promise<QueryLogsResult> {
  const { project, logstore, query, from, to, maxLogs = 100, region } = params;
  const baseConfig = getConfigFromEnv();
  const targetRegion = region || baseConfig.region;
  const client = buildClient({ ...baseConfig, region: targetRegion });

  const allLogs: LogEntry[] = [];
  const pageSize = Math.min(100, maxLogs);
  let offset = 0;
  let totalCount = 0;
  let progress = 'Complete';

  while (allLogs.length < maxLogs) {
    const resp = await client.getLogs(project, logstore, new SlsModels.GetLogsRequest({
      query,
      from,
      to,
      line: pageSize,
      offset,
      reverse: false,
      powerSql: false,
    }));

    const logs: LogEntry[] = (resp.body || []) as LogEntry[];
    allLogs.push(...logs);

    progress = resp.headers?.['x-log-query-info'] || 'Complete';
    totalCount = parseInt(resp.headers?.['x-log-count'] || String(allLogs.length), 10);

    if (logs.length < pageSize || allLogs.length >= maxLogs) {
      break;
    }

    offset += pageSize;
    await new Promise((r) => setTimeout(r, 50));
  }

  return {
    logs: allLogs.slice(0, maxLogs),
    count: totalCount,
    hasMore: totalCount > maxLogs,
    progress,
  };
}

export async function queryLogsBySQL(params: {
  project: string;
  query: string;
  from: number;
  to: number;
  region?: string;
}): Promise<QueryLogsResult> {
  const { project, query, from, to, region } = params;
  const baseConfig = getConfigFromEnv();
  const targetRegion = region || baseConfig.region;
  const client = buildClient({ ...baseConfig, region: targetRegion });

  const resp = await client.getProjectLogs(project, new SlsModels.GetProjectLogsRequest({
    query,
    from,
    to,
    powerSql: false,
  }));

  const logs: LogEntry[] = (resp.body || []) as LogEntry[];
  const processedRows = parseInt(resp.headers?.['x-log-processed-rows'] || '0', 10);
  const progress = resp.headers?.['x-log-query-info'] || 'Complete';

  return {
    logs,
    count: logs.length,
    processedRows,
    hasMore: false,
    progress,
  };
}

export async function getLogHistogram(params: {
  project: string;
  logstore: string;
  query: string;
  from: number;
  to: number;
  region?: string;
}): Promise<LogHistogram[]> {
  const { project, logstore, query, from, to, region } = params;
  const baseConfig = getConfigFromEnv();
  const targetRegion = region || baseConfig.region;
  const client = buildClient({ ...baseConfig, region: targetRegion });

  const resp = await client.getHistograms(project, logstore, new SlsModels.GetHistogramsRequest({
    query,
    from,
    to,
  }));

  const histograms: { from?: number; to?: number; count?: number; progress?: string }[] =
    resp.body || [];

  return histograms.map((h) => ({
    from: h.from || 0,
    to: h.to || 0,
    count: h.count || 0,
    progress: h.progress || 'Complete',
  }));
}

export async function getContextLogs(params: {
  project: string;
  logstore: string;
  packId: string;
  packMeta: string;
  backLines?: number;
  forwardLines?: number;
  region?: string;
}): Promise<ContextLogsResult> {
  const { project, logstore, packId, packMeta, backLines = 10, forwardLines = 10, region } =
    params;
  const baseConfig = getConfigFromEnv();
  const targetRegion = region || baseConfig.region;
  const client = buildClient({ ...baseConfig, region: targetRegion });

  const resp = await client.getContextLogs(project, logstore, new SlsModels.GetContextLogsRequest({
    packId,
    packMeta,
    backLines,
    forwardLines,
  }));

  const logs: LogEntry[] = (resp.body?.logs || []) as LogEntry[];

  return {
    logs,
    backCount: resp.body?.backLines || 0,
    forwardCount: resp.body?.forwardLines || 0,
  };
}

export function parseTimeRange(timeStr: string): { from: number; to: number } {
  const now = Math.floor(Date.now() / 1000);
  const match = timeStr.match(/^(\d+)([mhd])$/);

  if (!match) {
    throw new Error(
      `Invalid time_range format: "${timeStr}". Supported formats: 15m, 1h, 6h, 1d, 3d`
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  let seconds = 0;
  if (unit === 'm') seconds = value * 60;
  else if (unit === 'h') seconds = value * 3600;
  else if (unit === 'd') seconds = value * 86400;

  if (seconds > 7 * 86400) {
    throw new Error('Maximum time range is 7 days');
  }

  return { from: now - seconds, to: now };
}

export function formatTimestamp(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}
