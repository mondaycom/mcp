import { z } from 'zod';
import { BaseMondayApiTool } from './base-monday-api-tool';
import { ToolInputType, ToolOutputType, ToolType } from '../tool';
import { listBoardItems } from '../../monday-graphql/queries.graphql';
import {
  ListBoardItemsQuery,
  ListBoardItemsQueryVariables,
  ItemsQuery, // Actual input type for query_params
  ItemsQueryRuleOperator, // Import the enum for operators
  // ItemsQueryRule, // Not directly needed if constructing inline
} from '../../monday-graphql/generated/graphql';

/**
 * Zod schema for the input of the ListBoardItemsTool.
 * Defines the arguments required to list items from a board, including pagination and filtering options.
 */
export const listBoardItemsToolSchema = {
  /** The ID of the monday.com board from which to list items. */
  boardId: z.number().describe('The ID of the board from which to list items.'),
  /** Optional: Maximum number of items to return per page. Defaults to 25. */
  limit: z.number().optional().default(25).describe('Maximum number of items to return per page. Defaults to 25.'),
  /** Optional: Cursor for fetching the next page of items. Obtained from a previous call to this tool. */
  cursor: z.string().optional().describe('Cursor for fetching the next page of items. Obtained from a previous call.'),
  /** Optional: ID of a specific group within the board to filter items by. */
  groupId: z.string().optional().describe('Optional: ID of a specific group to filter items by.'),
  /** Optional: Text to search for within item names. If empty or undefined, no name-based filtering is applied. */
  nameQuery: z
    .string()
    .optional()
    .describe('Optional: Text to search for in item names. If empty or undefined, no name filter is applied.'),
};

/**
 * A tool for listing items from a monday.com board with comprehensive support for
 * pagination and optional filtering by group ID and/or item name.
 *
 * Key Features:
 * - **Pagination**: Use `limit` (default 25) to specify page size and `cursor` (from a previous call) to fetch subsequent pages.
 * - **Name Filtering**: Provide `nameQuery` to search for items containing that text in their name. An empty or omitted `nameQuery` applies no name filter.
 * - **Group Filtering**: Provide `groupId` to retrieve items only from that specific group.
 * - **Combined Filtering**: Both `nameQuery` and `groupId` can be used together.
 *
 * The tool dynamically constructs query parameters for the Monday.com API based on the provided filters.
 * It returns an object containing the `boardName`, an array of `items` for the current page (each item includes `id`, `name`, and `group` details), and a `cursor` string for the next page (or `null` if no more items).
 *
 * Example Usage:
 * - To get the first 10 items: `{ boardId: 123, limit: 10 }`
 * - To get items from group 'g123' containing "Task": `{ boardId: 123, groupId: "g123", nameQuery: "Task" }`
 * - To get the next page from a previous call: `{ boardId: 123, cursor: "some_cursor_string" }`
 */
export class ListBoardItemsTool extends BaseMondayApiTool<typeof listBoardItemsToolSchema> {
  /** The unique name of the tool. */
  name = 'list_board_items';
  /** The type of the tool, indicating it performs read-only query operations. */
  type = ToolType.QUERY;

  /**
   * Provides a detailed, human-readable description of what the tool does,
   * intended for an AI model to understand its capabilities and parameters.
   * @returns A string describing the tool's purpose, inputs, pagination, filtering, and output structure.
   */
  getDescription(): string {
    return (
      'Lists items from a specified monday.com board. Required input: `boardId`. ' +
      'Supports pagination via optional `limit` (default 25) and `cursor` (string from previous call). ' +
      'Optionally filters by `groupId` (string) to get items from a specific group, and/or by `nameQuery` (string) for a text search within item names. ' +
      'If `nameQuery` is empty or omitted, no name filter is applied. ' +
      'Returns an object with `boardName` (string), `items` (array of item objects, each with `id`, `name`, `group`), and `cursor` (string or null for next page).'
    );
  }

  /**
   * Returns the Zod schema defining the input structure for this tool.
   */
  getInputSchema(): typeof listBoardItemsToolSchema {
    return listBoardItemsToolSchema;
  }

  /**
   * Executes the tool's logic to list board items.
   * @param input - The input arguments for the tool.
   * @returns A promise resolving to an object containing the list of items and a cursor for the next page.
   */
  async execute(input: ToolInputType<typeof listBoardItemsToolSchema>): Promise<ToolOutputType<never>> {
    // Initialize queryParams with the correct type. Cast to any initially to allow dynamic property assignment.
    const queryParams: Partial<ItemsQuery> = {};
    queryParams.rules = []; // Initialize rules array

    if (input.nameQuery && input.nameQuery.trim() !== '') {
      queryParams.rules.push({
        column_id: 'name', // Standard column ID for item name
        compare_value: input.nameQuery,
        operator: ItemsQueryRuleOperator.ContainsText, // Use the enum value
      });
    }

    if (input.groupId) {
      // Based on common Monday.com API patterns, filtering by group in items_page
      // often involves specifying the group_id directly within query_params, if supported by ItemsQuery type.
      // However, ItemsQuery revealed it doesn't have a direct `group_id` field.
      // So, we must use a rule. The exact column_id for group might be 'group'.
      // This assumes 'group' is a queryable column ID for group association.
      queryParams.rules.push({
        column_id: 'group', // This is an assumption for the group column ID in rules.
        // It might need to be different, e.g., a specific system ID for the group column.
        compare_value: [input.groupId], // compare_value for AnyOf is typically an array
        operator: ItemsQueryRuleOperator.AnyOf, // To match if the item is in any of the specified group_ids (here, just one)
      });
    }

    // If no rules were added, rules array should be undefined or not present
    if (queryParams.rules.length === 0) {
      delete queryParams.rules; // Or set to undefined, depending on API/client preference for empty arrays
    }

    const variables: ListBoardItemsQueryVariables = {
      boardId: input.boardId.toString(),
      limit: input.limit,
      cursor: input.cursor,
      // Only include queryParams if it has been populated (e.g., with rules)
      queryParams:
        (queryParams.rules && queryParams.rules.length > 0) || queryParams.groups
          ? (queryParams as ItemsQuery)
          : undefined,
    };

    try {
      const res = await this.mondayApi.request<ListBoardItemsQuery>(listBoardItems, variables);
      const boardData = res.boards?.[0];

      if (!boardData) {
        return { content: `Board with ID ${input.boardId} not found or access denied.` };
      }

      const itemsPage = boardData.items_page;
      const response = {
        boardName: boardData.name,
        items: itemsPage?.items || [],
        cursor: itemsPage?.cursor || null,
      };
      return { content: JSON.stringify(response, null, 2) };
    } catch (error: any) {
      // console.error(`Error listing items for board ${input.boardId}:`, error);
      return { content: `Failed to list items for board ${input.boardId}. Error: ${error.message || 'Unknown error'}` };
    }
  }
}
