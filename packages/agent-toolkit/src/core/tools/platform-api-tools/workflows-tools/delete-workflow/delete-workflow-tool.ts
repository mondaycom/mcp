import { z } from 'zod';
import {
  DeleteLiveWorkflowMutation,
  DeleteLiveWorkflowMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { deleteLiveWorkflowMutation } from '../shared/workflows.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const deleteWorkflowToolSchema = {
  workflowId: z
    .string()
    .trim()
    .min(1, 'workflowId must be a non-empty string')
    .describe('The workflow ID to permanently delete. Obtain from list_workflows.'),
};

export class DeleteWorkflowTool extends BaseMondayApiTool<typeof deleteWorkflowToolSchema> {
  name = 'delete_workflow';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Delete Workflow',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Permanently delete a monday.com automation/workflow. This is irreversible — the workflow cannot be recovered.

Requires a workflow id from list_workflows. When the user refers to a workflow by name, always call list_workflows first to confirm the id — never guess or infer ids.

When NOT to use: When the user's intent is ambiguous ("stop", "turn off", "pause"), prefer set_workflow_active_state with action "deactivate" instead — it preserves the workflow definition. Only use delete_workflow when the user explicitly wants permanent removal.

Terminology: "workflows" and "automations" are the same thing.`;
  }

  getInputSchema() {
    return deleteWorkflowToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof deleteWorkflowToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const variables: DeleteLiveWorkflowMutationVariables = { id: input.workflowId };

      const res = await this.mondayApi.request<DeleteLiveWorkflowMutation>(deleteLiveWorkflowMutation, variables, {
        versionOverride: 'dev',
      });

      if (!res.delete_live_workflow?.is_success) {
        throw new Error(`Workflow ${input.workflowId} deletion did not report success`);
      }

      return {
        content: {
          message: `Workflow ${input.workflowId} deleted`,
          workflowId: input.workflowId,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'delete workflow');
    }
  }
}
