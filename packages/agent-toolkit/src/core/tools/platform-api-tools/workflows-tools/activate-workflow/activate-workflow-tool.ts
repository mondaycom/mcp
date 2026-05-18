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
    .describe('The workflow ID to activate. Obtain from list_workflows.'),
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
    return `Activate (enable) a monday.com automation/workflow so it starts responding to its trigger. Idempotent — activating an already-active workflow succeeds without side effects.

Requires a workflow id from list_workflows. When the user refers to a workflow by name, always call list_workflows first to resolve the id — never guess or infer ids.

When NOT to use: If the user wants to create a new automation, this tool cannot do that — it only enables existing ones.

Terminology: "workflows" and "automations" are the same thing.`;
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
