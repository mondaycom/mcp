import { ManageItemUpdatesTool, manageItemUpdatesToolSchema } from '../../../src/core/platform-api-tools/manage-item-updates-tool';
import { ApiClient } from '@mondaydotcomorg/api';
import { FetchItemUpdatesQuery, CreateUpdateMutation, DeleteUpdateMutation } from '../../../src/monday-graphql/generated/graphql';
import { fetchItemUpdates, createUpdate as createUpdateMutation, deleteUpdate as deleteUpdateMutation } from '../../../src/monday-graphql/queries.graphql';

// Mock the ApiClient
jest.mock('@mondaydotcomorg/api');

const MockApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;

describe('ManageItemUpdatesTool', () => {
  let tool: ManageItemUpdatesTool;
  let mockRequest: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    MockApiClient.mockClear();
    mockRequest = jest.fn();
    MockApiClient.prototype.request = mockRequest;
    // Instantiate the tool with the mocked ApiClient instance
    // The actual token value doesn't matter here as ApiClient is mocked
    tool = new ManageItemUpdatesTool(new MockApiClient({ token: 'test-token' }));
  });

  describe('fetch operation', () => {
    it('should successfully fetch updates for an item', async () => {
      const mockItemId = 123;
      const mockLimit = 5;
      const mockApiResponse: FetchItemUpdatesQuery = {
        items: [
          {
            updates: [
              { id: 'update1', body: 'Update 1 body', text_body: 'Update 1 text', created_at: '2023-01-01T12:00:00Z', creator: { id: 'user1', name: 'User One' } },
              { id: 'update2', body: 'Update 2 body', text_body: 'Update 2 text', created_at: '2023-01-02T12:00:00Z', creator: { id: 'user2', name: 'User Two' } },
            ],
          },
        ],
      };

      mockRequest.mockResolvedValue(mockApiResponse);

      const input = {
        itemId: mockItemId,
        operation: 'fetch' as const,
        limit: mockLimit,
      };

      const result = await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(fetchItemUpdates, {
        itemId: mockItemId.toString(),
        limit: mockLimit,
      });
      // Assign to a variable first to help with type inference for the linter
      let expectedUpdates;
      if (mockApiResponse.items && mockApiResponse.items.length > 0 && mockApiResponse.items[0]?.updates) {
        expectedUpdates = mockApiResponse.items[0].updates;
      } else {
        expectedUpdates = undefined;
      }
      expect(result.content).toEqual(JSON.stringify(expectedUpdates, null, 2));
    });

    it('should return a message when no updates are found for an item', async () => {
      const mockItemId = 456;
      const mockLimit = 5;
      // Scenario 1: items array is null
      let mockApiResponse: FetchItemUpdatesQuery = {
        items: null,
      };
      mockRequest.mockResolvedValue(mockApiResponse);

      const input = {
        itemId: mockItemId,
        operation: 'fetch' as const,
        limit: mockLimit,
      };

      let result = await tool.execute(input);
      expect(mockRequest).toHaveBeenCalledWith(fetchItemUpdates, {
        itemId: mockItemId.toString(),
        limit: mockLimit,
      });
      expect(result.content).toEqual(`No updates found for item ${mockItemId}.`);

      // Scenario 2: items array is empty
      mockApiResponse = {
        items: [],
      };
      mockRequest.mockResolvedValue(mockApiResponse);
      result = await tool.execute(input);
      expect(result.content).toEqual(`No updates found for item ${mockItemId}.`);
      
      // Scenario 3: updates array is null
      mockApiResponse = {
        items: [
          {
            updates: null,
          }
        ]
      }
      mockRequest.mockResolvedValue(mockApiResponse);
      result = await tool.execute(input);
      expect(result.content).toEqual(`No updates found for item ${mockItemId}.`);

      // Scenario 4: updates array is empty
      mockApiResponse = {
        items: [
          {
            updates: [],
          },
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponse);
      result = await tool.execute(input);
      expect(result.content).toEqual(`No updates found for item ${mockItemId}.`);
    });

    it('should handle API errors when fetching updates', async () => {
      const mockItemId = 789;
      const mockLimit = 10;
      const errorMessage = 'Network Error';
      mockRequest.mockRejectedValue(new Error(errorMessage));

      const input = {
        itemId: mockItemId,
        operation: 'fetch' as const,
        limit: mockLimit,
      };

      const result = await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(fetchItemUpdates, {
        itemId: mockItemId.toString(),
        limit: mockLimit,
      });
      expect(result.content).toEqual(`Failed to fetch updates for item ${mockItemId}. Error: ${errorMessage}`);
    });
  });

  describe('create operation', () => {
    it('should successfully create an update for an item', async () => {
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
        itemId: mockItemId,
        operation: 'create' as const,
        body: mockBody,
        limit: 10,
      };

      const result = await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(createUpdateMutation, {
        itemId: mockItemId.toString(),
        body: mockBody,
      });
      expect(result.content).toEqual(`Successfully created update with ID ${mockCreatedUpdateId} for item ${mockItemId}.`);
    });

    it('should return an error if body is not provided for create operation', async () => {
      const mockItemId = 456;
      const input = {
        itemId: mockItemId,
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
        itemId: mockItemId,
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
        itemId: mockItemId,
        operation: 'create' as const,
        body: mockBody,
        limit: 10,
      };

      const result = await tool.execute(input);
      expect(result.content).toEqual(`Failed to create update for item ${mockItemId}. No update ID returned.`);
    });
  });

  describe('delete operation', () => {
    it('should successfully delete an update for an item', async () => {
      const mockItemId = 123;
      const mockUpdateId = 987;
      const mockApiResponse: DeleteUpdateMutation = {
        delete_update: {
          id: mockUpdateId.toString(),
        },
      };

      mockRequest.mockResolvedValue(mockApiResponse);

      const input = {
        itemId: mockItemId,
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

    it('should return an error if updateId is not provided for delete operation', async () => {
      const mockItemId = 456;
      const input = {
        itemId: mockItemId,
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
        itemId: mockItemId,
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
        itemId: mockItemId,
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