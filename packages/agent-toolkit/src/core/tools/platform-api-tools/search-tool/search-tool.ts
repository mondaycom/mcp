import { ToolInputType, ToolOutputType, ToolType } from 'src/core/tool';
import { z } from 'zod';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getFolders, searchItems, searchWorkspaces } from './search-tool.graphql';
import { searchBoardsDev, searchDocsDev } from './search-tool.graphql.dev';
import {
  GetFoldersQuery,
  GetFoldersQueryVariables,
  SearchItemsQuery,
  SearchItemsQueryVariables,
  SearchWorkspacesQuery,
  SearchWorkspacesQueryVariables,
} from 'src/monday-graphql/generated/graphql/graphql';
import {
  SearchBoardsDevQuery,
  SearchBoardsDevQueryVariables,
  SearchDocsDevQuery,
  SearchDocsDevQueryVariables,
} from 'src/monday-graphql/generated/graphql.dev/graphql';
import {
  searchUpdates,
  SearchUpdatesQuery,
  SearchUpdatesQueryVariables,
  searchTimelineItems,
  SearchTimelineItemsQuery,
  SearchTimelineItemsQueryVariables,
} from './search-tool.graphql.2026-10';
import { normalizeString } from 'src/utils/string.utils';
import { GlobalSearchType, ObjectPrefixes, SearchResult } from './search-tool.types';
import { MAX_FOLDERS_LIMIT, SEARCH_LIMIT } from './search-tool.consts';
import { SEARCH_TIMEOUT } from 'src/utils/time.utils';
import { rethrowWithContext, throwIfSearchTimeoutError } from 'src/utils/error.utils';

export const searchSchema = {
  searchTerm: z
    .string()
    .min(1)
    .describe('The search term to use.'),
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
For browsing all boards, docs, or folders within a workspace without a search term, use workspace_info tool.
For groups, use get_board_info tool.
ITEMS search returns id, title, and url.
WORKSPACES search returns id, title, and description.
UPDATES search returns id, title (the update body), itemId, boardId, and creatorId. Optionally scope it with boardIds and/or creatorIds.
TIMELINE_ITEMS search returns id, title, summary, and content.
FOLDERS search requires workspaceIds and returns id and title.
IMPORTANT: ids returned by this tool are prefixed with the type of the object (e.g doc-123, board-456, folder-789, workspace-101, update-303, item-321, timeline-item-654). When passing the ids to other tools, you need to remove the prefix and just pass the number.
  `;
  }

  getInputSchema(): SearchToolInput {
    return searchSchema;
  }

  protected async executeInternal(input: ToolInputType<SearchToolInput>): Promise<ToolOutputType<never>> {
    try {
      if (input.searchType === GlobalSearchType.FOLDERS) {
        const data = await this.searchFoldersAsync(input);
        return { content: { message: "Search results", data } };
      }

      const data = await this.runSmartSearchAsync(input);
      return { content: { message: "Search results", data } };
    } catch (error) {
      throwIfSearchTimeoutError(error);
      throw error;
    }
  }

  private async runSmartSearchAsync(
    input: ToolInputType<SearchToolInput>,
  ): Promise<SearchResult[]> {
    const workspaceIds = input.workspaceIds?.map((id) => id.toString());

    if (input.searchType === GlobalSearchType.BOARD) {
      return this.searchBoardsWithDevEndpointAsync(input.searchTerm, input.limit, workspaceIds);
    }

    if (input.searchType === GlobalSearchType.DOCUMENTS) {
      return this.searchDocsWithDevEndpointAsync(input.searchTerm, input.limit, workspaceIds);
    }

    if (input.searchType === GlobalSearchType.WORKSPACES) {
      return this.searchWorkspacesAsync(input.searchTerm, input.limit);
    }

    if (input.searchType === GlobalSearchType.UPDATES) {
      const boardIds = input.boardIds?.map((id) => id.toString());
      const creatorIds = input.creatorIds?.map((id) => id.toString());
      return this.searchUpdatesAsync(input.searchTerm, input.limit, boardIds, creatorIds);
    }

    if (input.searchType === GlobalSearchType.ITEMS) {
      return this.searchItemsAsync(input.searchTerm, input.limit, workspaceIds);
    }

    if (input.searchType === GlobalSearchType.TIMELINE_ITEMS) {
      return this.searchTimelineItemsAsync(input.searchTerm, input.limit);
    }

    throw new Error(`Unsupported search type for smart search: ${input.searchType}`);
  }

  private async searchBoardsWithDevEndpointAsync(
    query: string,
    limit: number,
    workspaceIds?: string[],
  ): Promise<SearchResult[]> {
    const variables: SearchBoardsDevQueryVariables = { query, limit, workspaceIds };

    const response = await this.mondayApi.request<SearchBoardsDevQuery>(searchBoardsDev, variables, {
      versionOverride: 'dev',
      timeout: SEARCH_TIMEOUT,
    });

    return response.search.boards.results.map((result) => ({
      id: ObjectPrefixes.BOARD + result.indexed_data.id,
      title: result.indexed_data.name,
      url: result.indexed_data.url,
    }));
  }

  private async searchDocsWithDevEndpointAsync(
    query: string,
    limit: number,
    workspaceIds?: string[],
  ): Promise<SearchResult[]> {
    const variables: SearchDocsDevQueryVariables = { query, limit, workspaceIds };

    const response = await this.mondayApi.request<SearchDocsDevQuery>(searchDocsDev, variables, {
      versionOverride: 'dev',
      timeout: SEARCH_TIMEOUT,
    });

    return response.search.docs.results.map((result) => ({
      id: ObjectPrefixes.DOCUMENT + result.indexed_data.id,
      title: result.indexed_data.name,
    }));
  }

  private async searchWorkspacesAsync(
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const variables: SearchWorkspacesQueryVariables = { query, limit };

    const response = await this.mondayApi.request<SearchWorkspacesQuery>(searchWorkspaces, variables, {
      timeout: SEARCH_TIMEOUT,
    });

    return response.search.workspaces.results.map((result) => ({
      id: ObjectPrefixes.WORKSPACE + result.indexed_data.id,
      title: result.indexed_data.name,
      description: result.indexed_data.description || undefined,
    }));
  }

  private async searchUpdatesAsync(
    query: string,
    limit: number,
    boardIds?: string[],
    creatorIds?: string[],
  ): Promise<SearchResult[]> {
    const variables: SearchUpdatesQueryVariables = { query, limit, boardIds, creatorIds };

    const response = await this.mondayApi.request<SearchUpdatesQuery>(searchUpdates, variables, {
      versionOverride: '2026-10',
      timeout: SEARCH_TIMEOUT,
    });

    return response.search.updates.results.map((result) => ({
      id: ObjectPrefixes.UPDATE + result.indexed_data.id,
      title: result.indexed_data.body,
      itemId: result.indexed_data.item_id,
      boardId: result.indexed_data.board_id,
      creatorId: result.indexed_data.creator_id,
    }));
  }

  private async searchItemsAsync(
    query: string,
    limit: number,
    workspaceIds?: string[],
  ): Promise<SearchResult[]> {
    const variables: SearchItemsQueryVariables = { query, limit, workspaceIds };

    const response = await this.mondayApi.request<SearchItemsQuery>(searchItems, variables, {
      timeout: SEARCH_TIMEOUT,
    });

    return response.search.items.results.map((result) => ({
      id: ObjectPrefixes.ITEM + result.indexed_data.id,
      title: result.indexed_data.name,
      url: result.indexed_data.url,
    }));
  }

  private async searchTimelineItemsAsync(
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const variables: SearchTimelineItemsQueryVariables = { query, limit };

    const response = await this.mondayApi.request<SearchTimelineItemsQuery>(searchTimelineItems, variables, {
      versionOverride: '2026-10',
      timeout: SEARCH_TIMEOUT,
    });

    return response.search.timeline_items.results.map((result) => ({
      id: ObjectPrefixes.TIMELINE_ITEM + result.indexed_data.id,
      title: result.indexed_data.title,
      summary: result.indexed_data.summary || undefined,
      content: result.indexed_data.content || undefined,
    }));
  }

  private async searchFoldersAsync(input: ToolInputType<SearchToolInput>): Promise<SearchResult[]> {
    const workspaceIds = input.workspaceIds?.map((id) => id.toString()) ?? [];

    if (workspaceIds.length === 0) {
      rethrowWithContext(new Error('Searching for folders require specifying workspace ids'), 'search folders');
    }

    const variables: GetFoldersQueryVariables = {
      page: 1,
      limit: MAX_FOLDERS_LIMIT,
      workspace_ids: workspaceIds,
    };

    const response = await this.mondayApi.request<GetFoldersQuery>(getFolders, variables);
    const folders = response.folders || [];

    const normalizedSearchTerm = normalizeString(input.searchTerm);
    const filteredFolders = folders.filter(
      (folder) => folder?.name && normalizeString(folder.name).includes(normalizedSearchTerm)
    );

    return filteredFolders
      .filter((folder) => folder?.id)
      .slice(0, input.limit)
      .map((folder) => ({
        id: ObjectPrefixes.FOLDER + folder!.id,
        title: folder!.name,
      }));
  }
}
