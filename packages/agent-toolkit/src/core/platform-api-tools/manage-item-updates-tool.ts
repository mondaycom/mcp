import { z } from 'zod';
import { BaseMondayApiTool } from './base-monday-api-tool';
import { ToolInputType, ToolOutputType, ToolType } from '../tool';
import { fetchItemUpdates } from '../../monday-graphql/queries.graphql';
import {
  FetchItemUpdatesQuery,
  FetchItemUpdatesQueryVariables,
  CreateUpdateMutation,
  CreateUpdateMutationVariables,
  DeleteUpdateMutation,
  DeleteUpdateMutationVariables,
} from '../../monday-graphql/generated/graphql';
import { createUpdate as createUpdateMutation, deleteUpdate as deleteUpdateMutation } from '../../monday-graphql/queries.graphql';

/**
 * Zod schema for the input of the ManageItemUpdatesTool.
 * Defines the expected structure and types for tool invocation arguments.
 */
export const manageItemUpdatesToolSchema = {
  /** ID of the monday.com item for which updates are to be managed. */
  itemId: z.number().describe('ID of the item to manage updates for.'),
  /** The operation to perform: 'fetch' to retrieve updates, 'create' to add a new update, or 'delete' to remove an update. */
  operation: z.enum(['fetch', 'create', 'delete']).describe("The operation to perform: 'fetch', 'create', or 'delete' updates."),
  /** The content of the update to be created. Required only if 'operation' is 'create'. */
  body: z.string().optional().describe('Content of the update to create. Required if operation is "create".'),
  /** Maximum number of updates to retrieve. Applicable only if 'operation' is 'fetch'. Defaults to 10. */
  limit: z.number().optional().default(10).describe('Maximum number of updates to fetch. Used if operation is "fetch".'),
  /** ID of the update to be deleted. Required only if 'operation' is 'delete'. */
  updateId: z.number().optional().describe('ID of the update to delete. Required if operation is "delete".'),
};

/**
 * A tool for managing item updates (comments) in monday.com.
 * 
 * Use this tool to:
 * - Fetch the latest updates (comments) for a specific item by providing the item ID and setting operation to 'fetch'.
 *   Optionally, specify 'limit' to control how many updates are returned (default is 10).
 * - Create a new update (comment) on a specific item by providing the item ID, setting operation to 'create', and supplying the update text in 'body'.
 * - Delete an existing update (comment) from an item by providing the item ID, setting operation to 'delete', and supplying the update's ID in 'updateId'.
 * 
 * Example usage:
 *   - To add an update: { itemId: 12345, operation: 'create', body: 'This is my update.' }
 *   - To fetch updates: { itemId: 12345, operation: 'fetch', limit: 5 }
 *   - To delete an update: { itemId: 12345, operation: 'delete', updateId: 67890 }
 * 
 * Use this tool whenever you want to programmatically add, retrieve, or remove comments/updates for Monday.com items.
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
      "Fetches, creates, or deletes updates (comments) for a Monday.com item. " +
      "Use 'operation: fetch' to retrieve the latest updates (requires 'itemId', optionally 'limit'). " +
      "Use 'operation: create' to add a new update (requires 'itemId' and 'body'). " +
      "Use 'operation: delete' to remove an update (requires 'itemId' and 'updateId'). " +
      "Typical use: 'Add an update to item 12345: \\\"This is my update\\\"', 'Fetch last 5 updates for item 12345', or 'Delete update 67890 from item 12345'."
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
   * If operation is 'fetch', it retrieves updates for the specified item.
   * If operation is 'create', it adds a new update to the specified item.
   * If operation is 'delete', it removes an update from the specified item.
   * @param input - The input arguments for the tool, conforming to manageItemUpdatesToolSchema.
   * @returns A promise resolving to an object containing the string output of the operation.
   */
  async execute(input: ToolInputType<typeof manageItemUpdatesToolSchema>): Promise<ToolOutputType<never>> {
    if (input.operation === 'fetch') {
      const variables: FetchItemUpdatesQueryVariables = {
        itemId: input.itemId.toString(),
        limit: input.limit,
      };

      try {
        const res = await this.mondayApi.request<FetchItemUpdatesQuery>(fetchItemUpdates, variables);
        const updates = res.items?.[0]?.updates;

        if (!updates || updates.length === 0) {
          return { content: `No updates found for item ${input.itemId}.` };
        }
        return { content: JSON.stringify(updates, null, 2) };
      } catch (error: any) {
        console.error(`Error fetching updates for item ${input.itemId}:`, error);
        return { content: `Failed to fetch updates for item ${input.itemId}. Error: ${error.message || 'Unknown error'}` };
      }
    } else if (input.operation === 'create') {
      if (!input.body) {
        // This should ideally be caught by Zod schema validation if 'body' was not optional
        // or if we added a refinement to the schema for conditional requirement.
        // For now, an explicit check is good for robustness.
        return { content: 'Error: Update body is required for the "create" operation.' };
      }

      const variables: CreateUpdateMutationVariables = {
        itemId: input.itemId.toString(), // API expects ID string
        body: input.body,
      };

      try {
        const res = await this.mondayApi.request<CreateUpdateMutation>(createUpdateMutation, variables);
        const createdUpdateId = res.create_update?.id;

        if (!createdUpdateId) {
          // This case might indicate an API error not caught by the catch block,
          // or an unexpected response structure.
          console.error('Failed to create update or extract ID for item', input.itemId, 'Response:', res);
          return { content: `Failed to create update for item ${input.itemId}. No update ID returned.` };
        }

        return { content: `Successfully created update with ID ${createdUpdateId} for item ${input.itemId}.` };
      } catch (error: any) {
        console.error(`Error creating update for item ${input.itemId}:`, error);
        return { content: `Failed to create update for item ${input.itemId}. Error: ${error.message || 'Unknown error'}` };
      }
    } else if (input.operation === 'delete') {
      if (!input.updateId) {
        return { content: 'Error: Update ID (updateId) is required for the "delete" operation.' };
      }

      const variables: DeleteUpdateMutationVariables = {
        updateId: input.updateId.toString(), // API expects ID string
      };

      try {
        const res = await this.mondayApi.request<DeleteUpdateMutation>(deleteUpdateMutation, variables);
        const deletedUpdateId = res.delete_update?.id;

        if (!deletedUpdateId) {
          // This could mean the update ID was not found or another issue occurred.
          console.error(`Failed to delete update ${input.updateId} for item ${input.itemId}, or no ID returned. Response:`, res);
          return { content: `Failed to delete update ${input.updateId} for item ${input.itemId}. Update may not exist or an API error occurred.` };
        }

        return { content: `Successfully deleted update with ID ${deletedUpdateId} from item ${input.itemId}.` };
      } catch (error: any) {
        console.error(`Error deleting update ${input.updateId} for item ${input.itemId}:`, error);
        return { content: `Failed to delete update ${input.updateId} for item ${input.itemId}. Error: ${error.message || 'Unknown error'}` };
      }
    } else {
      // Should not happen due to schema validation, but as a fallback:
      throw new Error(`Invalid operation: ${input.operation}. Must be "fetch", "create", or "delete".`);
    }
  }
} 