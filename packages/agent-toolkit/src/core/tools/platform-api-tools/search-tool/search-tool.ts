import { ToolInputType, ToolOutputType, ToolType } from 'src/core/tool';
import { z } from 'zod';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  getFolders,
  searchBoards,
  searchDocs,
  searchItems,
  searchWorkspaces,
  searchUpdates,
  searchTimelineItems,
} from './search-tool.graphql';
import { searchOverviewsDev } from './search-tool.graphql.dev';
import {
  GetFoldersQuery,
  GetFoldersQueryVariables,
  SearchBoardsQuery,
  SearchBoardsQueryVariables,
  SearchDocsQuery,
  SearchDocsQueryVariables,
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
  SearchOverviewsDevQuery,
  SearchOverviewsDevQueryVariables,
} from 'src/monday-graphql/generated/graphql.dev/graphql';
import { normalizeString } from 'src/utils/string.utils';
import { GlobalSearchType, SearchResult } from './search-tool.types';
import {
  MAX_FOLDERS_LIMIT,
  SEARCH_LIMIT,
  SEARCH_TYPE_ALIASES,
  SEARCH_TYPE_REDIRECTS,
  SUPPORTED_SEARCH_TYPES_TEXT,
  normalizeSearchType,
} from './search-tool.consts';
import { SEARCH_TIMEOUT } from 'src/utils/time.utils';
import { throwIfSearchTimeoutError } from 'src/utils/error.utils';

const SUPPORTED_SEARCH_TYPES = new Set<string>(Object.values(GlobalSearchType));

/**
 * Map an alias/case/plural variant to a supported searchType. Only resolved
 * (valid) values are normalized; anything that doesn't resolve is passed through
 * untouched so the raw input reaches the enum's errorMap as `received` and the
 * validation message can echo exactly what the caller sent (e.g. "board item"),
 * rather than the internal normalized form ("BOARD_ITEM").
 */
function preprocessSearchType(val: unknown): unknown {
  if (typeof val !== 'string') {
    return val;
  }
  const normalized = normalizeSearchType(val);
  const resolved = SEARCH_TYPE_ALIASES[normalized] ?? normalized;
  return SUPPORTED_SEARCH_TYPES.has(resolved) ? resolved : val;
}

/**
 * Produce an actionable message for invalid searchType values: list the valid
 * options, and when the value maps to a known intent (e.g. USERS, BOARD_ITEMS),
 * point the caller at the right tool so it can self-correct on retry.
 */
function searchTypeErrorMap(issue: z.ZodIssueOptionalMessage, ctx: { defaultError: string }): { message: string } {
  // Missing/null searchType surfaces as invalid_type with a type-name `received`.
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.received === 'undefined' || issue.received === 'null') {
      return { message: `searchType is required. Valid values: ${SUPPORTED_SEARCH_TYPES_TEXT}.` };
    }
    return { message: `searchType must be a string. Valid values: ${SUPPORTED_SEARCH_TYPES_TEXT}.` };
  }

  // A concrete-but-unsupported value surfaces as invalid_enum_value. `received`
  // is the caller's raw input (preprocessSearchType passes unresolved values
  // through), so it's echoed verbatim in the message; the redirect lookup
  // re-normalizes it to match a known intent.
  if (issue.code === z.ZodIssueCode.invalid_enum_value) {
    const received = String(issue.received);
    const redirect = SEARCH_TYPE_REDIRECTS[normalizeSearchType(received)];
    const base = `Invalid searchType "${received}". Valid values: ${SUPPORTED_SEARCH_TYPES_TEXT}.`;
    return { message: redirect ? `${base} ${redirect}` : base };
  }

  return { message: ctx.defaultError };
}

/**
 * Reshape a scalar or array of ids into an array, treating null/undefined as
 * omitted. Per-entry numeric coercion and validation (numeric strings, finite
 * check) is handled by z.coerce.number().finite() in the array's element
 * schema below, so this only normalizes the outer shape.
 */
function toIdArray(val: unknown): unknown {
  if (val === null || val === undefined) {
    return undefined;
  }
  return Array.isArray(val) ? val : [val];
}

/**
 * `null`/`undefined` resolve directly to SEARCH_LIMIT (rather than passing
 * `undefined` through) so a caller-supplied `null` behaves identically to an
 * omitted field instead of failing validation. Numeric coercion, finiteness,
 * and clamping happen in limitSchema below via z.coerce.number().finite().
 */
function preprocessLimit(val: unknown): unknown {
  return val === null || val === undefined ? SEARCH_LIMIT : val;
}

/**
 * Optional array-of-numbers id field that also accepts a scalar or numeric
 * strings; entries are coerced via z.coerce.number() and Infinity/NaN are
 * rejected via .finite(). Typed explicitly so the wrapping ZodEffects doesn't
 * blow TypeScript's inference depth in zodToJsonSchema.
 */
function optionalIdArray(description: string): z.ZodType<number[] | undefined, z.ZodTypeDef, unknown> {
  const schema = z.preprocess(toIdArray, z.array(z.coerce.number().finite()).optional()) as z.ZodType<
    number[] | undefined,
    z.ZodTypeDef,
    unknown
  >;
  return schema.describe(description);
}

/** Normalize an empty id-string array to undefined so "no ids" consistently means "no filter" across search types. */
function toFilterIds(ids?: string[]): string[] | undefined {
  return ids && ids.length > 0 ? ids : undefined;
}

// searchType/limit use preprocess wrappers; annotate them explicitly so the
// combined shape's ZodEffects don't push zodToJsonSchema past TS's inference depth.
const searchTypeSchema: z.ZodType<GlobalSearchType, z.ZodTypeDef, unknown> = z
  .preprocess(preprocessSearchType, z.nativeEnum(GlobalSearchType, { errorMap: searchTypeErrorMap }))
  .describe(`The type of search to perform. Valid values: ${SUPPORTED_SEARCH_TYPES_TEXT}.`) as z.ZodType<
  GlobalSearchType,
  z.ZodTypeDef,
  unknown
>;

const limitSchema: z.ZodType<number, z.ZodTypeDef, unknown> = z
  .preprocess(
    preprocessLimit,
    z.coerce
      .number()
      .finite()
      .transform((num) => Math.min(Math.max(Math.trunc(num), 1), SEARCH_LIMIT)),
  )
  .optional()
  .default(SEARCH_LIMIT)
  .describe(`The number of items to get. Maximum is ${SEARCH_LIMIT}.`) as z.ZodType<number, z.ZodTypeDef, unknown>;

export const searchSchema = {
  searchTerm: z
    .string()
    .trim()
    .min(1, { message: 'searchTerm must be a non-empty search string.' })
    .describe('The non-empty term to search for (at least one non-whitespace character).'),
  searchType: searchTypeSchema,
  limit: limitSchema,

  // for boards, docs, and dashboards
  workspaceIds: optionalIdArray(
    'Array of workspace IDs (numbers) to search in. Optional for FOLDERS search (searches all accessible workspaces when omitted). For BOARD, DOCUMENTS, and DASHBOARDS search, only pass this if the user explicitly asked to search within specific workspaces. Example: [12345, 67890].',
  ),

  // for updates
  boardIds: optionalIdArray(
    'Array of board IDs (numbers) to scope the search to. Only applies to UPDATES search, and only pass it if the user explicitly asked to search within specific boards. Example: [12345, 67890].',
  ),
  creatorIds: optionalIdArray(
    'Array of user IDs (numbers) whose items to search. Applies to UPDATES (filters by update author) and DASHBOARDS (filters by dashboard creator). Only pass it if the user explicitly asked to filter by specific creators. Example: [12345, 67890].',
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
    return `Search within monday.com platform. Supported searchType values: ${SUPPORTED_SEARCH_TYPES_TEXT}.
For searching/listing specific users and teams, use list_users_and_teams tool.
For account-level info (plan, member count, products), use get_user_context tool.
For browsing all boards, docs, or folders within a workspace without a search term, use workspace_info tool.
For groups, use get_board_info tool.
For listing items within a specific board, use get_board_items_page tool. ITEMS search here queries items across the account.
ITEMS search returns id, title, and url.
WORKSPACES search returns id, title, and description.
UPDATES search returns id, title (the update body), itemId, boardId, and creatorId. Optionally scope it with boardIds and/or creatorIds.
TIMELINE_ITEMS search returns id, title, summary, and content.
DASHBOARDS search (also called "overviews") returns id and title. Optionally scope it with workspaceIds and/or creatorIds.
FOLDERS search returns id and title. Optionally scope it with workspaceIds, which searches all accessible workspaces when omitted. Pass workspaceIds to narrow the search if results may be truncated.
  `;
  }

  getInputSchema(): SearchToolInput {
    return searchSchema;
  }

  protected async executeInternal(input: ToolInputType<SearchToolInput>): Promise<ToolOutputType<never>> {
    try {
      if (input.searchType === GlobalSearchType.FOLDERS) {
        const { results, truncated } = await this.searchFoldersAsync(input);
        const message = truncated
          ? `Search results (truncated: only the first ${MAX_FOLDERS_LIMIT} folders across the searched workspaces were scanned. Narrow with workspaceIds for complete results.)`
          : 'Search results';
        return { content: { message, data: results } };
      }

      const data = await this.runSmartSearchAsync(input);
      return { content: { message: 'Search results', data } };
    } catch (error) {
      throwIfSearchTimeoutError(error);
      throw error;
    }
  }

  private async runSmartSearchAsync(input: ToolInputType<SearchToolInput>): Promise<SearchResult[]> {
    const workspaceIds = toFilterIds(input.workspaceIds?.map((id) => id.toString()));

    if (input.searchType === GlobalSearchType.BOARD) {
      return this.searchBoardsAsync(input.searchTerm, input.limit, workspaceIds);
    }

    if (input.searchType === GlobalSearchType.DOCUMENTS) {
      return this.searchDocsAsync(input.searchTerm, input.limit, workspaceIds);
    }

    if (input.searchType === GlobalSearchType.WORKSPACES) {
      return this.searchWorkspacesAsync(input.searchTerm, input.limit);
    }

    if (input.searchType === GlobalSearchType.UPDATES) {
      const boardIds = toFilterIds(input.boardIds?.map((id) => id.toString()));
      const creatorIds = toFilterIds(input.creatorIds?.map((id) => id.toString()));
      return this.searchUpdatesAsync(input.searchTerm, input.limit, boardIds, creatorIds);
    }

    if (input.searchType === GlobalSearchType.ITEMS) {
      return this.searchItemsAsync(input.searchTerm, input.limit, workspaceIds);
    }

    if (input.searchType === GlobalSearchType.TIMELINE_ITEMS) {
      return this.searchTimelineItemsAsync(input.searchTerm, input.limit);
    }

    if (input.searchType === GlobalSearchType.DASHBOARDS) {
      const creatorIds = input.creatorIds?.map((id) => id.toString());
      return this.searchOverviewsAsync(input.searchTerm, input.limit, workspaceIds, creatorIds);
    }

    throw new Error(`Unsupported search type for smart search: ${input.searchType}`);
  }

  private async searchBoardsAsync(query: string, limit: number, workspaceIds?: string[]): Promise<SearchResult[]> {
    const variables: SearchBoardsQueryVariables = { query, limit, workspaceIds };

    const response = await this.mondayApi.request<SearchBoardsQuery>(searchBoards, variables, {
      timeout: SEARCH_TIMEOUT,
    });

    return response.search.boards.results.map((result) => ({
      id: result.indexed_data.id,
      title: result.indexed_data.name,
      url: result.indexed_data.url,
    }));
  }

  private async searchDocsAsync(query: string, limit: number, workspaceIds?: string[]): Promise<SearchResult[]> {
    const variables: SearchDocsQueryVariables = { query, limit, workspaceIds };

    const response = await this.mondayApi.request<SearchDocsQuery>(searchDocs, variables, {
      timeout: SEARCH_TIMEOUT,
    });

    return response.search.docs.results.map((result) => ({
      id: result.indexed_data.id,
      title: result.indexed_data.name,
    }));
  }

  private async searchWorkspacesAsync(query: string, limit: number): Promise<SearchResult[]> {
    const variables: SearchWorkspacesQueryVariables = { query, limit };

    const response = await this.mondayApi.request<SearchWorkspacesQuery>(searchWorkspaces, variables, {
      timeout: SEARCH_TIMEOUT,
    });

    return response.search.workspaces.results.map((result) => ({
      id: result.indexed_data.id,
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
      timeout: SEARCH_TIMEOUT,
    });

    return response.search.updates.results.map((result) => ({
      id: result.indexed_data.id,
      title: result.indexed_data.body,
      itemId: result.indexed_data.item_id,
      boardId: result.indexed_data.board_id,
      creatorId: result.indexed_data.creator_id,
    }));
  }

  private async searchItemsAsync(query: string, limit: number, workspaceIds?: string[]): Promise<SearchResult[]> {
    const variables: SearchItemsQueryVariables = { query, limit, workspaceIds };

    const response = await this.mondayApi.request<SearchItemsQuery>(searchItems, variables, {
      timeout: SEARCH_TIMEOUT,
    });

    return response.search.items.results.map((result) => ({
      id: result.indexed_data.id,
      title: result.indexed_data.name,
      url: result.indexed_data.url,
    }));
  }

  private async searchTimelineItemsAsync(query: string, limit: number): Promise<SearchResult[]> {
    const variables: SearchTimelineItemsQueryVariables = { query, limit };

    const response = await this.mondayApi.request<SearchTimelineItemsQuery>(searchTimelineItems, variables, {
      timeout: SEARCH_TIMEOUT,
    });

    return response.search.timeline_items.results.map((result) => ({
      id: result.indexed_data.id,
      title: result.indexed_data.title,
      summary: result.indexed_data.summary || undefined,
      content: result.indexed_data.content || undefined,
    }));
  }

  private async searchOverviewsAsync(
    query: string,
    limit: number,
    workspaceIds?: string[],
    creatorIds?: string[],
  ): Promise<SearchResult[]> {
    const variables: SearchOverviewsDevQueryVariables = { query, limit, workspaceIds, creatorIds };

    // search.overviews is only available in the dev schema; drop versionOverride once promoted to stable.
    const response = await this.mondayApi.request<SearchOverviewsDevQuery>(searchOverviewsDev, variables, {
      versionOverride: 'dev',
      timeout: SEARCH_TIMEOUT,
    });

    return response.search.overviews.results.map((result) => ({
      id: result.indexed_data.id,
      title: result.indexed_data.name,
    }));
  }

  private async searchFoldersAsync(
    input: ToolInputType<SearchToolInput>,
  ): Promise<{ results: SearchResult[]; truncated: boolean }> {
    const normalizedSearchTerm = normalizeString(input.searchTerm);
    // A searchTerm made only of characters normalizeString strips (e.g. "###" or
    // emoji) would otherwise normalize to '', and every string includes(''),
    // turning the filter below into a no-op that returns unrelated folders.
    if (!normalizedSearchTerm) {
      return { results: [], truncated: false };
    }

    const workspaceIds = toFilterIds(input.workspaceIds?.map((id) => id.toString()));

    // When no workspaceIds are provided, search folders across all accessible
    // workspaces rather than failing — the folders query treats workspace_ids as
    // an optional filter.
    const variables: GetFoldersQueryVariables = {
      page: 1,
      limit: MAX_FOLDERS_LIMIT,
      workspace_ids: workspaceIds,
    };

    const response = await this.mondayApi.request<GetFoldersQuery>(getFolders, variables);
    const folders = response.folders || [];

    const filteredFolders = folders.filter(
      (folder) => folder?.name && normalizeString(folder.name).includes(normalizedSearchTerm),
    );

    const results = filteredFolders
      .filter((folder) => folder?.id)
      .slice(0, input.limit)
      .map((folder) => ({
        id: folder!.id,
        title: folder!.name,
      }));

    return { results, truncated: folders.length === MAX_FOLDERS_LIMIT };
  }
}
