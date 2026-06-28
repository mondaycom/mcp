import { ToolInputType, ToolOutputType, ToolType } from 'src/core/tool';
import { z } from 'zod';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  getBoards,
  getDocs,
  getFolders,
  searchItems,
  searchWorkspaces,
  searchUpdates,
  searchTimelineItems,
} from './search-tool.graphql';
import { searchBoardsDev, searchDocsDev } from './search-tool.graphql.dev';
import {
  GetBoardsQuery,
  GetBoardsQueryVariables,
  GetDocsQuery,
  GetDocsQueryVariables,
  GetFoldersQuery,
  GetFoldersQueryVariables,
  SearchItemsQuery,
  SearchItemsQueryVariables,
  SearchWorkspacesQuery,
  SearchWorkspacesQueryVariables,
  SearchUpdatesQuery,
  SearchUpdatesQueryVariables,
  SearchTimelineItemsQuery,
  SearchTimelineItemsQueryVariables,
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
  searchTerm: z
    .string()
    .optional()
    .describe(
      'The search term to use. Required for ITEMS, WORKSPACES, UPDATES, and TIMELINE_ITEMS searches. Optional for BOARD, DOCUMENTS, and FOLDERS (omitting it lists all results).',
    ),
  searchType: z
    .nativeEnum(GlobalSearchType)
    .describe(
      'The type of search to perform. Valid values: BOARD, DOCUMENTS, FOLDERS, WORKSPACES, UPDATES, ITEMS, TIMELINE_ITEMS.',
    ),
  limit: z
    .number()
    .max(SEARCH_LIMIT)
    .optional()
    .default(SEARCH_LIMIT)
    .describe(`The number of items to get. Maximum is ${SEARCH_LIMIT} — do not exceed this value.`),
  page: z
    .number()
    .optional()
    .default(1)
    .describe(
      'Page number for listing without a searchTerm (BOARD/DOCUMENTS only). Pagination is NOT supported when searchTerm is provided.',
    ),

  // for boards and docs
  workspaceIds: z
    .array(z.number())
    .optional()
    .describe(
      'Array of workspace IDs (numbers) to search in. Required for FOLDERS search. For BOARD and DOCUMENTS search, only pass this if the user explicitly asked to search within specific workspaces. Example: [12345, 67890].',
    ),

  // for updates
  boardIds: z
    .array(z.number())
    .optional()
    .describe(
      'Array of board IDs (numbers) to scope the search to. Only applies to UPDATES search, and only pass it if the user explicitly asked to search within specific boards. Example: [12345, 67890].',
    ),
  creatorIds: z
    .array(z.number())
    .optional()
    .describe(
      'Array of user IDs (numbers) whose updates to search. Only applies to UPDATES search, and only pass it if the user explicitly asked to search updates by specific authors. Example: [12345, 67890].',
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
    return `Search within monday.com platform. Supported searchType values: BOARD, DOCUMENTS, FOLDERS, WORKSPACES, UPDATES, ITEMS, TIMELINE_ITEMS.
For searching/listing specific users and teams, use list_users_and_teams tool.
For account-level info (plan, member count, products), use get_user_context tool.
For groups, use get_board_info tool.
ITEMS search requires a searchTerm and only returns id, title, and url.
WORKSPACES search requires a searchTerm and only returns id, title, and description.
UPDATES search requires a searchTerm and returns id, title (the update body), itemId, boardId, and creatorId. Optionally scope it with boardIds and/or creatorIds.
TIMELINE_ITEMS search requires a searchTerm and returns id, title, summary, and content.
FOLDERS search requires workspaceIds and only returns id and title.
IMPORTANT: ids returned by this tool are prefixed with the type of the object (e.g doc-123, board-456, folder-789, workspace-101, update-303, item-321, timeline-item-654). When passing the ids to other tools, you need to remove the prefix and just pass the number.
    `;
  }

  getInputSchema(): SearchToolInput {
    return searchSchema;
  }

  protected async executeInternal(input: ToolInputType<SearchToolInput>): Promise<ToolOutputType<never>> {
    if (input.searchType !== GlobalSearchType.FOLDERS && input.searchTerm) {
      try {
        const data = await this.runSmartSearchAsync(input);

        return {
          content: { message: 'Search results', data: data.items },
        };
      } catch (error) {
        throwIfSearchTimeoutError(error);
        const searchTypesWithNoFallback = [
          GlobalSearchType.ITEMS,
          GlobalSearchType.WORKSPACES,
          GlobalSearchType.UPDATES,
          GlobalSearchType.TIMELINE_ITEMS,
        ];
        if (searchTypesWithNoFallback.includes(input.searchType)) {
          throw error;
        }
      }
    }

    const handlers: Record<
      GlobalSearchType,
      (input: ToolInputType<SearchToolInput>) => Promise<DataWithFilterInfo<SearchResult>>
    > = {
      [GlobalSearchType.BOARD]: this.searchBoardsAsync.bind(this),
      [GlobalSearchType.DOCUMENTS]: this.searchDocsAsync.bind(this),
      [GlobalSearchType.FOLDERS]: this.searchFoldersAsync.bind(this),
      [GlobalSearchType.WORKSPACES]: () => {
        throw new Error('Workspaces search requires a searchTerm');
      },
      [GlobalSearchType.UPDATES]: () => {
        throw new Error('Updates search requires a searchTerm');
      },
      [GlobalSearchType.ITEMS]: () => {
        throw new Error('Items search requires a searchTerm');
      },
      [GlobalSearchType.TIMELINE_ITEMS]: () => {
        throw new Error('Timeline items search requires a searchTerm');
      },
    };

    const data = await handlers[input.searchType](input);

    return {
      content: {
        message: 'Search results',
        disclaimer:
          data.wasFiltered || !input.searchTerm
            ? undefined
            : '[IMPORTANT]Items were not filtered. Please perform the filtering.',
        data: data.items,
      },
    };
  }

  private async runSmartSearchAsync(input: ToolInputType<SearchToolInput>): Promise<DataWithFilterInfo<SearchResult>> {
    if (input.page > 1) {
      throw new Error('Pagination is not supported for search, increase the limit parameter instead');
    }

    const workspaceIds = input.workspaceIds?.map((id) => id.toString());

    if (input.searchType === GlobalSearchType.BOARD) {
      return this.searchBoardsWithDevEndpointAsync(input.searchTerm!, input.limit, workspaceIds);
    }

    if (input.searchType === GlobalSearchType.DOCUMENTS) {
      return this.searchDocsWithDevEndpointAsync(input.searchTerm!, input.limit, workspaceIds);
    }

    if (input.searchType === GlobalSearchType.WORKSPACES) {
      return this.searchWorkspacesAsync(input.searchTerm!, input.limit);
    }

    if (input.searchType === GlobalSearchType.UPDATES) {
      const boardIds = input.boardIds?.map((id) => id.toString());
      const creatorIds = input.creatorIds?.map((id) => id.toString());
      return this.searchUpdatesAsync(input.searchTerm!, input.limit, boardIds, creatorIds);
    }

    if (input.searchType === GlobalSearchType.ITEMS) {
      return this.searchItemsAsync(input.searchTerm!, input.limit, workspaceIds);
    }

    if (input.searchType === GlobalSearchType.TIMELINE_ITEMS) {
      return this.searchTimelineItemsAsync(input.searchTerm!, input.limit);
    }

    throw new Error(`Unsupported search type for smart search: ${input.searchType}`);
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

  private async searchWorkspacesAsync(query: string, limit: number): Promise<DataWithFilterInfo<SearchResult>> {
    const variables: SearchWorkspacesQueryVariables = { query, limit };

    const response = await this.mondayApi.request<SearchWorkspacesQuery>(searchWorkspaces, variables, {
      timeout: SEARCH_TIMEOUT,
    });

    const items = response.search.workspaces.results.map((result) => ({
      id: ObjectPrefixes.WORKSPACE + result.indexed_data.id,
      title: result.indexed_data.name,
      description: result.indexed_data.description || undefined,
    }));

    return { items, wasFiltered: true };
  }

  private async searchUpdatesAsync(
    query: string,
    limit: number,
    boardIds?: string[],
    creatorIds?: string[],
  ): Promise<DataWithFilterInfo<SearchResult>> {
    const variables: SearchUpdatesQueryVariables = { query, limit, boardIds, creatorIds };

    const response = await this.mondayApi.request<SearchUpdatesQuery>(searchUpdates, variables, {
      timeout: SEARCH_TIMEOUT,
    });

    const items = response.search.updates.results.map((result) => ({
      id: ObjectPrefixes.UPDATE + result.indexed_data.id,
      title: result.indexed_data.body,
      itemId: result.indexed_data.item_id,
      boardId: result.indexed_data.board_id,
      creatorId: result.indexed_data.creator_id,
    }));

    return { items, wasFiltered: true };
  }

  private async searchItemsAsync(
    query: string,
    limit: number,
    workspaceIds?: string[],
  ): Promise<DataWithFilterInfo<SearchResult>> {
    const variables: SearchItemsQueryVariables = { query, limit, workspaceIds };

    const response = await this.mondayApi.request<SearchItemsQuery>(searchItems, variables, {
      timeout: SEARCH_TIMEOUT,
    });

    const items = response.search.items.results.map((result) => ({
      id: ObjectPrefixes.ITEM + result.indexed_data.id,
      title: result.indexed_data.name,
      url: result.indexed_data.url,
    }));

    return { items, wasFiltered: true };
  }

  private async searchTimelineItemsAsync(query: string, limit: number): Promise<DataWithFilterInfo<SearchResult>> {
    const variables: SearchTimelineItemsQueryVariables = { query, limit };

    const response = await this.mondayApi.request<SearchTimelineItemsQuery>(searchTimelineItems, variables, {
      timeout: SEARCH_TIMEOUT,
    });

    const items = response.search.timeline_items.results.map((result) => ({
      id: ObjectPrefixes.TIMELINE_ITEM + result.indexed_data.id,
      title: result.indexed_data.title,
      summary: result.indexed_data.summary || undefined,
      content: result.indexed_data.content || undefined,
    }));

    return { items, wasFiltered: true };
  }

  private async searchFoldersAsync(input: ToolInputType<SearchToolInput>): Promise<DataWithFilterInfo<SearchResult>> {
    const variables: GetFoldersQueryVariables = {
      ...this.getPagingParamsForSearch(input, MAX_FOLDERS_LIMIT),
      workspace_ids: input.workspaceIds?.map((id) => id.toString()),
    };
    variables.workspace_ids ??= [];

    if (variables.workspace_ids.length === 0) {
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

  private getPagingParamsForSearch(
    input: ToolInputType<SearchToolInput>,
    maxLimitForEntity: number = LOAD_INTO_MEMORY_LIMIT,
  ): { page: number; limit: number } {
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
