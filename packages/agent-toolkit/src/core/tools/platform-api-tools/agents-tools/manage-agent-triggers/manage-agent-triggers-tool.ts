import { z } from 'zod';
import {
  AddTriggerToAgentMutation,
  AddTriggerToAgentMutationVariables,
  GetAgentActiveTriggersQuery,
  GetAgentActiveTriggersQueryVariables,
  RemoveTriggerFromAgentMutation,
  RemoveTriggerFromAgentMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { addTriggerToAgentMutation, getAgentActiveTriggersQuery, removeTriggerFromAgentMutation } from '../shared/agents.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const manageAgentTriggersToolSchema = {
  action: z
    .enum(['list', 'add', 'remove'])
    .describe(
      '"list" — returns all triggers currently attached to this agent (includes node_id needed for remove). "add" — attaches a new trigger by block_reference_id. "remove" — detaches a trigger instance by node_id.',
    ),
  agent_id: z.string().trim().min(1, 'agent_id must be a non-empty string').describe('Unique identifier of the agent.'),
  block_reference_id: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Required for action:"add". The block_reference_id from agent_catalog action:"list_triggers" identifying the trigger type to attach. Never guess this value — look it up in the catalog first.',
    ),
  field_values: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.object({ value: z.string(), label: z.string() }).passthrough()]))
    .optional()
    .describe(
      'Used with action:"add" when the trigger type has required_fields. Key/value object whose shape is described by field_schemas in the agent_catalog response. Scalar fields use string/number/boolean values. Selection fields use { "value": "<id>", "label": "<name>" }.',
    ),
  node_id: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Required for action:"remove". The node_id of the trigger instance — get it from action:"list". Each instance has a unique node_id even if the same trigger type is attached multiple times. Do NOT pass block_reference_id here.',
    ),
};

export class ManageAgentTriggersTool extends BaseMondayApiTool<typeof manageAgentTriggersToolSchema> {
  name = 'manage_agent_triggers';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Manage monday Platform Agent Triggers',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Manage the triggers attached to a monday platform agent — triggers define WHEN the agent runs automatically.

ACTIONS:
- list:   { agent_id } — returns active triggers with node_id, block_reference_id, name, field_summary.
- add:    { agent_id, block_reference_id, field_values? } — attaches a trigger type to the agent.
- remove: { agent_id, node_id } — detaches a trigger instance by node_id (NOT block_reference_id).

WORKFLOW — add a trigger:
1. Call agent_catalog action:"list_triggers" — note block_reference_id, field_schemas, and required_fields.
2. Collect required field values from the user (e.g. board_id, column_id).
3. Call this tool action:"add" with block_reference_id and field_values.
Note: add returns only { success } — no node_id for the new instance. Call action:"list" afterward if you need the node_id.

WORKFLOW — remove a trigger:
1. Call action:"list" to see active triggers and note the node_id of the instance to remove.
2. Call action:"remove" with that node_id.

NOTE: Only triggers that can be added programmatically appear in the catalog. OAuth/3rd-party triggers (Slack, Gmail, Salesforce, etc.)
require user setup in the monday.com UI — they will not appear in agent_catalog and cannot be managed here.

USAGE EXAMPLES:
- List triggers:  { "action": "list", "agent_id": "7" }
- Add trigger:    { "action": "add", "agent_id": "7", "block_reference_id": "status-change-ref", "field_values": { "board_id": "42" } }
- Remove trigger: { "action": "remove", "agent_id": "7", "node_id": "node-abc" }

RELATED TOOLS:
- agent_catalog action:"list_triggers" — discover available trigger types and their required field_values before calling action:"add" here
- manage_agent_skills — manage which skills this agent can perform
- manage_agent — manage the agent entity itself (create, activate, deactivate, etc.)`;
  }

  getInputSchema() {
    return manageAgentTriggersToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof manageAgentTriggersToolSchema>): Promise<ToolOutputType<never>> {
    switch (input.action) {
      case 'list':
        return this.handleList(input);
      case 'add':
        return this.handleAdd(input);
      case 'remove':
        return this.handleRemove(input);
    }
  }

  private async handleList(input: ToolInputType<typeof manageAgentTriggersToolSchema>): Promise<ToolOutputType<never>> {
    try {
      const variables: GetAgentActiveTriggersQueryVariables = { agent_id: input.agent_id };
      const res = await this.mondayApi.request<GetAgentActiveTriggersQuery>(getAgentActiveTriggersQuery, variables, { versionOverride: 'dev' });
      const triggers = res.agent_active_triggers ?? [];
      return {
        content: {
          message: 'Active triggers on this agent. Use node_id with action:"remove" to detach a trigger.',
          count: triggers.length,
          triggers,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'list active triggers for monday platform agent');
    }
  }

  private async handleAdd(input: ToolInputType<typeof manageAgentTriggersToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.block_reference_id) {
      throw new Error('block_reference_id is required for action:"add". Call agent_catalog action:"list_triggers" first to find the block_reference_id.');
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
          message: 'Trigger added to agent. Call action:"list" to verify and retrieve the node_id.',
          success: res.add_trigger_to_agent?.success ?? false,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'add trigger to monday platform agent');
    }
  }

  private async handleRemove(input: ToolInputType<typeof manageAgentTriggersToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.node_id) {
      throw new Error('node_id is required for action:"remove". Call action:"list" first to get node_id values.');
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
}
