import { ToolInputType, ToolOutputType, ToolType } from 'src/core/tool';
import { z } from 'zod';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getBoards, getBoardsByName, getDocs } from './search-tool.graphql';
import { GetBoardsByNameQuery, GetBoardsByNameQueryVariables, GetBoardSchemaQuery, GetBoardsQuery, GetBoardsQueryVariables, GetDocsQuery, GetDocsQueryVariables } from 'src/monday-graphql';

const SEARCH_LIMIT = 100;
const LOAD_INTO_MEMORY_LIMIT = 10_000;

export interface SearchResult {
  id: string;
  title: string;
  url: string | null;
}

export enum ObjectPrefixes {
  BOARD = 'board-',
  DOCUMENT = 'doc-',
  FOLDER = 'folder-',
}

export enum GlobalSearchType {
  BOARD = 'BOARD',
  DOCUMENTS = 'DOCUMENTS',
  FOLDERS = 'FOLDERS',
  
  // Why other types are not included:
  // FORMS = 'FORMS', - forms are not supported
  // USERS = 'USERS', // already supported by list_users_and_teams tool
  // TEAMS = 'TEAMS', // already supported by list_users_and_teams tool
  // WORKSPACES = 'WORKSPACES', // already supported by list_workspaces tool
  // ITEMS = 'ITEMS', // already supported by get_board_items_page tool
  // GROUPS = 'GROUPS', // already supported by get_board_info tool
}

export const searchSchema = {
  searchTerm: z.string().optional().describe('The search term to use for the search.'),
  searchType: z.nativeEnum(GlobalSearchType).describe('The type of search to perform.'),
  limit: z.number().max(SEARCH_LIMIT).optional().default(SEARCH_LIMIT).describe('The number of items to get'),
  page: z.number().optional().default(1).describe('The page number to get'),

  // for boards and docs
  workspaceIds: z.array(z.number()).optional().describe('The ids of the workspaces to search in. Pass if you want to search only in specific workspaces.'),

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
    `;
  }


  getInputSchema(): SearchToolInput {
    return searchSchema;
  }
  
  protected async executeInternal(input: ToolInputType<SearchToolInput>): Promise<ToolOutputType<never>> {
    const handlers = {
      [GlobalSearchType.BOARD]: this.searchBoardsAsync.bind(this),
      [GlobalSearchType.DOCUMENTS]: this.searchDocsAsync.bind(this),
      [GlobalSearchType.FOLDERS]: this.searchFoldersAsync.bind(this), // Not implemented yet
    };

    const handler = handlers[input.searchType];
    
    if (!handler) {
      throw new Error(`Unsupported search type: ${input.searchType}`);
    }

    const results = await handler(input);
    
    return {
      content: [ {type: 'text', text: JSON.stringify({results}, null, 2) }]
    };
  }

  private async searchFoldersAsync(input: ToolInputType<SearchToolInput>): Promise<SearchResult[]> {
    throw new Error('Not implemented');
  }

  private async searchDocsAsync(input: ToolInputType<SearchToolInput>): Promise<SearchResult[]> {
    const variables: GetDocsQueryVariables = {
      ...this.getPagingParamsForSearch(input),
      workspace_ids: input.workspaceIds?.map((id) => id.toString()),
    };
    
    const response = await this.mondayApi.request<GetDocsQuery>(getDocs, variables);
    const data = this.searchAndVirtuallyPaginate(input, response.docs || [], doc => doc!.name);
    
    return data.map(doc => ({
      id: ObjectPrefixes.DOCUMENT + doc!.id,
      title: doc!.name,
      url: doc!.url || null,
    }));
  }

  private async searchBoardsAsync(input: ToolInputType<SearchToolInput>): Promise<SearchResult[]> {
    if(input.searchTerm) {
      return this.searchBoardsByNameAsync(input);
    }
    return this.searchBoardsWithoutNameAsync(input);
  }

  private async searchBoardsByNameAsync(input: ToolInputType<SearchToolInput>): Promise<SearchResult[]> {
    const variables: GetBoardsByNameQueryVariables = {
      ...this.getPagingParamsForSearch(input),
      workspace_ids: input.workspaceIds?.map((id) => id.toString()),
      search_term: input.searchTerm!
    };

    const response = await this.mondayApi.request<GetBoardsByNameQuery>(getBoardsByName, variables);

    return response.boards_by_name?.map(board => ({
      id: ObjectPrefixes.BOARD + board!.id,
      title: board!.name,
      url: board!.url,
    })) || [];
  }

  private async searchBoardsWithoutNameAsync(input: ToolInputType<SearchToolInput>): Promise<SearchResult[]> {
    const variables: GetBoardsQueryVariables = {
      ...this.getPagingParamsForSearch(input),
      workspace_ids: input.workspaceIds?.map((id) => id.toString()),
    };
    
    const response = await this.mondayApi.request<GetBoardsQuery>(getBoards, variables);
    const data = this.searchAndVirtuallyPaginate(input, response.boards || [], board => board!.name);

    return data.map(board => ({
      id: ObjectPrefixes.BOARD + board!.id,
      title: board!.name,
      url: board!.url,
    }));
  }

  private getPagingParamsForSearch(input: ToolInputType<SearchToolInput>): { page: number, limit: number } {
    return {
      page: input.searchTerm ? 1 : input.page,
      limit: input.searchTerm ? LOAD_INTO_MEMORY_LIMIT : input.limit,
    };
  }

  private searchAndVirtuallyPaginate<T>(input: ToolInputType<SearchToolInput>, items: T[], nameGetter: (item: T) => string): T[] {
    if(items.length <= input.limit) {
      return items;
    }

    const normalizedSearchTerm = this.normalizeSearchTerm(input.searchTerm ?? '');
    const startIndex = (input.page - 1) * input.limit;
    const endIndex = startIndex + input.limit;

    return items
      .filter(item => this.normalizeSearchTerm(nameGetter(item)).includes(normalizedSearchTerm))
      .slice(startIndex, endIndex);
  }

  private normalizeSearchTerm(searchTerm: string): string {
    // TODO: Implement later
    return searchTerm;
  }
}
