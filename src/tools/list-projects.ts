import { z } from 'zod';
import { listProjects, getConfiguredRegions } from '../sls-client.js';

export const listProjectsSchema = z.object({
  regions: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe(
      'One or more Alibaba Cloud region IDs to query. Accepts a single string (e.g. "cn-hangzhou") or an array (e.g. ["cn-hangzhou","cn-shenzhen"]). Defaults to all regions configured in SLS_REGIONS / SLS_REGION env variables.'
    ),
});

export type ListProjectsInput = z.infer<typeof listProjectsSchema>;

export async function handleListProjects(input: ListProjectsInput): Promise<string> {
  // Resolve target regions
  let targetRegions: string[];
  if (!input.regions || (Array.isArray(input.regions) && input.regions.length === 0)) {
    targetRegions = getConfiguredRegions();
  } else if (typeof input.regions === 'string') {
    targetRegions = [input.regions];
  } else {
    targetRegions = input.regions;
  }

  // Query all regions in parallel
  const results = await Promise.allSettled(
    targetRegions.map((region) => listProjects(region))
  );

  const allProjects: { projectName: string; description: string; region: string }[] = [];
  const errors: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      allProjects.push(...result.value);
    } else {
      errors.push(`${targetRegions[i]}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
    }
  }

  const lines: string[] = [];

  if (allProjects.length > 0) {
    // Group by region
    const byRegion = new Map<string, typeof allProjects>();
    for (const p of allProjects) {
      if (!byRegion.has(p.region)) byRegion.set(p.region, []);
      byRegion.get(p.region)!.push(p);
    }

    lines.push(`Found **${allProjects.length}** SLS projects across **${byRegion.size}** region(s):\n`);

    for (const [region, projects] of byRegion) {
      lines.push(`### ${region} (${projects.length} projects)`);
      for (const p of projects) {
        lines.push(`- **${p.projectName}**${p.description ? `  \n  ${p.description}` : ''}`);
      }
      lines.push('');
    }
  } else {
    lines.push('No SLS projects found.');
  }

  if (errors.length > 0) {
    lines.push(`\n**Errors in some regions:**`);
    for (const e of errors) {
      lines.push(`- ${e}`);
    }
  }

  lines.push('\nUse `list_logstores` to see logstores within a project.');

  return lines.join('\n');
}
