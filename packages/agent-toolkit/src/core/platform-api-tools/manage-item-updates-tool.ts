import { z } from 'zod';
import { BaseMondayApiTool } from './base-monday-api-tool';
import { ToolInputType, ToolOutputType, ToolType } from '../tool';
import { fetchItemUpdates, fetchBoardUpdates } from '../../monday-graphql/queries.graphql';
import {
  FetchItemUpdatesQuery,
  FetchItemUpdatesQueryVariables,
  FetchBoardUpdatesQuery,
  FetchBoardUpdatesQueryVariables,
  CreateUpdateMutation,
  CreateUpdateMutationVariables,
  DeleteUpdateMutation,
  DeleteUpdateMutationVariables,
} from '../../monday-graphql/generated/graphql';
import {
  createUpdate as createUpdateMutation,
  deleteUpdate as deleteUpdateMutation,
} from '../../monday-graphql/queries.graphql';

/**
 * Zod schema for the input of the ManageItemUpdatesTool.
 * Defines the expected structure and types for tool invocation arguments.
 */
export const manageItemUpdatesToolSchema = {
  /**
   * Array of board IDs (usually one) to fetch updates from.
   * Used if 'operation' is 'fetch'. Takes precedence over 'itemId' for fetching if both are provided.
   */
  boardId: z
    .array(z.number()).min(1)
    .optional()
    .describe(
      'Array of board IDs (usually one) to fetch updates from. Used if operation is "fetch". Takes precedence over itemId for fetching if both are provided.',
    ),
  /**
   * Array of item IDs.
   * For 'fetch': Used if 'boardId' is not provided. Optional if boardId is used for fetching. Provide an array (e.g., [12345] or [123, 456]).
   * For 'create'/'delete': Required. Provide an array with one item ID (e.g., [12345]).
   */
  itemId: z
    .array(z.number()).min(1)
    .optional()
    .describe(
      "Array of item IDs. For 'fetch', used if 'boardId' is not provided. Optional if boardId is used for fetching. Provide an array (e.g., [12345] or [123, 456]). For 'create'/'delete', required. Provide an array with one item ID (e.g., [12345]).",
    ),
  /** The operation to perform: 'fetch' to retrieve updates, 'create' to add a new update, or 'delete' to remove an update. */
  operation: z
    .enum(['fetch', 'create', 'delete'])
    .describe("The operation to perform: 'fetch', 'create', or 'delete' updates."),
  /** The content of the update to be created. Required only if 'operation' is 'create'. */
  body: z.string().optional().describe('Content of the update to create. Required if operation is "create".'),
  /** Maximum number of updates to retrieve per item. Applicable only if 'operation' is 'fetch'. Defaults to 25. API max is 100. */
  limit: z
    .number()
    .optional()
    .default(25)
    .describe('Maximum number of updates to fetch per item. Used if operation is "fetch". Defaults to 25.'),
  /** ID of the update to be deleted. Required only if 'operation' is 'delete'. */
  updateId: z.number().optional().describe('ID of the update to delete. Required if operation is "delete".'),
  /** Optional: ID of the parent update to reply to. Used only if 'operation' is 'create'. */
  parentId: z
    .number()
    .optional()
    .describe("Optional: ID of the parent update to reply to. Used only if 'operation' is 'create'."),
};

/**
 * A tool for managing item updates (comments) in monday.com.
 *
 * Use this tool to:
 * - Fetch the latest updates for one or more items or entire boards: 
 *   - By item(s): Provide `itemId` (array of one or more item IDs, e.g., `[123]` or `[123, 456]`) and set operation to 'fetch'.
 *   - By board(s): Provide `boardId` (array of one or more board IDs, e.g., `[8102196205]`) and set operation to 'fetch'. `boardId` takes precedence if both are given.
 *   Optionally, specify 'limit' to control how many updates are returned per item/board (default is 25).
 * - Create a new update on a specific item: Provide `itemId` (array with a single item ID, e.g., `[12345]`), set operation to 'create', and supply 'body'.
 * - Delete an existing update from an item: Provide `itemId` (array with a single item ID, e.g., `[12345]`), set operation to 'delete', and supply 'updateId'.
 *
 * Example usage:
 *   - To fetch updates for item 123: { itemId: [123], operation: 'fetch' }
 *   - To fetch updates for items 123 and 456 with a limit of 5: { itemId: [123, 456], operation: 'fetch', limit: 5 }
 *   - To fetch updates for board 8102196205: { boardId: [8102196205], operation: 'fetch' }
 *   - To add an update to item 12345: { itemId: [12345], operation: 'create', body: 'This is my update.' }
 *   - To delete update 67890 from item 12345: { itemId: [12345], operation: 'delete', updateId: 67890 }
 */
export class ManageItemUpdatesTool extends BaseMondayApiTool<typeof manageItemUpdatesToolSchema> {
  /** The unique name of the tool. */
  name = 'manage_item_updates';
  /** The type of the tool, indicating it can perform mutations (data-changing operations). */
  type = ToolType.MUTATION;

  /**
   * Provides a human-readable description of what the tool does.
   * @returns A string describing the tool's purpose.
   */
  getDescription(): string {
    return (
      'Fetches, creates, or deletes updates (comments) for Monday.com items or fetches updates from boards. ' +
      "Use 'operation: fetch' with 'boardId' (number or array of numbers) to retrieve updates for entire board(s), " +
      "or with 'itemId' (number or array of numbers) for specific item(s). Optionally specify 'limit'. " +
      "If both 'boardId' and 'itemId' are provided for 'fetch', 'boardId' will be used. " +
      "Use 'operation: create' to add a new update (requires 'itemId' - number, and 'body', optionally 'parentId' to reply). " +
      "Use 'operation: delete' to remove an update (requires 'itemId' - number, and 'updateId'). " +
      "If an array of item IDs is given for 'create' or 'delete', only the first ID is used."
    );
  }

  /**
   * Returns the Zod schema defining the input structure for this tool.
   * @returns The Zod schema for tool input.
   */
  getInputSchema(): typeof manageItemUpdatesToolSchema {
    return manageItemUpdatesToolSchema;
  }

  /**
   * Executes the tool's logic based on the provided input.
   * @param input - The input arguments for the tool, conforming to manageItemUpdatesToolSchema.
   * @returns A promise resolving to an object containing the string output of the operation.
   */
  async execute(input: ToolInputType<typeof manageItemUpdatesToolSchema>): Promise<ToolOutputType<never>> {
    const getSingleItemIdForMutation = (itemIdInput: number[], operation: 'create' | 'delete'): number => {
      // itemIdInput is now guaranteed to be an array if provided to this function due to prior checks.
      const firstId = itemIdInput[0];
      if (itemIdInput.length > 1) {
        // console.warn(
        //   `[ManageItemUpdatesTool] For '${operation}' operation, only the first item ID (${firstId}) from the provided array [${itemIdInput.join(', ')}] will be used.`,
        // );
      }
      return firstId;
    };

    if (input.operation === 'fetch') {
      const effectiveLimit = input.limit && input.limit > 100 ? 100 : input.limit || 25;
      if (input.limit && input.limit > 100) {
        // console.warn(
        //   `[ManageItemUpdatesTool] Requested limit ${input.limit} exceeds API max of 100. Using 100 instead.`,
        // );
      }

      if (input.boardId) {
        // input.boardId is now guaranteed to be an array of numbers if defined.
        const boardIdsForQuery = input.boardId.map((id) => id.toString());

        const variables: FetchBoardUpdatesQueryVariables = {
          boardIds: boardIdsForQuery,
          limit: effectiveLimit,
        };

        try {
          const res = await this.mondayApi.request<FetchBoardUpdatesQuery>(fetchBoardUpdates, variables);
          const boardsFromApi = res.boards;

          if (!boardsFromApi || boardsFromApi.length === 0) {
            return {
              content: `No data returned from API for the provided board ID(s): ${boardIdsForQuery.join(', ')}.`,
            };
          }

          // Filter out null boards before processing
          const validBoards = boardsFromApi.filter((board) => board !== null) as Array<
            Exclude<(typeof boardsFromApi)[0], null>
          >;

          if (validBoards.length === 0) {
            // This case means all board IDs provided were invalid or returned null
            // console.warn(
            //   `[ManageItemUpdatesTool] No valid boards found for the provided board ID(s): ${boardIdsForQuery.join(', ')}.`,
            // );
            return {
              content: `No valid boards found or accessible for the provided board ID(s): ${boardIdsForQuery.join(', ')}.`,
            };
          }

          const allUpdates = validBoards.flatMap((board) =>
            (board.updates || []).map((update) => ({ ...update, board_id: board.id })),
          );

          if (allUpdates.length === 0) {
            // console.warn(
            //   `[ManageItemUpdatesTool] No updates found for the specified board ID(s): ${boardIdsForQuery.join(', ')}.`,
            // );
            const boardsResponse = validBoards.map((b) => ({ id: b.id, name: b.name, updates: [] }));
            return { content: JSON.stringify(boardsResponse, null, 2) };
          }
          return { content: JSON.stringify(allUpdates, null, 2) };
        } catch (error: any) {
          // console.error(`Error fetching updates for board ID(s) ${boardIdsForQuery.join(', ')}:`, error);
          return {
            content: `Failed to fetch updates for board ID(s) ${boardIdsForQuery.join(', ')}. Error: ${error.message || 'Unknown error'}`,
          };
        }
      } else if (input.itemId) {
        // input.itemId is now guaranteed to be an array of numbers if defined.
        const itemIdsForQuery = input.itemId.map((id) => id.toString());

        const variables: FetchItemUpdatesQueryVariables = {
          itemIds: itemIdsForQuery,
          limit: effectiveLimit,
        };

        try {
          const res = await this.mondayApi.request<FetchItemUpdatesQuery>(fetchItemUpdates, variables);
          const itemsFromApi = res.items;

          if (!itemsFromApi) {
            return { content: `No data returned from API for the provided item ID(s): ${itemIdsForQuery.join(', ')}.` };
          }
          const validItems = itemsFromApi.filter((item) => item !== null) as Array<
            Exclude<(typeof itemsFromApi)[0], null>
          >;

          if (validItems.length === 0) {
            return { content: `No items found for the provided item ID(s): ${itemIdsForQuery.join(', ')}.` };
          }

          const itemsWithoutUpdates = validItems
            .filter((item) => !item.updates || item.updates.length === 0)
            .map((item) => item.id);
          if (itemsWithoutUpdates.length > 0 && itemsWithoutUpdates.length < validItems.length) {
            // console.warn(
            //   `[ManageItemUpdatesTool] Some items had no updates: ${itemsWithoutUpdates.join(', ')}. Returning full structure.`,
            // );
          } else if (itemsWithoutUpdates.length === validItems.length) {
            // console.warn(
            //   `[ManageItemUpdatesTool] None of the fetched items have updates for ID(s): ${itemIdsForQuery.join(', ')}. Returning item structure.`,
            // );
          }
          return { content: JSON.stringify(validItems, null, 2) };
        } catch (error: any) {
          // console.error(`Error fetching updates for item ID(s) ${itemIdsForQuery.join(', ')}:`, error);
          return {
            content: `Failed to fetch updates for item ID(s) ${itemIdsForQuery.join(', ')}. Error: ${error.message || 'Unknown error'}`,
          };
        }
      } else {
        return { content: 'Error: For "fetch" operation, either "boardId" or "itemId" must be provided.' };
      }
    } else if (input.operation === 'create') {
      if (!input.body) {
        return { content: 'Error: Update body is required for the "create" operation.' };
      }
      if (!input.itemId) {
        return { content: 'Error: Item ID is required for the "create" operation.' };
      }
      const actualItemId = getSingleItemIdForMutation(input.itemId, 'create');

      const variables: CreateUpdateMutationVariables = {
        itemId: actualItemId.toString(),
        body: input.body,
        // Add parentId if provided
        ...(input.parentId && { parentId: input.parentId.toString() }),
      };

      try {
        const res = await this.mondayApi.request<CreateUpdateMutation>(createUpdateMutation, variables);
        const createdUpdateId = res.create_update?.id;

        if (!createdUpdateId) {
          // console.error('Failed to create update or extract ID for item', actualItemId, 'Response:', res);
          return { content: `Failed to create update for item ${actualItemId}. No update ID returned.` };
        }
        return { content: `Successfully created update with ID ${createdUpdateId} for item ${actualItemId}.` };
      } catch (error: any) {
        // console.error(`Error creating update for item ${actualItemId}:`, error);
        return {
          content: `Failed to create update for item ${actualItemId}. Error: ${error.message || 'Unknown error'}`,
        };
      }
    } else if (input.operation === 'delete') {
      if (!input.updateId) {
        return { content: 'Error: Update ID (updateId) is required for the "delete" operation.' };
      }
      if (!input.itemId) {
        return { content: 'Error: Item ID is required for the "delete" operation.' };
      }
      const actualItemId = getSingleItemIdForMutation(input.itemId, 'delete');

      const variables: DeleteUpdateMutationVariables = {
        updateId: input.updateId.toString(),
      };

      try {
        const res = await this.mondayApi.request<DeleteUpdateMutation>(deleteUpdateMutation, variables);
        const deletedUpdateId = res.delete_update?.id;

        if (!deletedUpdateId) {
          // console.error(
          //   `Failed to delete update ${input.updateId} for item ${actualItemId}, or no ID returned. Response:`,
          //   res,
          // );
          return {
            content: `Failed to delete update ${input.updateId} for item ${actualItemId}. Update may not exist or an API error occurred.`,
          };
        }
        return { content: `Successfully deleted update with ID ${deletedUpdateId} from item ${actualItemId}.` };
      } catch (error: any) {
        // console.error(`Error deleting update ${input.updateId} for item ${actualItemId}:`, error);
        return {
          content: `Failed to delete update ${input.updateId} for item ${actualItemId}. Error: ${error.message || 'Unknown error'}`,
        };
      }
    } else {
      throw new Error(`Invalid operation: ${(input as any).operation}. Must be "fetch", "create", or "delete".`);
    }
  }
}
