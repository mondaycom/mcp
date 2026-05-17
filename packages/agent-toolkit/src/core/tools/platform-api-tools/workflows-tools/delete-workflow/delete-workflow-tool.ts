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
    .describe('Unique identifier of the workflow to delete.'),
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
    return `Permanently delete a monday.com workflow/automation. The workflow is removed entirely and cannot be recovered. To temporarily turn a workflow off without losing it, use deactivate_workflow instead.

Terminology note: users typically call these "automations" or "recipes" in the monday UI. In this API they are "workflows".

VERIFY BEFORE DELETING: When the user refers to a workflow by name (e.g. "delete my standup reminder"), call list_workflows on the relevant board first to confirm the matching id. Do not infer ids. Prefer deactivate over delete when intent is ambiguous.

USAGE EXAMPLE:
{ "workflowId": "42" }`;
  }

  getInputSchema() {
    return deleteWorkflowToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof deleteWorkflowToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const variables: DeleteLiveWorkflowMutationVariables = { id: input.workflowId };

      const res = await this.mondayApi.request<DeleteLiveWorkflowMutation>(
        deleteLiveWorkflowMutation,
        variables,
        { versionOverride: 'dev' },
      );

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
