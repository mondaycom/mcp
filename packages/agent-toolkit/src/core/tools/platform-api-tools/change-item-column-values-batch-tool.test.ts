import { createMockApiClient } from './test-utils/mock-api-client';
import { ChangeItemColumnValuesBatchTool } from './change-item-column-values-batch-tool';

describe('ChangeItemColumnValuesBatchTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  describe('successful batch updates', () => {
    it('sends a single GraphQL request with aliased mutations and returns per-item results', async () => {
      mocks.setResponse({
        item_0: { id: '101', name: 'Item A', url: 'https://monday.com/101' },
        item_1: { id: '102', name: 'Item B', url: 'https://monday.com/102' },
        item_2: { id: '103', name: 'Item C', url: 'https://monday.com/103' },
      });

      const tool = new ChangeItemColumnValuesBatchTool(mocks.mockApiClient, { boardId: 456 });

      const result = await tool.execute({
        items: [
          { itemId: 101, columnValues: '{"status":{"label":"Done"}}' },
          { itemId: 102, columnValues: '{"status":{"label":"Done"}}' },
          { itemId: 103, columnValues: '{"status":{"label":"Done"}}' },
        ],
      });

      const content = result.content as Record<string, any>;
      expect(content.successful).toHaveLength(3);
      expect(content.failed).toHaveLength(0);
      expect(content.message).toContain('3 of 3');
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
    });

    it('builds query with correct aliased mutation structure', async () => {
      mocks.setResponse({
        item_0: { id: '101', name: 'Item A', url: null },
      });

      const tool = new ChangeItemColumnValuesBatchTool(mocks.mockApiClient, { boardId: 456 });

      await tool.execute({
        items: [{ itemId: 101, columnValues: '{"status":{"label":"Done"}}' }],
      });

      const [query, variables] = mocks.getMockRequest().mock.calls[0];
      expect(query).toContain('item_0: change_multiple_column_values');
      expect(query).toContain('board_id: $boardId');
      expect(query).toContain('item_id: $itemId_0');
      expect(query).toContain('column_values: $columnValues_0');
      expect(variables).toEqual(
        expect.objectContaining({ boardId: '456', itemId_0: '101', columnValues_0: '{"status":{"label":"Done"}}' }),
      );
    });
  });

  describe('partial failure handling', () => {
    it('reports per-item success and failure from GraphQL partial response', async () => {
      const error = new Error('invalid value - unable to assign person with id: 3477320');
      (error as any).response = {
        data: {
          item_0: { id: '101', name: 'Item A', url: 'https://monday.com/101' },
          item_1: null,
          item_2: { id: '103', name: 'Item C', url: 'https://monday.com/103' },
        },
        errors: [{ message: 'invalid value - unable to assign person with id: 3477320', path: ['item_1'] }],
      };
      mocks.mockRequest.mockRejectedValue(error);

      const tool = new ChangeItemColumnValuesBatchTool(mocks.mockApiClient, { boardId: 456 });

      const result = await tool.execute({
        items: [
          { itemId: 101, columnValues: '{"person":{"personsAndTeams":[{"id":1}]}}' },
          { itemId: 102, columnValues: '{"person":{"personsAndTeams":[{"id":3477320}]}}' },
          { itemId: 103, columnValues: '{"person":{"personsAndTeams":[{"id":1}]}}' },
        ],
      });

      const content = result.content as Record<string, any>;
      expect(content.successful).toHaveLength(2);
      expect(content.failed).toHaveLength(1);
      expect(content.failed[0].error).toContain('unable to assign person');
      expect(content.message).toContain('2 of 3');
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
    });

    it('handles all items failing when no data returned', async () => {
      mocks.setError('Board not found');

      const tool = new ChangeItemColumnValuesBatchTool(mocks.mockApiClient, { boardId: 999 });

      const result = await tool.execute({
        items: [
          { itemId: 101, columnValues: '{"status":{"label":"Done"}}' },
          { itemId: 102, columnValues: '{"status":{"label":"Done"}}' },
        ],
      });

      const content = result.content as Record<string, any>;
      expect(content.successful).toHaveLength(0);
      expect(content.failed).toHaveLength(2);
      expect(content.message).toContain('0 of 2');
    });

    it('handles all items failing with partial data (all null)', async () => {
      const error = new Error('GraphQL Error');
      (error as any).response = {
        data: { item_0: null, item_1: null },
        errors: [
          { message: 'Invalid column value', path: ['item_0'] },
          { message: 'Column not found', path: ['item_1'] },
        ],
      };
      mocks.mockRequest.mockRejectedValue(error);

      const tool = new ChangeItemColumnValuesBatchTool(mocks.mockApiClient, { boardId: 456 });

      const result = await tool.execute({
        items: [
          { itemId: 101, columnValues: '{"status":{"label":"Bad"}}' },
          { itemId: 102, columnValues: '{"status":{"label":"Bad"}}' },
        ],
      });

      const content = result.content as Record<string, any>;
      expect(content.successful).toHaveLength(0);
      expect(content.failed).toHaveLength(2);
      expect(content.failed[0].error).toBe('Invalid column value');
      expect(content.failed[1].error).toBe('Column not found');
    });
  });

  describe('boardId resolution', () => {
    it('uses boardId from context when available', async () => {
      mocks.setResponse({ item_0: { id: '101', name: 'Item A', url: 'https://monday.com/101' } });

      const tool = new ChangeItemColumnValuesBatchTool(mocks.mockApiClient, { boardId: 456 });

      await tool.execute({
        items: [{ itemId: 101, columnValues: '{"status":{"label":"Done"}}' }],
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ boardId: '456' }),
      );
    });

    it('uses boardId from input when no context', async () => {
      mocks.setResponse({ item_0: { id: '101', name: 'Item A', url: 'https://monday.com/101' } });

      const tool = new ChangeItemColumnValuesBatchTool(mocks.mockApiClient);

      await tool.execute({
        boardId: 789,
        items: [{ itemId: 101, columnValues: '{"status":{"label":"Done"}}' }],
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ boardId: '789' }),
      );
    });

    it('omits boardId from schema when context provides it', () => {
      const tool = new ChangeItemColumnValuesBatchTool(mocks.mockApiClient, { boardId: 456 });
      const schema = tool.getInputSchema();
      expect(schema).not.toHaveProperty('boardId');
    });

    it('includes boardId in schema when no context', () => {
      const tool = new ChangeItemColumnValuesBatchTool(mocks.mockApiClient);
      const schema = tool.getInputSchema();
      expect(schema).toHaveProperty('boardId');
    });
  });

  describe('createLabelsIfMissing', () => {
    it('includes createLabelsIfMissing variables per-item in the batch query', async () => {
      mocks.setResponse({
        item_0: { id: '101', name: 'Item A', url: null },
        item_1: { id: '102', name: 'Item B', url: null },
      });

      const tool = new ChangeItemColumnValuesBatchTool(mocks.mockApiClient, { boardId: 456 });

      await tool.execute({
        items: [
          { itemId: 101, columnValues: '{"status":{"label":"New Label"}}', createLabelsIfMissing: true },
          { itemId: 102, columnValues: '{"status":{"label":"Existing"}}' },
        ],
      });

      const [query, variables] = mocks.getMockRequest().mock.calls[0];
      expect(query).toContain('create_labels_if_missing: $createLabelsIfMissing_0');
      expect(query).not.toContain('$createLabelsIfMissing_1');
      expect(variables.createLabelsIfMissing_0).toBe(true);
      expect(variables).not.toHaveProperty('createLabelsIfMissing_1');
    });
  });
});
