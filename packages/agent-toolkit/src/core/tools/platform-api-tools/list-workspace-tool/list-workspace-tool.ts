import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { listWorkspaces } from './list-workspace.graphql';
import { ListWorkspacesQuery } from '../../../../monday-graphql/generated/graphql';
import { DEFAULT_WORKSPACE_LIMIT, MAX_WORKSPACE_LIMIT_FOR_SEARCH } from './list-workspace.consts';
import { z } from 'zod';
import { normalizeString } from 'src/utils/string.utils';

export const listWorkspaceToolSchema = {
  searchTerm: z.string().optional().describe('The search term to filter the workspaces by. If not provided, all workspaces will be returned. [IMPORANT] Only alphanumeric characters are supported.'),
  limit: z.number().min(1).max(DEFAULT_WORKSPACE_LIMIT).default(DEFAULT_WORKSPACE_LIMIT).describe(`The number of workspaces to return. Default and maximum allowed is ${DEFAULT_WORKSPACE_LIMIT}`),
  page: z.number().min(1).default(1).describe('The page number to return. Default is 1.')
};

type Workspace = NonNullable<ListWorkspacesQuery['workspaces']>[number];

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
    const limitOverride = input.searchTerm ? MAX_WORKSPACE_LIMIT_FOR_SEARCH : input.limit;
    const pageOverride = input.searchTerm ? 1 : input.page;

    let searchTermNormalized: string | null = null;
    if(input.searchTerm) {
      searchTermNormalized = normalizeString(input.searchTerm)
      if (searchTermNormalized.length === 0) {
        throw new Error('Search term did not include any alphanumeric characters. Please provide a valid search term.');
      }
    }

    const variables = {
      limit: limitOverride,
      page: pageOverride
    };

    const res = await this.mondayApi.request<ListWorkspacesQuery>(listWorkspaces, variables);
    const workspaces = res.workspaces?.filter(w => w);

    if (!workspaces || workspaces.length === 0) {
      return {
        content: 'No workspaces found.',
      };
    }

    const shouldIncludeNoFilteringDisclaimer = searchTermNormalized && workspaces.length <= DEFAULT_WORKSPACE_LIMIT;
    const filteredWorkspaces = this.filterWorkspacesIfNeeded(searchTermNormalized, workspaces, input);

    if(filteredWorkspaces.length === 0) {
      return {
        content: 'No workspaces found matching the search term. Try using the tool without a search term',
      };
    }

    // Naive check to see if there are more pages
    const hasMorePages = filteredWorkspaces.length === input.limit;

    const workspacesList = filteredWorkspaces
      .map(workspace => {
        const description = workspace!.description ? ` - ${workspace!.description}` : '';
        return `• **${workspace!.name}** (ID: ${workspace!.id})${description}`;
      })
      .join('\n');


    return { 
      content: `
${shouldIncludeNoFilteringDisclaimer ? 'IMPORTANT: Search term was not applied. Returning all workspaces. Please perform the filtering manually.' : ''}
${workspacesList}
${hasMorePages ? `PAGINATION INFO: More results available - call the tool again with page: ${input.page + 1}` : ''}
      `};
  }

  private filterWorkspacesIfNeeded(
    searchTermNormalized: string | null,
    workspaces: Workspace[],
    input: ToolInputType<typeof listWorkspaceToolSchema>
  ) {
    // If there is no more than single page of results, let LLM do the filtering
    if (!searchTermNormalized || workspaces.length <= DEFAULT_WORKSPACE_LIMIT) {
      return workspaces;
    }

    const startIndex = (input.page - 1) * input.limit;
    const endIndex = startIndex + input.limit;

    return workspaces
      .filter(workspace => normalizeString(workspace!.name).includes(searchTermNormalized))
      .slice(startIndex, endIndex);
  }
}
