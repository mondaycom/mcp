import { z } from 'zod';
import {
  ActivateLiveWorkflowMutation,
  ActivateLiveWorkflowMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { activateLiveWorkflowMutation } from '../shared/workflows.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const activateWorkflowToolSchema = {
  workflowId: z
    .string()
    .trim()
    .min(1, 'workflowId must be a non-empty string')
    .describe('Unique identifier of the workflow to activate.'),
};

export class ActivateWorkflowTool extends BaseMondayApiTool<typeof activateWorkflowToolSchema> {
  name = 'activate_workflow';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Activate Workflow',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Activate (enable) a monday.com workflow/automation. After activation the workflow starts reacting to its trigger.

Terminology note: users typically call these "automations" or "recipes" in the monday UI. In this API they are "workflows".

VERIFY BEFORE ACTIVATING: When the user refers to a workflow by name (e.g. "turn on my status notifier"), call list_workflows on the relevant board first to find the matching id. Do not infer ids.

USAGE EXAMPLE:
{ "workflowId": "42" }`;
  }

  getInputSchema() {
    return activateWorkflowToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof activateWorkflowToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const variables: ActivateLiveWorkflowMutationVariables = { id: input.workflowId };

      const res = await this.mondayApi.request<ActivateLiveWorkflowMutation>(
        activateLiveWorkflowMutation,
        variables,
        { versionOverride: 'dev' },
      );

      if (!res.activate_live_workflow?.is_success) {
        throw new Error(`Workflow ${input.workflowId} activation did not report success`);
      }

      return {
        content: {
          message: `Workflow ${input.workflowId} activated`,
          workflowId: input.workflowId,
          isActive: true,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'activate workflow');
    }
  }
}
