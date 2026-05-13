import { z } from 'zod';
import {
  ActivateAgentMutation,
  ActivateAgentMutationVariables,
  DeactivateAgentMutation,
  DeactivateAgentMutationVariables,
  RunAgentMutation,
  RunAgentMutationVariables,
  InactiveReason,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import {
  activateAgentMutation,
  deactivateAgentMutation,
  runAgentMutation,
} from './manage-agent-state.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const manageAgentStateToolSchema = {
  action: z.enum(['activate', 'deactivate', 'run']).describe(
    '"activate" — transitions the agent to ACTIVE state. "deactivate" — transitions the agent to INACTIVE. "run" — manually enqueues a run of the agent.',
  ),
  agent_id: z.string().trim().min(1).describe('Unique identifier of the agent.'),
  inactive_reason: z
    .enum(['DEACTIVATED_BY_USER', 'ACCOUNT_LEVEL_BLOCKING'])
    .optional()
    .describe(
      'Only for action:deactivate. Reason for deactivation. Defaults to "DEACTIVATED_BY_USER" if omitted.',
    ),
};

export class ManageAgentStateTool extends BaseMondayApiTool<typeof manageAgentStateToolSchema> {
  name = 'manage_agent_state';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Manage monday Platform Agent State',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Activate, deactivate, or manually trigger a run for a monday platform agent.

- activate: Transitions the agent to ACTIVE state so it can receive and respond to triggers.
- deactivate: Transitions the agent to INACTIVE. Use inactive_reason:"DEACTIVATED_BY_USER" (default) for user-initiated deactivation.
- run: Manually enqueues a run of the agent (fire-and-forget). Returns a trigger_uuid for downstream correlation. Success means the run was enqueued — not that it completed.

USAGE EXAMPLES:
- Activate: { "action": "activate", "agent_id": "7" }
- Deactivate: { "action": "deactivate", "agent_id": "7" }
- Run: { "action": "run", "agent_id": "7" }`;
  }

  getInputSchema() {
    return manageAgentStateToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof manageAgentStateToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (input.action === 'activate') {
      try {
        const activateRes = await this.mondayApi.request<ActivateAgentMutation>(
          activateAgentMutation,
          { id: input.agent_id } satisfies ActivateAgentMutationVariables,
          { versionOverride: 'dev' },
        );
        return {
          content: {
            message: 'Agent activated.',
            success: activateRes.activate_agent?.success ?? false,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'activate monday platform agent');
      }
    } else if (input.action === 'deactivate') {
      try {
        const deactivateRes = await this.mondayApi.request<DeactivateAgentMutation>(
          deactivateAgentMutation,
          {
            id: input.agent_id,
            inactive_reason: (input.inactive_reason as InactiveReason) ?? InactiveReason.DeactivatedByUser,
          } satisfies DeactivateAgentMutationVariables,
          { versionOverride: 'dev' },
        );
        return {
          content: {
            message: 'Agent deactivated.',
            success: deactivateRes.deactivate_agent?.success ?? false,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'deactivate monday platform agent');
      }
    } else {
      try {
        const runRes = await this.mondayApi.request<RunAgentMutation>(
          runAgentMutation,
          { id: input.agent_id } satisfies RunAgentMutationVariables,
          { versionOverride: 'dev' },
        );
        if (!runRes.run_agent) {
          throw new Error('run_agent returned no data — the agent run may not have been enqueued');
        }
        return {
          content: {
            message: 'Agent run enqueued.',
            trigger_uuid: runRes.run_agent.trigger_uuid,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'run monday platform agent');
      }
    }
  }
}
