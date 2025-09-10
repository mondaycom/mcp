import { z } from 'zod';
import { updateWorkspace } from './update-workspace-tool.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { WorkspaceKind } from 'src/monday-graphql/generated/graphql';

export const updateWorkspaceToolSchema = {
  id: z.string().describe('The ID of the workspace to update'),
  attributes: z
    .object({
      accountProductId: z.number().optional(),
      description: z.string().optional(),
      kind: z.nativeEnum(WorkspaceKind).optional(),
      name: z.string().optional(),
    })
    .describe('Attributes to update in the workspace'),
};

export type UpdateWorkspaceToolInput = typeof updateWorkspaceToolSchema;

export class UpdateWorkspaceTool extends BaseMondayApiTool<UpdateWorkspaceToolInput> {
  name = 'update_workspace';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update Workspace',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Update an existing workspace in monday.com';
  }

  getInputSchema(): UpdateWorkspaceToolInput {
    return updateWorkspaceToolSchema;
  }

  protected async executeInternal(input: ToolInputType<UpdateWorkspaceToolInput>): Promise<ToolOutputType<never>> {
    const variables = {
      id: input.id,
      attributes: input.attributes,
    };

    const res = await this.mondayApi.request<{ update_workspace: { id: string } }>(updateWorkspace, variables);

    return {
      content: `Workspace ${res.update_workspace?.id} successfully updated`,
    };
  }
}
