import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';
import {
  CreateWorkflowMutation,
  CreateWorkflowMutationVariables,
  WorkflowBuilderPrivacyKind,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { createWorkflowMutation } from './create-workflow.graphql.dev';

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
  name = 'create_workflow';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Workflow',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Creates a new empty workflow in a monday.com workspace.

Use this when the user wants to build a new standalone workflow from scratch. Workflows are cross-board, workspace-level — distinct from automations (use create_automation for those). You only need a workspaceId to get started — all other fields are optional.

Returns:
- workflowObjectId: the workflow object ID
- workflowDraftId: the current draft version ID — workflows start as drafts and must be published before they run

Terminology:
- Workflows vs. automations: workflows are standalone objects scoped to a workspace. Automations (create_automation) are per-board trigger/action rules. They are different products.
- Draft: the editable, inactive version of a workflow. Changes are made on the draft version until it is published as the live version.
- Privacy: PUBLIC — visible to all workspace members (default). PRIVATE — restricted access. SHAREABLE — accessible to guests outside the account.

Note: if directing the user to the workflow in the UI, the correct URL path is custom_objects/, not workflows/ — e.g. {account}.monday.com/custom_objects/{workflowObjectId}.
`;
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
        ...(input.privacyKind !== undefined ? { privacy_kind: input.privacyKind as WorkflowBuilderPrivacyKind } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.folderId !== undefined ? { folder_id: input.folderId } : {}),
        ...(input.ownerIds !== undefined ? { owner_ids: input.ownerIds } : {}),
      };

      const res = await this.mondayApi.request<CreateWorkflowMutation>(createWorkflowMutation, variables, {
        versionOverride: 'dev',
      });

      if (!res.create_workflow) {
        throw new Error('create_workflow returned null');
      }
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
