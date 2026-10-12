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
import { INVALID_TOOL_ARGS_CODE, rethrowWithContext, ToolValidationError } from '../../../../../utils';

export const manageAutomationsToolSchema = {
  action: z
    .enum(['activate', 'deactivate', 'delete'])
    .describe(
      'The operation to perform. ' +
        'activate: enables a paused automation so it responds to its trigger. ' +
        'deactivate: pauses an automation without deleting it. ' +
        'delete: permanently removes an automation (irreversible).',
    ),
  automationId: z
    .string()
    .trim()
    .min(1, 'automationId must be a non-empty string')
    .optional()
    .describe('The automation ID to operate on. Obtain from list_automations.'),
  workflowId: z
    .string()
    .trim()
    .min(1, 'workflowId must be a non-empty string')
    .optional()
    .describe('Deprecated alias of automationId. Use automationId instead.'),
};

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

When intent is ambiguous ("stop", "turn off", "pause"), prefer deactivate over delete.

There is no in-place edit. Never delete and recreate an automation to change it unless the user explicitly agrees. If they do, create the replacement first, confirm it's active, then delete the old one.

Automation ids are not workflow-builder workflow ids. Never pass them to workflow tools.`;
  }

  getInputSchema() {
    return manageAutomationsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof manageAutomationsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (!input.automationId === !input.workflowId) {
      throw new ToolValidationError('Provide exactly one of automationId or workflowId.', INVALID_TOOL_ARGS_CODE);
    }
    const id = (input.automationId ?? input.workflowId) as string;

    switch (input.action) {
      case 'activate':
        return this.activateAutomation(id);
      case 'deactivate':
        return this.deactivateAutomation(id);
      case 'delete':
        return this.deleteAutomation(id);
    }
  }

  private async activateAutomation(id: string): Promise<ToolOutputType<never>> {
    try {
      const variables: ActivateLiveWorkflowMutationVariables = { id };

      const res = await this.mondayApi.request<ActivateLiveWorkflowMutation>(activateLiveWorkflowMutation, variables, {
        versionOverride: 'dev',
      });

      if (!res.activate_live_workflow?.is_success) {
        throw new Error(`Automation ${id} activation did not report success`);
      }

      return {
        content: {
          message: `Automation ${id} activated`,
          automationId: id,
          workflowId: id,
          isActive: true,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'activate automation');
    }
  }

  private async deactivateAutomation(id: string): Promise<ToolOutputType<never>> {
    try {
      const variables: DeactivateLiveWorkflowMutationVariables = { id };

      const res = await this.mondayApi.request<DeactivateLiveWorkflowMutation>(
        deactivateLiveWorkflowMutation,
        variables,
        { versionOverride: 'dev' },
      );

      if (!res.deactivate_live_workflow?.is_success) {
        throw new Error(`Automation ${id} deactivation did not report success`);
      }

      return {
        content: {
          message: `Automation ${id} deactivated`,
          automationId: id,
          workflowId: id,
          isActive: false,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'deactivate automation');
    }
  }

  private async deleteAutomation(id: string): Promise<ToolOutputType<never>> {
    try {
      const variables: DeleteLiveWorkflowMutationVariables = { id };

      const res = await this.mondayApi.request<DeleteLiveWorkflowMutation>(deleteLiveWorkflowMutation, variables, {
        versionOverride: 'dev',
      });

      if (!res.delete_live_workflow?.is_success) {
        throw new Error(`Automation ${id} deletion did not report success`);
      }

      return {
        content: {
          message: `Automation ${id} deleted`,
          automationId: id,
          workflowId: id,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'delete automation');
    }
  }
}
