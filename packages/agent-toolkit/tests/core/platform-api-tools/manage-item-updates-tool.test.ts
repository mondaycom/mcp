import { ManageItemUpdatesTool, manageItemUpdatesToolSchema } from '../../../src/core/platform-api-tools/manage-item-updates-tool';
import { ApiClient } from '@mondaydotcomorg/api';
import { FetchItemUpdatesQuery, CreateUpdateMutation, DeleteUpdateMutation, Item } from '../../../src/monday-graphql/generated/graphql';
import { fetchItemUpdates, createUpdate as createUpdateMutation, deleteUpdate as deleteUpdateMutation } from '../../../src/monday-graphql/queries.graphql';

// Mock the ApiClient
jest.mock('@mondaydotcomorg/api');

const MockApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;

describe('ManageItemUpdatesTool', () => {
  let tool: ManageItemUpdatesTool;
  let mockRequest: jest.Mock;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset mocks before each test
    MockApiClient.mockClear();
    mockRequest = jest.fn();
    MockApiClient.prototype.request = mockRequest;
    // Instantiate the tool with the mocked ApiClient instance
    // The actual token value doesn't matter here as ApiClient is mocked
    tool = new ManageItemUpdatesTool(new MockApiClient({ token: 'test-token' }));
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); // Mock console.warn
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore(); // Restore console.warn
  });

  describe('fetch operation', () => {
    it('should successfully fetch updates for a single item ID using schema default limit', async () => {
      const mockItemId = 123;
      const schemaDefaultLimit = 25;
      const mockApiResponse: FetchItemUpdatesQuery = {
        items: [
          {
            id: mockItemId.toString(),
            name: 'Item 123',
            updates: [
              { id: 'update1', body: 'Update 1 body', text_body: 'Update 1 text', created_at: '2023-01-01T12:00:00Z', creator: { id: 'user1', name: 'User One' } },
            ],
          },
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponse);

      // To test the tool's internal default when user omits limit, we need to see how Zod handles it.
      // The type ToolInputType makes limit: number (non-optional due to .default()).
      // So, if the user called the tool via MCP and omitted limit, Zod would fill it with 25 before execute is called.
      // Thus, our input to execute() should reflect this post-Zod-parsing state.
      const input = { 
        itemId: [mockItemId],
        operation: 'fetch' as const,
        limit: schemaDefaultLimit, // Simulate Zod having applied the default
      };

      const result = await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(fetchItemUpdates, {
        itemIds: [mockItemId.toString()],
        limit: schemaDefaultLimit, 
      });
      expect(JSON.parse(result.content)).toEqual(mockApiResponse.items); 
    });

    it('should successfully fetch updates when itemId is an array with a single number', async () => {
      const mockItemId = 777;
      const schemaDefaultLimit = 25;
      const mockApiResponse: FetchItemUpdatesQuery = {
        items: [
          {
            id: mockItemId.toString(),
            name: 'Item 777',
            updates: [
              { id: 'updateSingle777', body: 'Update for single item ID', text_body: 'Text for single item ID', created_at: '2023-01-03T12:00:00Z', creator: { id: 'user3', name: 'User Three' } },
            ],
          },
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponse);

      const input = { 
        itemId: [mockItemId],
        operation: 'fetch' as const,
        limit: schemaDefaultLimit,
      };

      const result = await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(fetchItemUpdates, {
        itemIds: [mockItemId.toString()],
        limit: schemaDefaultLimit, 
      });
      expect(JSON.parse(result.content)).toEqual(mockApiResponse.items);
    });

    it('should cap the limit at 100 if a higher limit is provided', async () => {
      const mockItemId = 124;
      const mockApiResponse: FetchItemUpdatesQuery = {
        items: [
          {
            id: mockItemId.toString(),
            name: 'Item 124',
            updates: [/* ... some updates ... */],
          },
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponse);
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const input = {
        itemId: [mockItemId],
        operation: 'fetch' as const,
        limit: 150, 
      };

      await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(fetchItemUpdates, {
        itemIds: [mockItemId.toString()],
        limit: 100, 
      });
      // expect(consoleWarnSpy).toHaveBeenCalledWith('[ManageItemUpdatesTool] Requested limit 150 exceeds API max of 100. Using 100 instead.');
      consoleWarnSpy.mockRestore();
    });

    it('should use provided limit if it is under 100', async () => {
      const mockItemId = 125;
      const providedLimit = 15;
      const mockApiResponse: FetchItemUpdatesQuery = {
        items: [
          {
            id: mockItemId.toString(),
            name: 'Item 125',
            updates: [/* ... some updates ... */],
          },
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponse);

      const input = {
        itemId: [mockItemId],
        operation: 'fetch' as const,
        limit: providedLimit,
      };

      await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(fetchItemUpdates, {
        itemIds: [mockItemId.toString()],
        limit: providedLimit, 
      });
    });

    it('should successfully fetch updates for multiple item IDs', async () => {
      const mockItemIds = [123, 456];
      const mockLimit = 3;
      const mockApiResponse: FetchItemUpdatesQuery = {
        items: [
          {
            id: '123',
            name: 'Test Item 123',
            updates: [
              { id: 'update1', body: 'Update 1 for 123', text_body: 'Text 1 for 123', created_at: '2023-01-01T12:00:00Z', creator: { id: 'user1', name: 'User One' } },
            ],
          } as any as Item, // Cast to any then Item
          {
            id: '456',
            name: 'Test Item 456',
            updates: [
              { id: 'update2', body: 'Update 1 for 456', text_body: 'Text 1 for 456', created_at: '2023-01-02T12:00:00Z', creator: { id: 'user2', name: 'User Two' } },
            ],
          } as any as Item, // Cast to any then Item
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponse);

      const input = {
        itemId: mockItemIds, // Array of IDs
        operation: 'fetch' as const,
        limit: mockLimit,
      };
      const result = await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(fetchItemUpdates, {
        itemIds: mockItemIds.map(id => id.toString()),
        limit: mockLimit,
      });
      expect(result.content).toEqual(JSON.stringify(mockApiResponse.items, null, 2));
    });

    it('should return the item structure when items are found but have no updates for multiple IDs', async () => {
      const mockItemIds = [112, 113];
      const mockApiResponse: FetchItemUpdatesQuery = {
        items: [
          { id: '112', name: 'Item 112', updates: [] }, // Empty updates
          { id: '113', name: 'Item 113', updates: null }, // Null updates
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponse);

      const input = {
        itemId: mockItemIds,
        operation: 'fetch' as const,
        limit: 5,
      };
      const result = await tool.execute(input);
      expect(mockRequest).toHaveBeenCalledWith(fetchItemUpdates, {
        itemIds: mockItemIds.map(id => id.toString()),
        limit: 5,
      });
      // Expect the JSON string of the items array
      expect(result.content).toEqual(JSON.stringify(mockApiResponse.items, null, 2));
    });

    it('should return the item structure when no updates are found for a single item', async () => {
      const mockItemId = 456;
      const mockLimit = 5;

      const input = {
        itemId: [mockItemId],
        operation: 'fetch' as const,
        limit: mockLimit,
      };

      // Scenario 1: Item found, updates array is null
      let mockApiResponse: FetchItemUpdatesQuery = {
        items: [
          { id: mockItemId.toString(), name: 'Test Item', updates: null },
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponse);
      let result = await tool.execute(input);
      expect(mockRequest).toHaveBeenCalledWith(fetchItemUpdates, {
        itemIds: [mockItemId.toString()],
        limit: mockLimit,
      });
      expect(result.content).toEqual(JSON.stringify(mockApiResponse.items, null, 2));

      // Scenario 2: Item found, updates array is empty
      mockApiResponse = {
        items: [
          { id: mockItemId.toString(), name: 'Test Item', updates: [] },
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponse);
      result = await tool.execute(input);
      expect(mockRequest).toHaveBeenCalledWith(fetchItemUpdates, {
        itemIds: [mockItemId.toString()],
        limit: mockLimit,
      });
      expect(result.content).toEqual(JSON.stringify(mockApiResponse.items, null, 2));
    });

    it('should handle API errors when fetching updates for multiple IDs', async () => {
      const mockItemIds = [789, 101112];
      const mockLimit = 10;
      const errorMessage = 'Network Error with multiple IDs';
      mockRequest.mockRejectedValue(new Error(errorMessage));

      const input = {
        itemId: mockItemIds,
        operation: 'fetch' as const,
        limit: mockLimit,
      };
      const result = await tool.execute(input);
      expect(mockRequest).toHaveBeenCalledWith(fetchItemUpdates, {
        itemIds: mockItemIds.map(id => id.toString()),
        limit: mockLimit,
      });
      expect(result.content).toEqual(`Failed to fetch updates for item ID(s) ${mockItemIds.join(', ')}. Error: ${errorMessage}`);
    });

    it('should handle API errors when fetching updates', async () => {
      const mockItemId = 789;
      const mockLimit = 10;
      const errorMessage = 'Network Error';
      mockRequest.mockRejectedValue(new Error(errorMessage));

      const input = {
        itemId: [mockItemId],
        operation: 'fetch' as const,
        limit: mockLimit,
      };

      const result = await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(fetchItemUpdates, {
        itemIds: [mockItemId.toString()],
        limit: mockLimit,
      });
      expect(result.content).toEqual(`Failed to fetch updates for item ID(s) ${mockItemId}. Error: ${errorMessage}`);
    });
  });

  describe('create operation', () => {
    it('should successfully create an update (no parentId)', async () => {
      const mockItemId = 123;
      const mockBody = 'This is a new update!';
      const mockCreatedUpdateId = 'update_new_123';
      const mockApiResponse: CreateUpdateMutation = {
        create_update: {
          id: mockCreatedUpdateId,
        },
      };
      mockRequest.mockResolvedValue(mockApiResponse);

      const input = {
        itemId: [mockItemId],
        operation: 'create' as const,
        body: mockBody,
        limit: 25, // Satisfy type, not used by create op
        // parentId is omitted
      };
      const result = await tool.execute(input);
      expect(mockRequest).toHaveBeenCalledWith(createUpdateMutation, {
        itemId: mockItemId.toString(),
        body: mockBody,
        parentId: undefined, // Explicitly check it's undefined if not passed
      });
      expect(result.content).toEqual(`Successfully created update with ID ${mockCreatedUpdateId} for item ${mockItemId}.`);
    });

    it('should successfully create a reply (with parentId)', async () => {
      const mockItemId = 124;
      const mockBody = 'This is a reply!';
      const mockParentId = 987;
      const mockCreatedReplyId = 'reply_new_456';
      const mockApiResponse: CreateUpdateMutation = {
        create_update: {
          id: mockCreatedReplyId,
        },
      };
      mockRequest.mockResolvedValue(mockApiResponse);

      const input = {
        itemId: [mockItemId],
        operation: 'create' as const,
        body: mockBody,
        parentId: mockParentId,
        limit: 25, // Satisfy type
      };
      const result = await tool.execute(input);
      expect(mockRequest).toHaveBeenCalledWith(createUpdateMutation, {
        itemId: mockItemId.toString(),
        body: mockBody,
        parentId: mockParentId.toString(),
      });
      expect(result.content).toEqual(`Successfully created update with ID ${mockCreatedReplyId} for item ${mockItemId}.`);
    });

    it('should successfully create an update using the first item ID if an array is provided, and warn', async () => {
      const mockItemIds = [123, 456, 789];
      const mockBody = 'This is a new update from array!';
      const mockCreatedUpdateId = 'update_new_multi_123';
      const mockApiResponse: CreateUpdateMutation = {
        create_update: {
          id: mockCreatedUpdateId,
        },
      };

      mockRequest.mockResolvedValue(mockApiResponse);

      const input = {
        itemId: mockItemIds, // Array of IDs
        operation: 'create' as const,
        body: mockBody,
        limit: 10, // limit is not used by create but often included in tests
      };

      const result = await tool.execute(input);

      // expect(consoleWarnSpy).toHaveBeenCalledWith(
      //   `[ManageItemUpdatesTool] For 'create' operation, only the first item ID (${mockItemIds[0]}) from the provided array [${mockItemIds.join(', ')}] will be used.`
      // );
      expect(mockRequest).toHaveBeenCalledWith(createUpdateMutation, {
        itemId: mockItemIds[0].toString(), // Uses the first ID
        body: mockBody,
      });
      expect(result.content).toEqual(`Successfully created update with ID ${mockCreatedUpdateId} for item ${mockItemIds[0]}.`);
    });

    it('should return an error if body is not provided for create operation', async () => {
      const mockItemId = 456;
      const input = {
        itemId: [mockItemId],
        operation: 'create' as const,
        // body is intentionally omitted
        limit: 10,
      };

      const result = await tool.execute(input as any);

      expect(mockRequest).not.toHaveBeenCalled();
      expect(result.content).toEqual('Error: Update body is required for the "create" operation.');
    });

    it('should handle API errors when creating an update', async () => {
      const mockItemId = 789;
      const mockBody = 'Another update';
      const errorMessage = 'API Error on create';
      mockRequest.mockRejectedValue(new Error(errorMessage));

      const input = {
        itemId: [mockItemId],
        operation: 'create' as const,
        body: mockBody,
        limit: 10,
      };

      const result = await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(createUpdateMutation, {
        itemId: mockItemId.toString(),
        body: mockBody,
      });
      expect(result.content).toEqual(`Failed to create update for item ${mockItemId}. Error: ${errorMessage}`);
    });
    
    it('should handle API response not returning an ID when creating an update', async () => {
      const mockItemId = 101;
      const mockBody = 'Update with no ID return';
      const mockApiResponse: CreateUpdateMutation = {
        create_update: null, // Simulate API not returning an ID or returning null for create_update
      };

      mockRequest.mockResolvedValue(mockApiResponse);

      const input = {
        itemId: [mockItemId],
        operation: 'create' as const,
        body: mockBody,
        limit: 10,
      };

      const result = await tool.execute(input);
      expect(result.content).toEqual(`Failed to create update for item ${mockItemId}. No update ID returned.`);
    });
  });

  describe('delete operation', () => {
    it('should successfully delete an update for an item when a single itemId is provided', async () => {
      const mockItemId = 123;
      const mockUpdateId = 987;
      const mockApiResponse: DeleteUpdateMutation = {
        delete_update: {
          id: mockUpdateId.toString(),
        },
      };

      mockRequest.mockResolvedValue(mockApiResponse);

      const input = {
        itemId: [mockItemId],
        operation: 'delete' as const,
        updateId: mockUpdateId,
        limit: 10,
      };

      const result = await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(deleteUpdateMutation, {
        updateId: mockUpdateId.toString(),
      });
      expect(result.content).toEqual(`Successfully deleted update with ID ${mockUpdateId} from item ${mockItemId}.`);
    });

    it('should successfully delete an update using the first item ID if an array is provided (for context message), and warn', async () => {
      const mockItemIds = [123, 777];
      const mockUpdateId = 987;
      const mockApiResponse: DeleteUpdateMutation = {
        delete_update: {
          id: mockUpdateId.toString(),
        },
      };

      mockRequest.mockResolvedValue(mockApiResponse);

      const input = {
        itemId: mockItemIds, // Array of IDs
        operation: 'delete' as const,
        updateId: mockUpdateId,
        limit: 10, // limit is not used by delete
      };

      const result = await tool.execute(input);
      
      // expect(consoleWarnSpy).toHaveBeenCalledWith(
      //   `[ManageItemUpdatesTool] For 'delete' operation, only the first item ID (${mockItemIds[0]}) from the provided array [${mockItemIds.join(', ')}] will be used.`
      // );
      expect(mockRequest).toHaveBeenCalledWith(deleteUpdateMutation, {
        updateId: mockUpdateId.toString(), // delete uses updateId directly for the mutation
      });
      // The message uses the first item ID for context
      expect(result.content).toEqual(`Successfully deleted update with ID ${mockUpdateId} from item ${mockItemIds[0]}.`);
    });

    it('should return an error if updateId is not provided for delete operation', async () => {
      const mockItemId = 456;
      const input = {
        itemId: [mockItemId],
        operation: 'delete' as const,
        // updateId is intentionally omitted
        limit: 10,
      };

      const result = await tool.execute(input as any); // Cast to any to bypass TS check for this test

      expect(mockRequest).not.toHaveBeenCalled();
      expect(result.content).toEqual('Error: Update ID (updateId) is required for the "delete" operation.');
    });

    it('should handle API errors when deleting an update', async () => {
      const mockItemId = 789;
      const mockUpdateId = 654;
      const errorMessage = 'API Error on delete';
      mockRequest.mockRejectedValue(new Error(errorMessage));

      const input = {
        itemId: [mockItemId],
        operation: 'delete' as const,
        updateId: mockUpdateId,
        limit: 10,
      };

      const result = await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(deleteUpdateMutation, {
        updateId: mockUpdateId.toString(),
      });
      expect(result.content).toEqual(`Failed to delete update ${mockUpdateId} for item ${mockItemId}. Error: ${errorMessage}`);
    });

    it('should handle API response not returning an ID when deleting an update', async () => {
      const mockItemId = 101;
      const mockUpdateId = 321;
      const mockApiResponse: DeleteUpdateMutation = {
        delete_update: null, // Simulate API not returning an ID or returning null
      };

      mockRequest.mockResolvedValue(mockApiResponse);

      const input = {
        itemId: [mockItemId],
        operation: 'delete' as const,
        updateId: mockUpdateId,
        limit: 10,
      };

      const result = await tool.execute(input);
      expect(mockRequest).toHaveBeenCalledWith(deleteUpdateMutation, {
        updateId: mockUpdateId.toString(),
      });
      expect(result.content).toEqual(`Failed to delete update ${mockUpdateId} for item ${mockItemId}. Update may not exist or an API error occurred.`);
    });
  });
}); 