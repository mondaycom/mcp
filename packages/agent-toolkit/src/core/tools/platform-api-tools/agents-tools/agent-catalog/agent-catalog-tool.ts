import { z } from 'zod';
import {
  CreateAgentSkillMutation,
  CreateAgentSkillMutationVariables,
  GetAgentSkillsCatalogQuery,
  GetAgentTriggersCatalogQuery,
  GetAgentTriggersCatalogQueryVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { createAgentSkillMutation, getAgentSkillsCatalogQuery, getAgentTriggersCatalogQuery } from '../shared/agents.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const agentCatalogToolSchema = {
  action: z
    .enum(['list_triggers', 'list_skills', 'create_skill'])
    .describe(
      '"list_triggers" — fetch available trigger types with block_reference_id, field_schemas, and required_fields. Call before using manage_agent_capabilities action:"add_trigger". "list_skills" — fetch available skills with id, name, description. Call before using manage_agent_capabilities action:"add_skill". "create_skill" — author a new custom skill in the account-wide catalog.',
    ),
  block_reference_ids: z
    .array(z.string())
    .min(1)
    .optional()
    .describe(
      'Used with action:"list_triggers". Fetch specific trigger types by block_reference_id instead of the full catalog. Omit to return all trigger types.',
    ),
  name: z.string().trim().min(1).optional().describe('Required for action:"create_skill". Display name of the new skill.'),
  content: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Required for action:"create_skill". Markdown instructions defining what the skill does and how to execute it. This is the skill\'s runtime behavior — be specific and thorough.',
    ),
  description: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Used with action:"create_skill". Short description shown in the catalog.'),
};

export class AgentCatalogTool extends BaseMondayApiTool<typeof agentCatalogToolSchema> {
  name = 'agent_catalog';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'monday Platform Agent Catalog',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Browse and extend the account-wide catalog of available triggers and skills for monday platform agents.

This is the discovery and authoring tool — no agent_id required. Use it before wiring capabilities to a specific agent.

NOTE: list_triggers and list_skills are read-only operations, but this tool is classified as WRITE because it also creates skills. In deployments with readOnlyMode enabled, catalog browsing is therefore unavailable.

ACTIONS:
- list_triggers:  { block_reference_ids? } — returns available trigger types. Use before manage_agent_capabilities action:"add_trigger".
  Each entry has block_reference_id (required for add_trigger), name, description,
  field_schemas (describes field_values to pass when adding), and required_fields (fields to collect from the user).
  Note: only triggers that can be added programmatically appear here. OAuth/3rd-party triggers require user setup in the monday.com UI.

- list_skills: {} — returns available skills with id, name, description. Use before manage_agent_capabilities action:"add_skill".
  Never guess or invent a skill id — always look it up here.

- create_skill: { name, content, description? } — creates a new custom skill in the catalog.
  The skill becomes available to all agents in the account. After creating, use manage_agent_capabilities action:"add_skill" with the returned id to attach it to an agent.

WORKFLOW:
1. Call action:"list_triggers" or action:"list_skills" to browse what's available.
2. If no suitable skill exists, call action:"create_skill" to author one.
3. Then call manage_agent_capabilities to attach the trigger or skill to an agent.

USAGE EXAMPLES:
- List all trigger types:    { "action": "list_triggers" }
- Fetch specific trigger:    { "action": "list_triggers", "block_reference_ids": ["some-block-ref-id"] }
- List all skills:           { "action": "list_skills" }
- Create a skill:            { "action": "create_skill", "name": "Send Slack Message", "content": "## Instructions\\nPost a message to a Slack channel.", "description": "Sends a message to Slack" }`;
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
      case 'create_skill':
        return this.handleCreateSkill(input);
    }
  }

  private async handleListTriggers(input: ToolInputType<typeof agentCatalogToolSchema>): Promise<ToolOutputType<never>> {
    try {
      const variables: GetAgentTriggersCatalogQueryVariables = { block_reference_ids: input.block_reference_ids };
      const res = await this.mondayApi.request<GetAgentTriggersCatalogQuery>(getAgentTriggersCatalogQuery, variables, { versionOverride: 'dev' });
      const catalog = res.agent_triggers_catalog ?? [];
      return {
        content: {
          message: 'Available trigger types. Use block_reference_id and inspect field_schemas/required_fields before calling manage_agent_capabilities action:"add_trigger".',
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
          message: 'Available skills. Use id when calling manage_agent_capabilities action:"add_skill".',
          count: catalog.length,
          skills: catalog,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'fetch monday platform agent skills catalog');
    }
  }

  private async handleCreateSkill(input: ToolInputType<typeof agentCatalogToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.name || !input.content) {
      throw new Error('action:"create_skill" requires both "name" and "content".');
    }
    try {
      const variables: CreateAgentSkillMutationVariables = {
        name: input.name,
        content: input.content,
        description: input.description,
      };
      const res = await this.mondayApi.request<CreateAgentSkillMutation>(createAgentSkillMutation, variables, { versionOverride: 'dev' });
      if (!res.create_agent_skill) {
        throw new Error('create_agent_skill returned no data');
      }
      return {
        content: {
          message: 'Skill created and added to the catalog. Use the returned id with manage_agent_capabilities action:"add_skill" to attach it to an agent.',
          skill: res.create_agent_skill,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'create monday platform agent skill');
    }
  }
}
