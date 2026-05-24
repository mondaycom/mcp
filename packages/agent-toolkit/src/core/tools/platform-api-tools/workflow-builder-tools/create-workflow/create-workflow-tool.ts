import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';
import {
  createWorkflowMutation,
  CreateWorkflowMutation,
  CreateWorkflowMutationVariables,
} from './create-workflow.graphql.dev';

export const createWorkflowToolSchema = {
  workspaceId: z
    .string()
    .trim()
    .min(1, 'workspaceId must be a non-empty string')
    .describe('The ID of the workspace to create the workflow in.'),
  title: z.string().optional().describe('Workflow title. Defaults to "New Workflow" if not provided.'),
  privacyKind: z
    .enum(['PUBLIC', 'PRIVATE', 'SHAREABLE'])
    .optional()
    .describe('Workflow visibility: PUBLIC (default), PRIVATE, or SHAREABLE (accessible to guests outside the account).'),
  description: z.string().optional().describe('Optional workflow description.'),
  folderId: z.string().optional().describe('Optional folder ID to place the workflow in.'),
  ownerIds: z.array(z.string()).optional().describe('Optional list of user IDs to set as workflow owners.'),
};

export class CreateWorkflowBuilderTool extends BaseMondayApiTool<typeof createWorkflowToolSchema> {
  name = 'create_workflow_builder';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Workflow Builder',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Create a new empty Workflow Builder workflow in a monday.com workspace and return its identifiers.

Returns:
- workflow_object_id: stable entity ID for the workflow object
- workflow_draft_id: draft version ID`;
  }

  getInputSchema() {
    return createWorkflowToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof createWorkflowToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const variables: CreateWorkflowMutationVariables = {
        workspace_id: input.workspaceId,
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.privacyKind !== undefined ? { privacy_kind: input.privacyKind } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.folderId !== undefined ? { folder_id: input.folderId } : {}),
        ...(input.ownerIds !== undefined ? { owner_ids: input.ownerIds } : {}),
      };

      const res = await this.mondayApi.request<CreateWorkflowMutation>(createWorkflowMutation, variables, {
        versionOverride: 'dev',
      });

      const { workflow_object_id, workflow_draft_id } = res.create_workflow;

      if (!workflow_object_id || !workflow_draft_id) {
        throw new Error('create_workflow returned missing identifiers');
      }

      return {
        content: {
          message: `Workflow Builder workflow created in workspace ${input.workspaceId}`,
          workflowObjectId: workflow_object_id,
          workflowDraftId: workflow_draft_id,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'create Workflow Builder workflow');
    }
  }
}
