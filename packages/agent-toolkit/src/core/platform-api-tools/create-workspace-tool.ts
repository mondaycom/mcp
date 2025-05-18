import { z } from 'zod';
import { BaseMondayApiTool } from './base-monday-api-tool';
import { ToolInputType, ToolOutputType, ToolType } from '../tool';
import { createWorkspace } from '../../monday-graphql/queries.graphql';
import { Mutation, MutationCreate_WorkspaceArgs, WorkspaceKind } from '../../monday-graphql/generated/graphql';

export const createWorkspaceToolSchema = {
  name: z.string().describe('The name of the workspace to create'),
  kind: z.nativeEnum(WorkspaceKind).default(WorkspaceKind.Open).describe('The kind of workspace to create (open or closed)'),
  description: z.string().optional().describe('The description of the workspace'),
};

export class CreateWorkspaceTool extends BaseMondayApiTool<typeof createWorkspaceToolSchema> {
  name = 'create_workspace';
  type = ToolType.MUTATION;

  getDescription(): string {
    return 'Create a new workspace in monday.com';
  }

  getInputSchema(): typeof createWorkspaceToolSchema {
    return createWorkspaceToolSchema;
  }

  async execute(input: ToolInputType<typeof createWorkspaceToolSchema>): Promise<ToolOutputType<never>> {
    const variables: MutationCreate_WorkspaceArgs = {
      name: input.name,
      kind: input.kind,
      description: input.description,
    };

    const res = await this.mondayApi.request<Pick<Mutation, 'create_workspace'>>(createWorkspace, variables);

    return {
      content: `Workspace ${res.create_workspace?.id} successfully created`,
    };
  }
} 