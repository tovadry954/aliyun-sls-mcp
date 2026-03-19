#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { listProjectsSchema, handleListProjects } from './tools/list-projects.js';
import { listLogStoresSchema, handleListLogStores } from './tools/list-logstores.js';
import { queryLogsSchema, handleQueryLogs } from './tools/query-logs.js';
import { queryLogsSQLSchema, handleQueryLogsSQL } from './tools/query-logs-sql.js';
import { getLogHistogramSchema, handleGetLogHistogram } from './tools/get-log-histogram.js';
import { getContextLogsSchema, handleGetContextLogs } from './tools/get-context-logs.js';

const TOOLS: Tool[] = [
  {
    name: 'list_projects',
    description:
      'List all SLS projects in one or more Alibaba Cloud regions. Pass a single region string or an array of region IDs. If omitted, queries all regions configured in SLS_REGIONS / SLS_REGION env variables. Use this to discover available projects before querying logs.',
    inputSchema: zodToJsonSchema(listProjectsSchema) as Tool['inputSchema'],
  },
  {
    name: 'list_logstores',
    description:
      'List all logstores within an SLS project. Use this to discover available logstores before querying logs.',
    inputSchema: zodToJsonSchema(listLogStoresSchema) as Tool['inputSchema'],
  },
  {
    name: 'query_logs',
    description:
      'Query log data from an SLS logstore with a time range and optional filter query. Returns formatted log entries. Use for debugging, error investigation, and log analysis. Supports SLS query syntax like "level: ERROR", "content: timeout", "status: 500 AND method: POST".',
    inputSchema: zodToJsonSchema(queryLogsSchema) as Tool['inputSchema'],
  },
  {
    name: 'query_logs_sql',
    description:
      'Execute a SQL query against an SLS project for log analysis and aggregation. Best for counting, grouping, statistical analysis. Example: "SELECT status, count(*) as cnt FROM <logstore> WHERE __time__ > 1700000000 GROUP BY status".',
    inputSchema: zodToJsonSchema(queryLogsSQLSchema) as Tool['inputSchema'],
  },
  {
    name: 'get_log_histogram',
    description:
      'Get the time-series distribution of log counts matching a query. Returns a visual histogram showing log volume over time. Useful for identifying when errors spiked or when unusual activity occurred.',
    inputSchema: zodToJsonSchema(getLogHistogramSchema) as Tool['inputSchema'],
  },
  {
    name: 'get_context_logs',
    description:
      'Retrieve log lines before and after a specific log entry using its pack_id and pack_meta. First query logs with query_logs to find a log entry, then use its __tag__:__pack_id__ and __tag__:__pack_meta__ fields to get surrounding context. Useful for understanding full execution flow around an error.',
    inputSchema: zodToJsonSchema(getContextLogsSchema) as Tool['inputSchema'],
  },
];

const server = new Server(
  {
    name: 'aliyun-sls-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let text: string;

    switch (name) {
      case 'list_projects': {
        const input = listProjectsSchema.parse(args);
        text = await handleListProjects(input);
        break;
      }
      case 'list_logstores': {
        const input = listLogStoresSchema.parse(args);
        text = await handleListLogStores(input);
        break;
      }
      case 'query_logs': {
        const input = queryLogsSchema.parse(args);
        text = await handleQueryLogs(input);
        break;
      }
      case 'query_logs_sql': {
        const input = queryLogsSQLSchema.parse(args);
        text = await handleQueryLogsSQL(input);
        break;
      }
      case 'get_log_histogram': {
        const input = getLogHistogramSchema.parse(args);
        text = await handleGetLogHistogram(input);
        break;
      }
      case 'get_context_logs': {
        const input = getContextLogsSchema.parse(args);
        text = await handleGetContextLogs(input);
        break;
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('Aliyun SLS MCP Server running on stdio\n');
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
