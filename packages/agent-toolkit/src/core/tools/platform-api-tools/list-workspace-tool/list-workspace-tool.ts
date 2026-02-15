import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { listWorkspaces } from './list-workspace.graphql';
import { DEFAULT_WORKSPACE_LIMIT, MAX_WORKSPACE_LIMIT_FOR_SEARCH } from './list-workspace.consts';
import {
  filterNullWorkspaces,
  hasMatchingWorkspace,
  filterWorkspacesBySearchTerm,
  formatWorkspacesList,
} from './list-workspace.utils';
import { ListWorkspacesQuery, WorkspaceMembershipKind } from '../../../../monday-graphql/generated/graphql/graphql';
import { z } from 'zod';
import { normalizeString } from 'src/utils/string.utils';
import { arrayHasElements } from 'src/utils/array.utils';

export const listWorkspaceToolSchema = {
  searchTerm: z
    .string()
    .optional()
    .describe('Optional search term used to filter workspaces. [IMPORANT] Only alphanumeric characters are supported.'),
  limit: z
    .number()
    .min(1)
    .max(DEFAULT_WORKSPACE_LIMIT)
    .default(DEFAULT_WORKSPACE_LIMIT)
    .describe(`Number of workspaces to return. Default is (${DEFAULT_WORKSPACE_LIMIT}), lower for a smaller response size`),
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
    if (input.searchTerm) {
      searchTermNormalized = normalizeString(input.searchTerm);
      if (searchTermNormalized.length === 0) {
        throw new Error('Search term did not include any alphanumeric characters. Please provide a valid search term.');
      }
    }

    const createVariables = (membershipKind: WorkspaceMembershipKind) => ({
      limit: limitOverride,
      page: pageOverride,
      membershipKind,
    });

    // First, try to get workspaces where the user is a member (more relevant results)
    const memberRes = await this.mondayApi.request<ListWorkspacesQuery>(
      listWorkspaces,
      createVariables(WorkspaceMembershipKind.Member),
    );
    const memberWorkspaces = filterNullWorkspaces(memberRes);

    const shouldFetchAllWorkspaces =
      !arrayHasElements(memberWorkspaces) || (searchTermNormalized && !hasMatchingWorkspace(searchTermNormalized, memberWorkspaces));

    // Fetch all workspaces only if needed, otherwise use member workspaces
    let workspaces = memberWorkspaces;

    if (shouldFetchAllWorkspaces) {
      const allWorkspacesRes = await this.mondayApi.request<ListWorkspacesQuery>(
        listWorkspaces,
        createVariables(WorkspaceMembershipKind.All),
      );
      workspaces = filterNullWorkspaces(allWorkspacesRes);
    }


    if (!arrayHasElements(workspaces)) {
      return {
        content: 'No workspaces found.',
      };
    }

    // If the number of workspaces is small we prefer not filter and return all workspaces to LLM to filter
    const shouldIncludeNoFilteringDisclaimer = searchTermNormalized && workspaces?.length <= DEFAULT_WORKSPACE_LIMIT;
    const filteredWorkspaces = filterWorkspacesBySearchTerm(searchTermNormalized, workspaces, input.page, input.limit);

    if (!arrayHasElements(filteredWorkspaces)) {
      return {
        content: 'No workspaces found matching the search term. Try using the tool without a search term',
      };
    }

    // Naive check to see if there are more pages
    const hasMorePages = filteredWorkspaces.length === input.limit;
    const workspacesList = formatWorkspacesList(filteredWorkspaces);
    const memberOnlyNote = !shouldFetchAllWorkspaces ? 'Showing workspaces you are a member of. ' : '';

    return {
      content: `
${shouldIncludeNoFilteringDisclaimer ? 'IMPORTANT: Search term not applied - returning all workspaces. Perform the filtering manually.' : ''}
${memberOnlyNote}${workspacesList}
${hasMorePages ? `PAGINATION INFO: More results available - call the tool again with page: ${input.page + 1}` : ''}
      `,
    };
  }
}
