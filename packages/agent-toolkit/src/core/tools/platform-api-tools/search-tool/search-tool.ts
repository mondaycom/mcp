import { ToolInputType, ToolOutputType, ToolType } from 'src/core/tool';
import { z } from 'zod';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getBoards, getDocs, getFolders } from './search-tool.graphql';
import { searchBoardsDev, searchDocsDev } from './search-tool.graphql.dev';
import {
  GetBoardsQuery,
  GetBoardsQueryVariables,
  GetDocsQuery,
  GetDocsQueryVariables,
  GetFoldersQuery,
  GetFoldersQueryVariables,
} from 'src/monday-graphql/generated/graphql/graphql';
import {
  SearchBoardsDevQuery,
  SearchBoardsDevQueryVariables,
  SearchDocsDevQuery,
  SearchDocsDevQueryVariables,
} from 'src/monday-graphql/generated/graphql.dev/graphql';
import { normalizeString } from 'src/utils/string.utils';
import { DataWithFilterInfo, GlobalSearchType, ObjectPrefixes, SearchResult } from './search-tool.types';
import { LOAD_INTO_MEMORY_LIMIT, MAX_FOLDERS_LIMIT, SEARCH_LIMIT } from './search-tool.consts';
import { SEARCH_TIMEOUT } from 'src/utils/time.utils';
import { rethrowWithContext, throwIfSearchTimeoutError } from 'src/utils/error.utils';

export const searchSchema = {
  searchTerm: z.string().optional().describe('The search term to use for the search.'),
  searchType: z.nativeEnum(GlobalSearchType).describe('The type of search to perform.'),
  limit: z
    .number()
    .max(SEARCH_LIMIT)
    .optional()
    .default(SEARCH_LIMIT)
    .describe(`The number of items to get. The max and default value is ${SEARCH_LIMIT}.`),
  page: z.number().optional().default(1).describe('The page number to get. The default value is 1.'),

  // for boards and docs
  workspaceIds: z
    .array(z.number())
    .optional()
    .describe(
      'The ids of the workspaces to search in. [IMPORTANT] Only pass this param if user explicitly asked to search within specific workspaces.',
    ),
};

export type SearchToolInput = typeof searchSchema;

export class SearchTool extends BaseMondayApiTool<SearchToolInput> {
  name = 'search';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Search',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Search within monday.com platform. Can search for boards, documents, forms, folders.
For users and teams, use list_users_and_teams tool.
For workspaces, use list_workspaces tool.
For items and groups, use get_board_items_page tool.
For groups, use get_board_info tool.
IMPORTANT: ids returned by this tool are prefixed with the type of the object (e.g doc-123, board-456, folder-789). When passing the ids to other tools, you need to remove the prefix and just pass the number.
    `;
  }

  getInputSchema(): SearchToolInput {
    return searchSchema;
  }

  protected async executeInternal(input: ToolInputType<SearchToolInput>): Promise<ToolOutputType<never>> {
    // Try using "cross_entity_search" field from dev schema for BOARD and DOCUMENTS types
    if (input.searchType !== GlobalSearchType.FOLDERS && input.searchTerm) {
      try {
        const data = await this.searchWithDevEndpointAsync(input);

        return {
          content: { message: "Search results", data: data.items },
        };
      } catch (error) {
       throwIfSearchTimeoutError(error);
      }
    }

    const handlers = {
      [GlobalSearchType.BOARD]: this.searchBoardsAsync.bind(this),
      [GlobalSearchType.DOCUMENTS]: this.searchDocsAsync.bind(this),
      [GlobalSearchType.FOLDERS]: this.searchFoldersAsync.bind(this),
    };

    const handler = handlers[input.searchType];

    if (!handler) {
      throw new Error(`Unsupported search type: ${input.searchType}`);
    }

    const data = await handler(input);

    return {
      content: { message: "Search results", disclaimer: data.wasFiltered || !input.searchTerm ? undefined : '[IMPORTANT]Items were not filtered. Please perform the filtering.', data: data.items },
    };
  }

  private async searchWithDevEndpointAsync(
    input: ToolInputType<SearchToolInput>,
  ): Promise<DataWithFilterInfo<SearchResult>> {
    if(input.page > 1) {
      throw new Error('Pagination is not supported for search, increase the limit parameter instead');
    }

    const workspaceIds = input.workspaceIds?.map((id) => id.toString());

    if (input.searchType === GlobalSearchType.BOARD) {
      return this.searchBoardsWithDevEndpointAsync(input.searchTerm!, input.limit, workspaceIds);
    }

    if (input.searchType === GlobalSearchType.DOCUMENTS) {
      return this.searchDocsWithDevEndpointAsync(input.searchTerm!, input.limit, workspaceIds);
    }

    throw new Error(`Unsupported search type for dev endpoint: ${input.searchType}`);
  }

  private async searchBoardsWithDevEndpointAsync(
    query: string,
    limit: number,
    workspaceIds?: string[],
  ): Promise<DataWithFilterInfo<SearchResult>> {
    const variables: SearchBoardsDevQueryVariables = { query, limit, workspaceIds };

    const response = await this.mondayApi.request<SearchBoardsDevQuery>(searchBoardsDev, variables, {
      versionOverride: 'dev',
      timeout: SEARCH_TIMEOUT,
    });

    const items = response.search.boards.results.map((result) => ({
      id: ObjectPrefixes.BOARD + result.indexed_data.id,
      title: result.indexed_data.name,
      url: result.indexed_data.url,
    }));

    return { items, wasFiltered: true };
  }

  private async searchDocsWithDevEndpointAsync(
    query: string,
    limit: number,
    workspaceIds?: string[],
  ): Promise<DataWithFilterInfo<SearchResult>> {
    const variables: SearchDocsDevQueryVariables = { query, limit, workspaceIds };

    const response = await this.mondayApi.request<SearchDocsDevQuery>(searchDocsDev, variables, {
      versionOverride: 'dev',
      timeout: SEARCH_TIMEOUT,
    });

    const items = response.search.docs.results.map((result) => ({
      id: ObjectPrefixes.DOCUMENT + result.indexed_data.id,
      title: result.indexed_data.name,
    }));

    return { items, wasFiltered: true };
  }

  private async searchFoldersAsync(input: ToolInputType<SearchToolInput>): Promise<DataWithFilterInfo<SearchResult>> {
    const variables: GetFoldersQueryVariables = {
      ...this.getPagingParamsForSearch(input, MAX_FOLDERS_LIMIT),
      workspace_ids: input.workspaceIds?.map((id) => id.toString()),
    };
    variables.workspace_ids ??= [];

    if(variables.workspace_ids.length === 0) {
      rethrowWithContext(new Error('Searching for folders require specifying workspace ids'), 'search folders');
    }

    const response = await this.mondayApi.request<GetFoldersQuery>(getFolders, variables);
    const data = this.searchAndVirtuallyPaginate(input, response.folders || [], (folder) => folder!.name);

    const result = {
      items: data.items.map((folder) => ({
        id: ObjectPrefixes.FOLDER + folder!.id,
        title: folder!.name,
      })),
      wasFiltered: data.wasFiltered,
    };

    return result;
  }

  private async searchDocsAsync(input: ToolInputType<SearchToolInput>): Promise<DataWithFilterInfo<SearchResult>> {
    const variables: GetDocsQueryVariables = {
      ...this.getPagingParamsForSearch(input),
      workspace_ids: input.workspaceIds?.map((id) => id.toString()),
    };

    const response = await this.mondayApi.request<GetDocsQuery>(getDocs, variables);
    const data = this.searchAndVirtuallyPaginate(input, response.docs || [], (doc) => doc!.name);

    const result = {
      items: data.items.map((doc) => ({
        id: ObjectPrefixes.DOCUMENT + doc!.id,
        title: doc!.name,
        url: doc!.url || undefined,
      })),
      wasFiltered: data.wasFiltered,
    };

    return result;
  }

  private async searchBoardsAsync(input: ToolInputType<SearchToolInput>): Promise<DataWithFilterInfo<SearchResult>> {
    const variables: GetBoardsQueryVariables = {
      ...this.getPagingParamsForSearch(input),
      workspace_ids: input.workspaceIds?.map((id) => id.toString()),
    };

    const response = await this.mondayApi.request<GetBoardsQuery>(getBoards, variables);
    const data = this.searchAndVirtuallyPaginate(input, response.boards || [], (board) => board!.name);

    const result = {
      items: data.items.map((board) => ({
        id: ObjectPrefixes.BOARD + board!.id,
        title: board!.name,
        url: board!.url,
      })),
      wasFiltered: data.wasFiltered,
    };

    return result;
  }

  private getPagingParamsForSearch(input: ToolInputType<SearchToolInput>, maxLimitForEntity: number = LOAD_INTO_MEMORY_LIMIT): { page: number; limit: number } {
    return {
      page: input.searchTerm ? 1 : input.page,
      limit: input.searchTerm ? Math.min(LOAD_INTO_MEMORY_LIMIT, maxLimitForEntity) : input.limit,
    };
  }

  private searchAndVirtuallyPaginate<T>(
    input: ToolInputType<SearchToolInput>,
    items: T[],
    nameGetter: (item: T) => string,
  ): DataWithFilterInfo<T> {
    if (items.length <= SEARCH_LIMIT) {
      return { items, wasFiltered: false };
    }

    const normalizedSearchTerm = normalizeString(input.searchTerm ?? '');
    const startIndex = (input.page - 1) * input.limit;
    const endIndex = startIndex + input.limit;

    const filteredItems = items
      .filter((item) => normalizeString(nameGetter(item)).includes(normalizedSearchTerm))
      .slice(startIndex, endIndex);

    return { items: filteredItems, wasFiltered: true };
  }
}
