import { z } from 'zod';
import {
  ActivateLiveWorkflowMutation,
  ActivateLiveWorkflowMutationVariables,
  DeactivateLiveWorkflowMutation,
  DeactivateLiveWorkflowMutationVariables,
  DeleteLiveWorkflowMutation,
  DeleteLiveWorkflowMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import {
  activateLiveWorkflowMutation,
  deactivateLiveWorkflowMutation,
  deleteLiveWorkflowMutation,
} from './workflow-mutations.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const manageAutomationsToolSchema = {
  action: z
    .enum(['activate', 'deactivate', 'delete'])
    .describe(
      'The operation to perform. ' +
        'activate: enables a paused automation so it responds to its trigger. ' +
        'deactivate: pauses an automation without deleting it. ' +
        'delete: permanently removes an automation (irreversible).',
    ),
  workflowId: z
    .string()
    .trim()
    .min(1, 'workflowId must be a non-empty string')
    .describe('The automation ID to operate on. Obtain from list_automations.'),
};

interface ActivateWorkflowInput {
  action: 'activate';
  workflowId: string;
}

interface DeactivateWorkflowInput {
  action: 'deactivate';
  workflowId: string;
}

interface DeleteWorkflowInput {
  action: 'delete';
  workflowId: string;
}

type ManageAutomationsInput = ActivateWorkflowInput | DeactivateWorkflowInput | DeleteWorkflowInput;

export class ManageAutomationsTool extends BaseMondayApiTool<typeof manageAutomationsToolSchema> {
  name = 'manage_automations';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Manage Automations',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Activate, deactivate, or delete an existing monday.com automation.

Requires an automation id. When the user refers to an automation by name, always call list_automations first to resolve the id — never guess or infer ids.

Actions:
- activate: enables a paused automation so it starts responding to its trigger.
- deactivate: pauses an automation while preserving its definition.
- delete: permanently removes an automation — irreversible.

When intent is ambiguous ("stop", "turn off", "pause"), prefer deactivate over delete.`;
  }

  getInputSchema() {
    return manageAutomationsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof manageAutomationsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const typedInput = input as ManageAutomationsInput;

    switch (typedInput.action) {
      case 'activate':
        return this.activateWorkflow(typedInput);
      case 'deactivate':
        return this.deactivateWorkflow(typedInput);
      case 'delete':
        return this.deleteWorkflow(typedInput);
    }
  }

  private async activateWorkflow(input: ActivateWorkflowInput): Promise<ToolOutputType<never>> {
    try {
      const variables: ActivateLiveWorkflowMutationVariables = { id: input.workflowId };

      const res = await this.mondayApi.request<ActivateLiveWorkflowMutation>(activateLiveWorkflowMutation, variables, {
        versionOverride: 'dev',
      });

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

  private async deactivateWorkflow(input: DeactivateWorkflowInput): Promise<ToolOutputType<never>> {
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

  private async deleteWorkflow(input: DeleteWorkflowInput): Promise<ToolOutputType<never>> {
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
