import { z } from 'zod';
import {
  GetAgentSkillsCatalogQuery,
  GetAgentTriggersCatalogQuery,
  GetAgentTriggersCatalogQueryVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { getAgentSkillsCatalogQuery, getAgentTriggersCatalogQuery } from '../shared/agents.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const agentCatalogToolSchema = {
  action: z
    .enum(['list_triggers', 'list_skills'])
    .describe(
      '"list_triggers" — fetch available trigger types with block_reference_id, field_schemas, and required_fields. Call before using manage_agent_triggers action:"add". "list_skills" — fetch available skills with id, name, description. Call before using manage_agent_skills action:"add".',
    ),
  block_reference_ids: z
    .array(z.string())
    .min(1)
    .optional()
    .describe('Used with action:"list_triggers". Fetch specific trigger types by block_reference_id. Omit to return all trigger types.'),
};

export class AgentCatalogTool extends BaseMondayApiTool<typeof agentCatalogToolSchema> {
  name = 'agent_catalog';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'monday Platform Agent Catalog',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Browse the account-wide catalog of available trigger types and skills for monday platform agents. READ-ONLY — no agent_id required.

Use this tool to discover what's available BEFORE wiring anything to a specific agent.

ACTIONS:
- list_triggers: { block_reference_ids? } — returns available trigger types.
  Each entry has block_reference_id (required for manage_agent_triggers action:"add"), name, description,
  field_schemas (describes field_values shape), and required_fields (fields to collect from the user).
  Note: only triggers that can be added programmatically appear here. OAuth/3rd-party triggers (Slack, Gmail, Salesforce, etc.)
  require user setup in the monday.com UI and will not appear here.

- list_skills: {} — returns available skills with id, name, description.
  Never guess or invent a skill id — always look it up here before calling manage_agent_skills action:"add".

USAGE EXAMPLES:
- List all trigger types:    { "action": "list_triggers" }
- Fetch specific trigger:    { "action": "list_triggers", "block_reference_ids": ["some-block-ref-id"] }
- List all skills:           { "action": "list_skills" }

RELATED TOOLS:
- manage_agent_triggers — use block_reference_id from list_triggers to attach a trigger to a specific agent
- manage_agent_skills — use skill id from list_skills, or action:"create" to author a new skill, then attach to an agent
- manage_agent — manage the agent entity itself (create, update, delete, activate, etc.)`;
  }

  getInputSchema() {
    return agentCatalogToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof agentCatalogToolSchema>): Promise<ToolOutputType<never>> {
    switch (input.action) {
      case 'list_triggers':
        return this.handleListTriggers(input);
      case 'list_skills':
        return this.handleListSkills();
    }
  }

  private async handleListTriggers(input: ToolInputType<typeof agentCatalogToolSchema>): Promise<ToolOutputType<never>> {
    try {
      const variables: GetAgentTriggersCatalogQueryVariables = { block_reference_ids: input.block_reference_ids };
      const res = await this.mondayApi.request<GetAgentTriggersCatalogQuery>(getAgentTriggersCatalogQuery, variables, { versionOverride: 'dev' });
      const catalog = res.agent_triggers_catalog ?? [];
      return {
        content: {
          message: 'Available trigger types. Use block_reference_id and inspect field_schemas/required_fields before calling manage_agent_triggers action:"add".',
          count: catalog.length,
          triggers: catalog,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'fetch monday platform agent triggers catalog');
    }
  }

  private async handleListSkills(): Promise<ToolOutputType<never>> {
    try {
      const res = await this.mondayApi.request<GetAgentSkillsCatalogQuery>(getAgentSkillsCatalogQuery, {}, { versionOverride: 'dev' });
      const catalog = res.agent_skills_catalog ?? [];
      return {
        content: {
          message: 'Available skills. Use id when calling manage_agent_skills action:"add".',
          count: catalog.length,
          skills: catalog,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'fetch monday platform agent skills catalog');
    }
  }
}
