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
    .describe('The workflow ID to deactivate. Obtain from list_workflows.'),
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
    return `Deactivate (pause) a monday.com automation/workflow. The workflow definition is preserved but it stops responding to its trigger until re-activated with activate_workflow. Idempotent — deactivating an already-inactive workflow succeeds without side effects.

Requires a workflow id from list_workflows. When the user refers to a workflow by name, always call list_workflows first to resolve the id — never guess or infer ids.

When NOT to use: If the user wants permanent removal, use delete_workflow instead. When intent is ambiguous ("turn off", "stop", "pause"), prefer this tool over delete_workflow.

Terminology: "workflows" and "automations" are the same thing.`;
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
