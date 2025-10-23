import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { listWorkspaces } from './list-workspace.graphql';
import { ListWorkspacesQuery } from '../../../../monday-graphql/generated/graphql';
import { DEFAULT_WORKSPACE_LIMIT, MAX_WORKSPACE_LIMIT_FOR_SEARCH } from './list-workspace.consts';
import { z } from 'zod';
import { normalizeString } from 'src/utils/string.utils';

export const listWorkspaceToolSchema = {
  searchTerm: z.string().optional().describe('The search term to filter the workspaces by. If not provided, all workspaces will be returned.'),
  limit: z.number().min(1).max(DEFAULT_WORKSPACE_LIMIT).default(DEFAULT_WORKSPACE_LIMIT).describe(`The number of workspaces to return. Default and maximum allowed is ${DEFAULT_WORKSPACE_LIMIT}`),
  page: z.number().min(1).describe('The page number to return. Default is 1.')
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
    return 'List all workspaces available to the user. Returns up to 500 workspaces with their ID, name, and description.';
  }

  getInputSchema(): typeof listWorkspaceToolSchema {
    return listWorkspaceToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof listWorkspaceToolSchema>,
  ): Promise<ToolOutputType<never>> {

    // Due to lack of search capabilities in the API, we filter in memory.
    // When search term is provided, we fetch at max ${MAX_WORKSPACE_LIMIT_FOR_SEARCH} workspaces and filter in memory.
    // Paging is also done memory so in API request we always request 1st page
    const pageFromInput = (input.page ?? 1);
    const limitOverride = input.searchTerm ? MAX_WORKSPACE_LIMIT_FOR_SEARCH : input.limit;
    const pageOverride = input.searchTerm ? 1 : pageFromInput;

    const variables = {
      limit: limitOverride,
      page: pageOverride
    };

    const res = await this.mondayApi.request<ListWorkspacesQuery>(listWorkspaces, variables);
    let workspaces = res.workspaces?.filter(w => w);

    if (!workspaces || workspaces.length === 0) {
      return {
        content: 'No workspaces found.',
      };
    }

    if (input.searchTerm) {
      const searchTerm = normalizeString(input.searchTerm)
      const startIndex = (pageFromInput - 1) * input.limit;
      const endIndex = startIndex + input.limit;

      workspaces = workspaces.filter(workspace => normalizeString(workspace!.name).includes(searchTerm));
      workspaces = workspaces.slice(startIndex, endIndex);
    }

    if(workspaces.length === 0) {
      return {
        content: 'No workspaces found matching the search term. Try using the tool without a search term',
      };
    }

    // Naive check to see if there are more pages
    const hasMorePages = workspaces.length === input.limit;

    const workspacesList = workspaces
      .map(workspace => {
        const description = workspace!.description ? ` - ${workspace!.description}` : '';
        return `• **${workspace!.name}** (ID: ${workspace!.id})${description}`;
      })
      .join('\n');

    return { 
      content: `${workspacesList}
${hasMorePages ? `PAGINATION INFO: More results available - call the tool again with page: ${pageFromInput + 1}` : ''}
      `};
  }
}
