import { z } from 'zod';
import {
  DeactivateLiveWorkflowMutation,
  DeactivateLiveWorkflowMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { deactivateLiveWorkflowMutation } from '../shared/workflows.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const deactivateWorkflowToolSchema = {
  workflowId: z
    .string()
    .trim()
    .min(1, 'workflowId must be a non-empty string')
    .describe('Unique identifier of the workflow to deactivate.'),
};

export class DeactivateWorkflowTool extends BaseMondayApiTool<typeof deactivateWorkflowToolSchema> {
  name = 'deactivate_workflow';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Deactivate Workflow',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Deactivate (disable) a monday.com workflow/automation. The workflow stays defined but stops reacting to its trigger until re-activated.

Terminology note: users typically call these "automations" or "recipes" in the monday UI. In this API they are "workflows".

VERIFY BEFORE DEACTIVATING: When the user refers to a workflow by name (e.g. "pause my onboarding automation"), call list_workflows on the relevant board first to find the matching id. Do not infer ids.

USAGE EXAMPLE:
{ "workflowId": "42" }`;
  }

  getInputSchema() {
    return deactivateWorkflowToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof deactivateWorkflowToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const variables: DeactivateLiveWorkflowMutationVariables = { id: input.workflowId };

      const res = await this.mondayApi.request<DeactivateLiveWorkflowMutation>(
        deactivateLiveWorkflowMutation,
        variables,
        { versionOverride: 'dev' },
      );

      if (!res.deactivate_live_workflow?.is_success) {
        throw new Error(`Workflow ${input.workflowId} deactivation did not report success`);
      }

      return {
        content: {
          message: `Workflow ${input.workflowId} deactivated`,
          workflowId: input.workflowId,
          isActive: false,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'deactivate workflow');
    }
  }
}
