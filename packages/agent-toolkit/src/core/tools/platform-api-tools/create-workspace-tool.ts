import { z } from 'zod';
import { CreateWorkspaceMutation, CreateWorkspaceMutationVariables } from '../../../monday-graphql/generated/graphql';
import { createWorkspace } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const createWorkspaceToolSchema = {
  accountProductId: z.string().optional().describe('The account product ID associated with the workspace'),
  description: z.string().optional().describe('The description of the new workspace'),
  workspaceKind: z.string().describe('The kind of workspace to create'),
  name: z.string().describe('The name of the new workspace to be created'),
};

export type CreateWorkspaceToolInput = typeof createWorkspaceToolSchema;

export class CreateWorkspaceTool extends BaseMondayApiTool<CreateWorkspaceToolInput> {
  name = 'create_workspace';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Workspace',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Create a new workspace in monday.com';
  }

  getInputSchema(): CreateWorkspaceToolInput {
    return createWorkspaceToolSchema;
  }

  protected async executeInternal(input: ToolInputType<CreateWorkspaceToolInput>): Promise<ToolOutputType<never>> {
    const variables: CreateWorkspaceMutationVariables = {
      accountProductId: input.accountProductId,
      description: input.description,
      workspaceKind: input.workspaceKind,
      name: input.name,
    };

    const res = await this.mondayApi.request<CreateWorkspaceMutation>(createWorkspace, variables);

    return {
      content: `Workspace ${res.create_workspace?.id} successfully created`,
    };
  }
}
