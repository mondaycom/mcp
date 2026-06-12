import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { fetchAccountSlug, buildWorkspaceUrl } from '../utils/account-slug.utils';
import { listWorkspaces } from './list-workspace.graphql';
import { DEFAULT_WORKSPACE_LIMIT } from './list-workspace.consts';
import {
  filterNullWorkspaces,
} from './list-workspace.utils';
import { ListWorkspacesQuery, WorkspaceMembershipKind } from '../../../../monday-graphql/generated/graphql/graphql';
import { z } from 'zod';
import { arrayHasElements } from 'src/utils/array.utils';

export const listWorkspaceToolSchema = {
  limit: z
    .number()
    .min(1)
    .max(DEFAULT_WORKSPACE_LIMIT)
    .default(DEFAULT_WORKSPACE_LIMIT)
    .describe(
      `Number of workspaces to return. Default is (${DEFAULT_WORKSPACE_LIMIT}), lower for a smaller response size`,
    ),
  page: z.number().min(1).default(1).describe('Page number to return. Default is 1.'),
};

export class ListWorkspaceTool extends BaseMondayApiTool<typeof listWorkspaceToolSchema> {
  name = 'list_workspaces';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'List Workspaces',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `List all workspaces available to the user, ordered by membership (user's workspaces first). Returns workspaces with their ID, name, and description.
[IMPORTANT] To search for workspaces by name, use the "search" tool with searchType WORKSPACES instead — it provides faster and more accurate results.`;
  }

  getInputSchema(): typeof listWorkspaceToolSchema {
    return listWorkspaceToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof listWorkspaceToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const createVariables = (membershipKind: WorkspaceMembershipKind) => ({
      limit: input.limit,
      page: input.page,
      membershipKind,
    });

    // First, try to get workspaces where the user is a member (more relevant results)
    const memberRes = await this.mondayApi.request<ListWorkspacesQuery>(
      listWorkspaces,
      createVariables(WorkspaceMembershipKind.Member),
    );
    const memberWorkspaces = filterNullWorkspaces(memberRes);

    // Fetch all workspaces only if member workspaces are empty
    let workspaces = memberWorkspaces;

    if (!arrayHasElements(memberWorkspaces)) {
      const allWorkspacesRes = await this.mondayApi.request<ListWorkspacesQuery>(
        listWorkspaces,
        createVariables(WorkspaceMembershipKind.All),
      );
      workspaces = filterNullWorkspaces(allWorkspacesRes);
    }

    if (!arrayHasElements(workspaces)) {
      return {
        content: { message: 'No workspaces found.', data: [] },
      };
    }

    const hasMorePages = workspaces.length === input.limit;

    const slug = await fetchAccountSlug(this.mondayApi);
    const workspacesWithUrls = workspaces.map(ws => ({
      id: ws.id,
      name: ws.name,
      description: ws.description || undefined,
      url: slug && ws.id ? buildWorkspaceUrl(slug, ws.id) : undefined,
    }));

    return {
      content: {
        message: "Workspaces retrieved",
        ...(hasMorePages ? { next_page: input.page + 1 } : {}),
        data: workspacesWithUrls,
      },
    };
  }
}
