import { z } from 'zod';
import {
  GetAgentActiveTriggersQuery,
  GetAgentActiveTriggersQueryVariables,
  AddTriggerToAgentMutation,
  AddTriggerToAgentMutationVariables,
  RemoveTriggerFromAgentMutation,
  RemoveTriggerFromAgentMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import {
  getAgentActiveTriggersQuery,
  addTriggerToAgentMutation,
  removeTriggerFromAgentMutation,
} from './manage-agent-triggers.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const manageAgentTriggersToolSchema = {
  action: z
    .enum(['list', 'add', 'remove'])
    .describe(
      '"list" — returns all triggers currently attached to the agent (includes node_id needed for remove). "add" — attaches a new trigger by block_reference_id. "remove" — detaches a trigger by node_id.',
    ),
  agent_id: z.string().trim().min(1, 'agent_id must be a non-empty string').describe('Unique identifier of the agent.'),
  block_reference_id: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Required for action:add. The block_reference_id from get_agent_catalog (type:triggers) identifying the trigger type to attach. Never guess this value — look it up in the catalog first.',
    ),
  field_values: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.object({ value: z.string(), label: z.string() }).passthrough()]))
    .optional()
    .describe(
      'Required for action:add when the trigger type has required_fields. A key/value object whose shape is described by field_schemas in the get_agent_catalog response. Scalar fields (e.g. { "board_id": "12345" }) use string/number/boolean values. Selection fields (e.g. board picker) use { "value": "<id>", "label": "<name>" }. For scheduler fields pass the structured config object.',
    ),
  node_id: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Required for action:remove. The node_id of the trigger instance to remove — get it from action:list. Each trigger instance has a unique node_id even if the same trigger type is attached multiple times.',
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
    return `List, add, or remove triggers on a monday platform agent.

Triggers define when an agent runs automatically — for example, when a board status changes, when a date arrives, or on a schedule.

Note: the catalog only includes triggers that can be added programmatically. OAuth/3rd-party triggers (Slack, Gmail, Salesforce, etc.) require user setup in the monday.com UI and will not appear in get_agent_catalog.

WORKFLOW FOR ADD:
1. Call get_agent_catalog with type:"triggers" to find the right trigger type by name/description. Note its block_reference_id and inspect field_schemas (describes what field_values to pass when adding — e.g. { board_id: "<ID>" }) and required_fields (fields you must collect from the user — e.g. which board, which column).
2. Collect any required field values from the user.
3. Call this tool with action:"add", the block_reference_id, and the assembled field_values.
Note: the add response returns only { success } — no node_id for the new trigger. Call action:"list" afterward if you need the node_id to remove it later.

WORKFLOW FOR REMOVE:
1. Call this tool with action:"list" to see active triggers by name and field_summary. Match the trigger the user described, note its node_id.
2. Call this tool with action:"remove" and that node_id.

USAGE EXAMPLES:
- List triggers: { "action": "list", "agent_id": "7" }
- Add trigger: { "action": "add", "agent_id": "7", "block_reference_id": "status-change-ref", "field_values": { "board_id": "42" } }
- Remove trigger: { "action": "remove", "agent_id": "7", "node_id": "node-abc" }`;
  }

  getInputSchema() {
    return manageAgentTriggersToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof manageAgentTriggersToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (input.action === 'list') {
      try {
        const variables: GetAgentActiveTriggersQueryVariables = { agent_id: input.agent_id };
        const res = await this.mondayApi.request<GetAgentActiveTriggersQuery>(
          getAgentActiveTriggersQuery,
          variables,
          { versionOverride: 'dev' },
        );
        const triggers = res.agent_active_triggers ?? [];
        return {
          content: {
            message: 'Active triggers on this agent. Use node_id with action:remove to detach a trigger.',
            count: triggers.length,
            triggers,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'list active triggers for monday platform agent');
      }
    }

    if (input.action === 'add') {
      if (!input.block_reference_id) {
        throw new Error('block_reference_id is required for action:add. Call get_agent_catalog with type:triggers first.');
      }
      try {
        const variables: AddTriggerToAgentMutationVariables = {
          agent_id: input.agent_id,
          block_reference_id: input.block_reference_id,
          field_values: input.field_values,
        };
        const res = await this.mondayApi.request<AddTriggerToAgentMutation>(
          addTriggerToAgentMutation,
          variables,
          { versionOverride: 'dev' },
        );
        return {
          content: {
            message: 'Trigger added to agent. Call manage_agent_triggers with action:list to verify.',
            success: res.add_trigger_to_agent?.success ?? false,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'add trigger to monday platform agent');
      }
    }

    if (!input.node_id) {
      throw new Error(
        'node_id is required for action:remove. Call manage_agent_triggers with action:list first to get node_id values.',
      );
    }
    try {
      const variables: RemoveTriggerFromAgentMutationVariables = {
        agent_id: input.agent_id,
        node_id: input.node_id,
      };
      const res = await this.mondayApi.request<RemoveTriggerFromAgentMutation>(
        removeTriggerFromAgentMutation,
        variables,
        { versionOverride: 'dev' },
      );
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
