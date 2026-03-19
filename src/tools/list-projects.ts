import { z } from 'zod';
import { listProjects } from '../sls-client.js';

export const listProjectsSchema = z.object({
  region: z
    .string()
    .optional()
    .describe(
      'Alibaba Cloud region ID, e.g. cn-hangzhou, cn-shanghai, cn-shenzhen, cn-beijing, ap-southeast-1. Defaults to SLS_REGION env variable.'
    ),
});

export type ListProjectsInput = z.infer<typeof listProjectsSchema>;

export async function handleListProjects(input: ListProjectsInput): Promise<string> {
  const projects = await listProjects(input.region);

  if (projects.length === 0) {
    return `No SLS projects found in region: ${input.region || 'default'}`;
  }

  const lines = projects.map(
    (p) => `- **${p.projectName}** (${p.region})${p.description ? `\n  ${p.description}` : ''}`
  );

  return [
    `Found **${projects.length}** SLS projects in region **${input.region || 'default'}**:\n`,
    lines.join('\n'),
    '\nUse `list_logstores` to see logstores within a project.',
  ].join('\n');
}
