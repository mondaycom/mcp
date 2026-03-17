import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getWorkspaceInfo } from '../../../../monday-graphql/queries.graphql';
import { organizeWorkspaceInfoHierarchy } from './helpers';
import { GetWorkspaceInfoQuery } from 'src/monday-graphql/generated/graphql/graphql';
import { fetchAccountSlug, buildWorkspaceUrl } from '../utils/account-slug.utils';

export const workspaceInfoToolSchema = {
  workspace_id: z.number().describe('The ID of the workspace to get information for'),
};

export class WorkspaceInfoTool extends BaseMondayApiTool<typeof workspaceInfoToolSchema> {
  name = 'workspace_info';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Workspace Information',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'This tool returns the boards, docs and folders in a workspace and which folder they are in. It returns up to 100 of each object type, if you receive 100 assume there are additional objects of that type in the workspace.';
  }

  getInputSchema(): typeof workspaceInfoToolSchema {
    return workspaceInfoToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof workspaceInfoToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables = {
      workspace_id: input.workspace_id,
    };

    const res = await this.mondayApi.request<GetWorkspaceInfoQuery>(getWorkspaceInfo, variables);

    if (!res.workspaces || res.workspaces.length === 0) {
      return {
        content: `No workspace found with ID ${input.workspace_id}`,
      };
    }

    const organizedInfo = organizeWorkspaceInfoHierarchy(res);
    const slug = await fetchAccountSlug(this.mondayApi);
    const workspaceUrl = slug ? buildWorkspaceUrl(slug, organizedInfo.workspace.id) : undefined;

    return {
      content: JSON.stringify({
        message: "Workspace info retrieved",
        workspace_id: organizedInfo.workspace.id,
        workspace_name: organizedInfo.workspace.name,
        workspace_url: workspaceUrl,
        data: organizedInfo,
      }),
    };
  }
}
