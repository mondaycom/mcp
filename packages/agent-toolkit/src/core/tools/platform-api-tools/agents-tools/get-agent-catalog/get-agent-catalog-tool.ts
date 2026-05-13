import { z } from 'zod';
import {
  GetAgentTriggersCatalogQuery,
  GetAgentTriggersCatalogQueryVariables,
  GetAgentSkillsCatalogQuery,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { getAgentTriggersCatalogQuery, getAgentSkillsCatalogQuery } from './get-agent-catalog.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const getAgentCatalogToolSchema = {
  type: z
    .enum(['triggers', 'skills'])
    .describe(
      'Which catalog to fetch. "triggers" returns available trigger types with block_reference_id, field_schemas, and required_fields — use before calling manage_agent_triggers with action:add. "skills" returns available skills with id — use before calling manage_agent_skills.',
    ),
  block_reference_ids: z
    .array(z.string())
    .optional()
    .describe(
      'Only applies when type is "triggers". Fetch specific entries by block_reference_id instead of the full catalog. Omit to return all trigger types.',
    ),
};

export class GetAgentCatalogTool extends BaseMondayApiTool<typeof getAgentCatalogToolSchema> {
  name = 'get_agent_catalog';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get monday Platform Agent Catalog',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Fetch the account-wide catalog of available trigger types or skills for monday platform agents.

ALWAYS call this tool first before adding a trigger or skill to an agent:
- type:"triggers" — returns entries with block_reference_id (required for manage_agent_triggers action:add), name, description, field_schemas (describes the field_values shape to pass when adding — e.g. { board_id: "<ID>" }), and required_fields (fields the user must supply before you can call add).
- type:"skills" — returns entries with id (required for manage_agent_skills), name, description.

Never guess or invent a block_reference_id or skill id — always look them up here first.

USAGE EXAMPLES:
- List all trigger types: { "type": "triggers" }
- Fetch a specific trigger type: { "type": "triggers", "block_reference_ids": ["some-block-ref-id"] }
- List all skills: { "type": "skills" }`;
  }

  getInputSchema() {
    return getAgentCatalogToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getAgentCatalogToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (input.type === 'triggers') {
      try {
        const variables: GetAgentTriggersCatalogQueryVariables = {
          block_reference_ids: input.block_reference_ids,
        };
        const res = await this.mondayApi.request<GetAgentTriggersCatalogQuery>(
          getAgentTriggersCatalogQuery,
          variables,
          { versionOverride: 'dev' },
        );
        const catalog = res.agent_triggers_catalog ?? [];
        return {
          content: {
            message:
              'Available trigger types for monday platform agents. Use block_reference_id and inspect field_schemas/required_fields before calling manage_agent_triggers with action:add.',
            count: catalog.length,
            triggers: catalog,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'fetch monday platform agent triggers catalog');
      }
    }

    try {
      const res = await this.mondayApi.request<GetAgentSkillsCatalogQuery>(
        getAgentSkillsCatalogQuery,
        {},
        { versionOverride: 'dev' },
      );
      const catalog = res.agent_skills_catalog ?? [];
      return {
        content: {
          message: 'Available skills for monday platform agents. Use id when calling manage_agent_skills.',
          count: catalog.length,
          skills: catalog,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'fetch monday platform agent skills catalog');
    }
  }
}
