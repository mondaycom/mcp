import { z } from 'zod';
import { createMockApiClient } from '../test-utils/mock-api-client';
import { CreateItemTool } from './create-item-tool';
import { ChangeItemColumnValuesTool } from '../change-item-column-values-tool';

// Mock the ChangeItemColumnValuesTool
jest.mock('../change-item-column-values-tool');
const MockedChangeItemColumnValuesTool = ChangeItemColumnValuesTool as jest.MockedClass<typeof ChangeItemColumnValuesTool>;

// Test the schema definitions directly to avoid circular dependency issues
describe('Create Item Tool Behaviour', () => {

  describe('Behaviour Tests', () => {
    let mocks: ReturnType<typeof createMockApiClient>;
    let mockChangeColumnValuesTool: jest.Mocked<ChangeItemColumnValuesTool>;

    beforeEach(() => {
      mocks = createMockApiClient();
      jest.clearAllMocks();
      
      // Setup mock for ChangeItemColumnValuesTool
      mockChangeColumnValuesTool = {
        execute: jest.fn(),
      } as any;
      MockedChangeItemColumnValuesTool.mockImplementation(() => mockChangeColumnValuesTool);
    });

    const successfulCreateItemResponse = {
      create_item: {
        id: '123456789',
        name: 'New Item'
      }
    };

    const successfulDuplicateItemResponse = {
      duplicate_item: {
        id: '987654321',
        name: 'Duplicated Item'
      }
    };

    const successfulUpdateResponse = {
      content: 'Item 987654321 successfully updated with the new column values'
    };

    describe('Create New Item Path', () => {
      it('Successfully creates a new item', async () => {
        mocks.setResponse(successfulCreateItemResponse);

        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });

        const result = await tool.execute({
          name: 'Test Item',
          columnValues: '{"text_column": "Test Value"}',
          groupId: 'group123'
        });

        expect(result.content).toBe('Item 123456789 successfully created');
        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('mutation createItem'),
          {
            boardId: '456',
            itemName: 'Test Item',
            groupId: 'group123',
            columnValues: '{"text_column": "Test Value"}'
          }
        );
      });

      it('Successfully creates a new item without groupId', async () => {
        mocks.setResponse(successfulCreateItemResponse);

        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });

        const result = await tool.execute({
          name: 'Test Item',
          columnValues: '{"text_column": "Test Value"}'
        });

        expect(result.content).toBe('Item 123456789 successfully created');
        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('mutation createItem'),
          {
            boardId: '456',
            itemName: 'Test Item',
            groupId: undefined,
            columnValues: '{"text_column": "Test Value"}'
          }
        );
      });

      it('Successfully creates a new item with boardId in input', async () => {
        mocks.setResponse(successfulCreateItemResponse);

        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token');

        const result = await tool.execute({
          boardId: 789,
          name: 'Test Item',
          columnValues: '{"text_column": "Test Value"}'
        });

        expect(result.content).toBe('Item 123456789 successfully created');
        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('mutation createItem'),
          {
            boardId: '789',
            itemName: 'Test Item',
            groupId: undefined,
            columnValues: '{"text_column": "Test Value"}'
          }
        );
      });

      it('Passes GraphQL errors to caller for create path', async () => {
        mocks.setError('Bad thing happened!');

        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });

        await expect(tool.execute({
          name: 'Test Item',
          columnValues: '{"text_column": "Test Value"}'
        })).rejects.toThrow('Bad thing happened!');
      });

      it('Handles GraphQL response errors for create path', async () => {
        const graphqlError = new Error('GraphQL Error');
        (graphqlError as any).response = {
          errors: [
            { message: 'Invalid board ID' },
            { message: 'Insufficient permissions' }
          ]
        };
        mocks.setError(graphqlError);

        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });

        await expect(tool.execute({
          name: 'Test Item',
          columnValues: '{"text_column": "Test Value"}'
        })).rejects.toThrow('Failed to create item: Invalid board ID, Insufficient permissions');
      });

      it('Handles GraphQL response errors for create path with single error', async () => {
        const graphqlError = new Error('GraphQL Error');
        (graphqlError as any).response = {
          errors: [
            { message: 'Board not found' }
          ]
        };
        mocks.setError(graphqlError);

        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });

        await expect(tool.execute({
          name: 'Test Item',
          columnValues: '{"text_column": "Test Value"}'
        })).rejects.toThrow('Failed to create item: Board not found');
      });
    });

    describe('Duplicate and Update Item Path', () => {
      it('Successfully duplicates and updates an item', async () => {
        // Mock the duplicate response
        mocks.setResponse(successfulDuplicateItemResponse);
        // Mock the update response
        mockChangeColumnValuesTool.execute.mockResolvedValue(successfulUpdateResponse);

        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });

        const result = await tool.execute({
          name: 'Updated Item',
          columnValues: '{"text_column": "Updated Value"}',
          duplicateFromItemId: 123
        });

        expect(result.content).toBe('Item 987654321 successfully duplicated from 123 and updated');
        
        // Verify duplicate call
        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('mutation duplicateItem'),
          {
            boardId: '456',
            itemId: '123'
          }
        );

        // Verify ChangeItemColumnValuesTool was called correctly
        expect(MockedChangeItemColumnValuesTool).toHaveBeenCalledWith(
          mocks.mockApiClient,
          'fake_token',
          { boardId: 456 }
        );
        expect(mockChangeColumnValuesTool.execute).toHaveBeenCalledWith({
          itemId: 987654321,
          columnValues: '{"text_column":"Updated Value","name":"Updated Item"}'
        });
      });

      it('Throws error when duplicate item fails', async () => {
        mocks.setError('Duplicate failed');

        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });

        await expect(tool.execute({
          name: 'Updated Item',
          columnValues: '{"text_column": "Updated Value"}',
          duplicateFromItemId: 123
        })).rejects.toThrow('Duplicate failed');
      });

      it('Handles GraphQL response errors for duplicate path', async () => {
        const graphqlError = new Error('GraphQL Error');
        (graphqlError as any).response = {
          errors: [
            { message: 'Item not found' },
            { message: 'Cannot duplicate item' }
          ]
        };
        mocks.setError(graphqlError);

        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });

        await expect(tool.execute({
          name: 'Updated Item',
          columnValues: '{"text_column": "Updated Value"}',
          duplicateFromItemId: 123
        })).rejects.toThrow('Failed to duplicate item: Item not found, Cannot duplicate item');
      });

      it('Handles invalid JSON in columnValues for duplicate path', async () => {
        // Set up a successful duplicate response so the API call succeeds, but JSON parsing fails
        mocks.setResponse(successfulDuplicateItemResponse);
        
        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });

        await expect(tool.execute({
          name: 'Updated Item',
          columnValues: 'invalid json',
          duplicateFromItemId: 123
        })).rejects.toThrow('Invalid JSON in columnValues');
      });

      it('Throws error when duplicate item returns no item', async () => {
        mocks.setResponse({ duplicate_item: null });

        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });

        await expect(tool.execute({
          name: 'Updated Item',
          columnValues: '{"text_column": "Updated Value"}',
          duplicateFromItemId: 123
        })).rejects.toThrow('Failed to duplicate item');
      });

      it('Throws error when update fails', async () => {
        mocks.setResponse(successfulDuplicateItemResponse);
        mockChangeColumnValuesTool.execute.mockResolvedValue({
          content: 'Error: Update failed'
        });

        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });

        await expect(tool.execute({
          name: 'Updated Item',
          columnValues: '{"text_column": "Updated Value"}',
          duplicateFromItemId: 123
        })).rejects.toThrow('Failed to update duplicated item: Error: Update failed');
      });

      it('Successfully duplicates and updates with boardId in input', async () => {
        mocks.setResponse(successfulDuplicateItemResponse);
        mockChangeColumnValuesTool.execute.mockResolvedValue(successfulUpdateResponse);

        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token');

        const result = await tool.execute({
          boardId: 789,
          name: 'Updated Item',
          columnValues: '{"text_column": "Updated Value"}',
          duplicateFromItemId: 123
        });

        expect(result.content).toBe('Item 987654321 successfully duplicated from 123 and updated');
        
        // Verify duplicate call uses input boardId
        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('mutation duplicateItem'),
          {
            boardId: '789',
            itemId: '123'
          }
        );

        // Verify ChangeItemColumnValuesTool was called with input boardId
        expect(MockedChangeItemColumnValuesTool).toHaveBeenCalledWith(
          mocks.mockApiClient,
          'fake_token',
          { boardId: 789 }
        );
      });
    });

    describe('Create Subitem Path', () => {
      const successfulCreateSubitemResponse = {
        create_subitem: {
          id: '111222333',
          name: 'New Subitem',
          parent_item: {
            id: '123'
          }
        }
      };

      it('Successfully creates a subitem', async () => {
        mocks.setResponse(successfulCreateSubitemResponse);

        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });

        const result = await tool.execute({
          name: 'New Subitem',
          columnValues: '{"text_column": "Subitem Value"}',
          parentItemId: 123
        });

        expect(result.content).toBe('Subitem 111222333 successfully created under parent item 123');
        
        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('mutation createSubitem'),
          {
            parentItemId: '123',
            itemName: 'New Subitem',
            columnValues: '{"text_column": "Subitem Value"}'
          }
        );
      });

      it('Throws error when create subitem fails', async () => {
        mocks.setResponse({ create_subitem: null });

        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });

        await expect(tool.execute({
          name: 'New Subitem',
          columnValues: '{"text_column": "Subitem Value"}',
          parentItemId: 123
        })).rejects.toThrow('Failed to create subitem');
      });

      it('Throws error when create subitem returns no item', async () => {
        mocks.setResponse({ create_subitem: { id: null, name: 'New Subitem' } });

        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });

        await expect(tool.execute({
          name: 'New Subitem',
          columnValues: '{"text_column": "Subitem Value"}',
          parentItemId: 123
        })).rejects.toThrow('Failed to create subitem');
      });

      it('Handles GraphQL response errors for create subitem path', async () => {
        const graphqlError = new Error('GraphQL Error');
        (graphqlError as any).response = {
          errors: [
            { message: 'Parent item not found' },
            { message: 'Invalid column values' }
          ]
        };
        mocks.setError(graphqlError);

        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });

        await expect(tool.execute({
          name: 'New Subitem',
          columnValues: '{"text_column": "Subitem Value"}',
          parentItemId: 123
        })).rejects.toThrow('Failed to create subitem: Parent item not found, Invalid column values');
      });
    });

    describe('Parameter Conflict Validation', () => {
      it('Throws error when both parentItemId and duplicateFromItemId are provided', async () => {
        const tool = new CreateItemTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });

        await expect(tool.execute({
          name: 'Conflicting Item',
          columnValues: '{"text_column": "Value"}',
          parentItemId: 123,
          duplicateFromItemId: 456
        })).rejects.toThrow('Cannot specify both parentItemId and duplicateFromItemId. Please provide only one of these parameters.');
      });
    });

  });
});
