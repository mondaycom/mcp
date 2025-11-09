import { ToolInputType, ToolOutputType, ToolType } from 'src/core/tool';
import { z } from 'zod';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getBoards, getDocs, getFolders } from './search-tool.graphql';
import { GetBoardsQuery, GetBoardsQueryVariables, GetDocsQuery, GetDocsQueryVariables, GetFoldersQuery, GetFoldersQueryVariables } from 'src/monday-graphql/generated/graphql/graphql';
import { normalizeString } from 'src/utils/string.utils';
import { DataWithFilterInfo, GlobalSearchType, ObjectPrefixes, SearchResult } from './search-tool.types';
import { LOAD_INTO_MEMORY_LIMIT, SEARCH_LIMIT } from './search-tool.consts';


export const searchSchema = {
  searchTerm: z.string().optional().describe('The search term to use for the search.'),
  searchType: z.nativeEnum(GlobalSearchType).describe('The type of search to perform.'),
  limit: z.number().max(SEARCH_LIMIT).optional().default(SEARCH_LIMIT).describe(`The number of items to get. The max and default value is ${SEARCH_LIMIT}.`),
  page: z.number().optional().default(1).describe('The page number to get. The default value is 1.'),

  // for boards and docs
  workspaceIds: z.array(z.number()).optional().describe('The ids of the workspaces to search in. [IMPORTANT] Only pass this param if user explicitly asked to search within specific workspaces.'),

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
    const response = {
      disclaimer: (data.wasFiltered || !input.searchTerm)? undefined : '[IMPORTANT]Items were not filtered. Please perform the filtering.',
      results: data.items
    }
    
    return {
      content: JSON.stringify(response, null, 2)
    };
  }

  private async searchFoldersAsync(input: ToolInputType<SearchToolInput>): Promise<DataWithFilterInfo<SearchResult>> {
    const variables: GetFoldersQueryVariables = {
      ...this.getPagingParamsForSearch(input),
      workspace_ids: input.workspaceIds?.map((id) => id.toString()),
    };
    
    const response = await this.mondayApi.request<GetFoldersQuery>(getFolders, variables);
    const data = this.searchAndVirtuallyPaginate(input, response.folders || [], folder => folder!.name);
    
    const result = {
      items: data.items.map(folder => ({
        id: ObjectPrefixes.FOLDER + folder!.id,
        title: folder!.name,
      })),
      wasFiltered: data.wasFiltered,
    }

    return result;
  }

  private async searchDocsAsync(input: ToolInputType<SearchToolInput>): Promise<DataWithFilterInfo<SearchResult>> {
    const variables: GetDocsQueryVariables = {
      ...this.getPagingParamsForSearch(input),
      workspace_ids: input.workspaceIds?.map((id) => id.toString()),
    };
    
    const response = await this.mondayApi.request<GetDocsQuery>(getDocs, variables);
    const data = this.searchAndVirtuallyPaginate(input, response.docs || [], doc => doc!.name);

    const result = {
      items: data.items.map(doc => ({
        id: ObjectPrefixes.DOCUMENT + doc!.id,
        title: doc!.name,
        url: doc!.url || undefined,
      })),
      wasFiltered: data.wasFiltered,
    }

    return result;
  }

  private async searchBoardsAsync(input: ToolInputType<SearchToolInput>): Promise<DataWithFilterInfo<SearchResult>> {
    const variables: GetBoardsQueryVariables = {
      ...this.getPagingParamsForSearch(input),
      workspace_ids: input.workspaceIds?.map((id) => id.toString()),
    };
    
    const response = await this.mondayApi.request<GetBoardsQuery>(getBoards, variables);
    const data = this.searchAndVirtuallyPaginate(input, response.boards || [], board => board!.name);

    const result = {
      items: data.items.map(board => ({
        id: ObjectPrefixes.BOARD + board!.id,
        title: board!.name,
        url: board!.url,
      })),
      wasFiltered: data.wasFiltered,
    }

    return result;
  }

  private getPagingParamsForSearch(input: ToolInputType<SearchToolInput>): { page: number, limit: number } {
    return {
      page: input.searchTerm ? 1 : input.page,
      limit: input.searchTerm ? LOAD_INTO_MEMORY_LIMIT : input.limit,
    };
  }

  private searchAndVirtuallyPaginate<T>(input: ToolInputType<SearchToolInput>, items: T[], nameGetter: (item: T) => string): DataWithFilterInfo<T> {
    if(items.length <=  SEARCH_LIMIT) {
      return {items, wasFiltered: false};
    }

    const normalizedSearchTerm = normalizeString(input.searchTerm ?? '');
    const startIndex = (input.page - 1) * input.limit;
    const endIndex = startIndex + input.limit;

    const filteredItems = items
      .filter(item => normalizeString(nameGetter(item)).includes(normalizedSearchTerm))
      .slice(startIndex, endIndex);

    return { items: filteredItems, wasFiltered: true };
  }
}
