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

  });
});
