import { z } from 'zod';
import {
  AddSkillToAgentMutation,
  AddSkillToAgentMutationVariables,
  AddTriggerToAgentMutation,
  AddTriggerToAgentMutationVariables,
  GetAgentActiveTriggersQuery,
  GetAgentActiveTriggersQueryVariables,
  RemoveSkillFromAgentMutation,
  RemoveSkillFromAgentMutationVariables,
  RemoveTriggerFromAgentMutation,
  RemoveTriggerFromAgentMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import {
  addSkillToAgentMutation,
  addTriggerToAgentMutation,
  getAgentActiveTriggersQuery,
  removeSkillFromAgentMutation,
  removeTriggerFromAgentMutation,
} from '../shared/agents.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const manageAgentCapabilitiesToolSchema = {
  action: z
    .enum(['list_triggers', 'add_trigger', 'remove_trigger', 'add_skill', 'remove_skill'])
    .describe(
      '"list_triggers" — returns all triggers currently attached to the agent (includes node_id needed for remove_trigger). "add_trigger" — attaches a new trigger by block_reference_id. "remove_trigger" — detaches a trigger instance by node_id. "add_skill" — attaches a skill to the agent. "remove_skill" — detaches a skill from the agent.',
    ),
  agent_id: z.string().trim().min(1, 'agent_id must be a non-empty string').describe('Unique identifier of the agent.'),
  block_reference_id: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Required for action:"add_trigger". The block_reference_id from agent_catalog (action:"list_triggers") identifying the trigger type to attach. Never guess this value — look it up in the catalog first.',
    ),
  field_values: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.object({ value: z.string(), label: z.string() }).passthrough()]))
    .optional()
    .describe(
      'Used with action:"add_trigger" when the trigger type has required_fields. Key/value object whose shape is described by field_schemas in the agent_catalog response. Scalar fields (e.g. { "board_id": "12345" }) use string/number/boolean values. Selection fields use { "value": "<id>", "label": "<name>" }.',
    ),
  node_id: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Required for action:"remove_trigger". The node_id of the trigger instance — get it from action:"list_triggers". Each instance has a unique node_id even if the same trigger type is attached multiple times. Do NOT pass block_reference_id here.',
    ),
  skill_id: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Required for action:"add_skill" and action:"remove_skill". The skill ID from agent_catalog (action:"list_skills") or the id returned by agent_catalog (action:"create_skill"). Never guess or invent a skill ID.',
    ),
};

export class ManageAgentCapabilitiesTool extends BaseMondayApiTool<typeof manageAgentCapabilitiesToolSchema> {
  name = 'manage_agent_capabilities';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Manage monday Platform Agent Capabilities',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Manage the behavioral capabilities of a monday platform agent — triggers (when it runs) and skills (what it can do).

TRIGGERS define when an agent runs automatically. Note: the catalog only includes triggers that can be added programmatically. OAuth/3rd-party triggers (Slack, Gmail, Salesforce, etc.) require user setup in the monday.com UI and will not appear in agent_catalog.

SKILLS extend what an agent can do — e.g. sending emails, querying databases. Use agent_catalog to browse or create skills before attaching them.

ACTIONS:
- list_triggers: { agent_id } — returns active triggers with node_id, name, field_summary.
- add_trigger:   { agent_id, block_reference_id, field_values? } — attaches a trigger type. Call agent_catalog with action:"list_triggers" first to find block_reference_id and required field_values.
- remove_trigger:{ agent_id, node_id } — detaches a trigger instance. Use node_id from list_triggers (NOT block_reference_id).
- add_skill:     { agent_id, skill_id } — attaches a skill. Get skill_id from agent_catalog action:"list_skills" or action:"create_skill".
- remove_skill:  { agent_id, skill_id } — detaches a skill from the agent.

NOTE: There is no action to list which skills are currently attached to a specific agent — the platform does not yet expose that query. To browse all skills available in the account catalog, use agent_catalog with action:"list_skills".

NOTE: add_trigger returns only { success } — no node_id for the new instance. Call action:"list_triggers" afterward if you need the node_id.

WORKFLOW FOR add_trigger:
1. Call agent_catalog with action:"list_triggers" — note block_reference_id, field_schemas, and required_fields.
2. Collect required field values from the user.
3. Call this tool with action:"add_trigger", block_reference_id, and field_values.

WORKFLOW FOR remove_trigger:
1. Call action:"list_triggers" to see active triggers and note the node_id.
2. Call action:"remove_trigger" with that node_id.

USAGE EXAMPLES:
- List triggers:  { "action": "list_triggers", "agent_id": "7" }
- Add trigger:    { "action": "add_trigger", "agent_id": "7", "block_reference_id": "status-change-ref", "field_values": { "board_id": "42" } }
- Remove trigger: { "action": "remove_trigger", "agent_id": "7", "node_id": "node-abc" }
- Add skill:      { "action": "add_skill", "agent_id": "7", "skill_id": "skill-abc-123" }
- Remove skill:   { "action": "remove_skill", "agent_id": "7", "skill_id": "skill-abc-123" }`;
  }

  getInputSchema() {
    return manageAgentCapabilitiesToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof manageAgentCapabilitiesToolSchema>,
  ): Promise<ToolOutputType<never>> {
    switch (input.action) {
      case 'list_triggers':
        return this.handleListTriggers(input);
      case 'add_trigger':
        return this.handleAddTrigger(input);
      case 'remove_trigger':
        return this.handleRemoveTrigger(input);
      case 'add_skill':
        return this.handleAddSkill(input);
      case 'remove_skill':
        return this.handleRemoveSkill(input);
    }
  }

  private async handleListTriggers(input: ToolInputType<typeof manageAgentCapabilitiesToolSchema>): Promise<ToolOutputType<never>> {
    try {
      const variables: GetAgentActiveTriggersQueryVariables = { agent_id: input.agent_id };
      const res = await this.mondayApi.request<GetAgentActiveTriggersQuery>(getAgentActiveTriggersQuery, variables, { versionOverride: 'dev' });
      const triggers = res.agent_active_triggers ?? [];
      return {
        content: {
          message: 'Active triggers on this agent. Use node_id with action:"remove_trigger" to detach a trigger.',
          count: triggers.length,
          triggers,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'list active triggers for monday platform agent');
    }
  }

  private async handleAddTrigger(input: ToolInputType<typeof manageAgentCapabilitiesToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.block_reference_id) {
      throw new Error('block_reference_id is required for action:"add_trigger". Call agent_catalog with action:"list_triggers" first.');
    }
    try {
      const variables: AddTriggerToAgentMutationVariables = {
        agent_id: input.agent_id,
        block_reference_id: input.block_reference_id,
        field_values: input.field_values,
      };
      const res = await this.mondayApi.request<AddTriggerToAgentMutation>(addTriggerToAgentMutation, variables, { versionOverride: 'dev' });
      return {
        content: {
          message: 'Trigger added to agent. Call action:"list_triggers" to verify and retrieve the node_id.',
          success: res.add_trigger_to_agent?.success ?? false,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'add trigger to monday platform agent');
    }
  }

  private async handleRemoveTrigger(input: ToolInputType<typeof manageAgentCapabilitiesToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.node_id) {
      throw new Error('node_id is required for action:"remove_trigger". Call action:"list_triggers" first to get node_id values.');
    }
    try {
      const variables: RemoveTriggerFromAgentMutationVariables = { agent_id: input.agent_id, node_id: input.node_id };
      const res = await this.mondayApi.request<RemoveTriggerFromAgentMutation>(removeTriggerFromAgentMutation, variables, { versionOverride: 'dev' });
      return {
        content: {
          message: 'Trigger removed from agent.',
          success: res.remove_trigger_from_agent?.success ?? false,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'remove trigger from monday platform agent');
    }
  }

  private async handleAddSkill(input: ToolInputType<typeof manageAgentCapabilitiesToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.skill_id) {
      throw new Error('skill_id is required for action:"add_skill". Get it from agent_catalog action:"list_skills" or action:"create_skill".');
    }
    try {
      const variables: AddSkillToAgentMutationVariables = { agent_id: input.agent_id, skill_id: input.skill_id };
      const res = await this.mondayApi.request<AddSkillToAgentMutation>(addSkillToAgentMutation, variables, { versionOverride: 'dev' });
      return { content: { message: 'Skill added to agent.', success: res.add_skill_to_agent?.success ?? false } };
    } catch (error) {
      rethrowWithContext(error, 'add skill to monday platform agent');
    }
  }

  private async handleRemoveSkill(input: ToolInputType<typeof manageAgentCapabilitiesToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.skill_id) {
      throw new Error('skill_id is required for action:"remove_skill".');
    }
    try {
      const variables: RemoveSkillFromAgentMutationVariables = { agent_id: input.agent_id, skill_id: input.skill_id };
      const res = await this.mondayApi.request<RemoveSkillFromAgentMutation>(removeSkillFromAgentMutation, variables, { versionOverride: 'dev' });
      return { content: { message: 'Skill removed from agent.', success: res.remove_skill_from_agent?.success ?? false } };
    } catch (error) {
      rethrowWithContext(error, 'remove skill from monday platform agent');
    }
  }
}
