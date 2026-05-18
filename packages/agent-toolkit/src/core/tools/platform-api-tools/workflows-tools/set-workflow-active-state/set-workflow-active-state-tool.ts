import { z } from 'zod';
import {
  ActivateLiveWorkflowMutation,
  ActivateLiveWorkflowMutationVariables,
  DeactivateLiveWorkflowMutation,
  DeactivateLiveWorkflowMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { activateLiveWorkflowMutation, deactivateLiveWorkflowMutation } from '../shared/workflows.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const setWorkflowActiveStateToolSchema = {
  workflowId: z
    .string()
    .trim()
    .min(1, 'workflowId must be a non-empty string')
    .describe('The workflow ID to activate or deactivate.'),
  action: z
    .enum(['activate', 'deactivate'])
    .describe(
      'The operation to perform on the workflow. activate: enables the workflow. deactivate: pauses the workflow without deleting it.',
    ),
};

export class SetWorkflowActiveStateTool extends BaseMondayApiTool<typeof setWorkflowActiveStateToolSchema> {
  name = 'set_workflow_active_state';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Set Workflow Active State',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Activate or deactivate (pause) an existing monday.com automation/workflow.

Requires a workflow id. When the user refers to a workflow by name, always call list_workflows first to resolve the id — never guess or infer ids.

Use action "activate" to enable a workflow so it starts responding to its trigger. Use action "deactivate" to pause a workflow while preserving its definition.

Terminology: "workflows" and "automations" are the same thing.`;
  }

  getInputSchema() {
    return setWorkflowActiveStateToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof setWorkflowActiveStateToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (input.action === 'activate') {
      return this.activateWorkflow(input.workflowId);
    }

    return this.deactivateWorkflow(input.workflowId);
  }

  private async activateWorkflow(workflowId: string): Promise<ToolOutputType<never>> {
    try {
      const variables: ActivateLiveWorkflowMutationVariables = { id: workflowId };

      const res = await this.mondayApi.request<ActivateLiveWorkflowMutation>(activateLiveWorkflowMutation, variables, {
        versionOverride: 'dev',
      });

      if (!res.activate_live_workflow?.is_success) {
        throw new Error(`Workflow ${workflowId} activation did not report success`);
      }

      return {
        content: {
          message: `Workflow ${workflowId} activated`,
          workflowId,
          isActive: true,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'activate workflow');
    }
  }

  private async deactivateWorkflow(workflowId: string): Promise<ToolOutputType<never>> {
    try {
      const variables: DeactivateLiveWorkflowMutationVariables = { id: workflowId };

      const res = await this.mondayApi.request<DeactivateLiveWorkflowMutation>(
        deactivateLiveWorkflowMutation,
        variables,
        { versionOverride: 'dev' },
      );

      if (!res.deactivate_live_workflow?.is_success) {
        throw new Error(`Workflow ${workflowId} deactivation did not report success`);
      }

      return {
        content: {
          message: `Workflow ${workflowId} deactivated`,
          workflowId,
          isActive: false,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'deactivate workflow');
    }
  }
}
