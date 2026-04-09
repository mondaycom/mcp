import { z } from 'zod';
import { updateWorkspace } from './update-workspace-tool.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { WorkspaceKind } from 'src/monday-graphql/generated/graphql/graphql';
import { fetchAccountSlug, buildWorkspaceUrl } from '../utils/account-slug.utils';

export const updateWorkspaceToolSchema = {
  id: z.string().describe('The ID of the workspace to update'),
  attributeAccountProductId: z.number().optional().describe("The target account product's ID to move the workspace to"),
  attributeDescription: z.string().optional().describe('The description of the workspace to update'),
  attributeKind: z
    .nativeEnum(WorkspaceKind)
    .optional()
    .describe('The kind of the workspace to update (open / closed / template)'),
  attributeName: z.string().optional().describe('The name of the workspace to update'),
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
      attributes: {
        account_product_id: input.attributeAccountProductId,
        description: input.attributeDescription,
        kind: input.attributeKind,
        name: input.attributeName,
      },
    };

    const res = await this.mondayApi.request<{ update_workspace: { id: string; name?: string } }>(
      updateWorkspace,
      variables,
    );

    const slug = await fetchAccountSlug(this.mondayApi);
    const workspaceUrl = slug ? buildWorkspaceUrl(slug, res.update_workspace?.id) : undefined;

    return {
      content: {
        message: `Workspace ${res.update_workspace?.id} updated`,
        workspace_id: res.update_workspace?.id,
        workspace_name: res.update_workspace?.name,
        workspace_url: workspaceUrl,
      },
    };
  }
}
