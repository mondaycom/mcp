import { createMockApiClient } from './test-utils/mock-api-client';
import { ChangeItemColumnValuesBatchTool } from './change-item-column-values-batch-tool';

describe('ChangeItemColumnValuesBatchTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  describe('successful batch updates', () => {
    it('updates multiple items and returns per-item results', async () => {
      mocks.setResponses([
        { change_multiple_column_values: { id: '101', name: 'Item A', url: 'https://monday.com/101' } },
        { change_multiple_column_values: { id: '102', name: 'Item B', url: 'https://monday.com/102' } },
        { change_multiple_column_values: { id: '103', name: 'Item C', url: 'https://monday.com/103' } },
      ]);

      const tool = new ChangeItemColumnValuesBatchTool(mocks.mockApiClient, { boardId: 456 });

      const result = await tool.execute({
        boardId: 456,
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
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(3);
    });
  });

  describe('partial failure handling', () => {
    it('reports per-item success and failure when some items fail', async () => {
      const error = new Error('invalid value - unable to assign person with id: 3477320');
      mocks.mockRequest
        .mockResolvedValueOnce({
          change_multiple_column_values: { id: '101', name: 'Item A', url: 'https://monday.com/101' },
        })
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          change_multiple_column_values: { id: '103', name: 'Item C', url: 'https://monday.com/103' },
        });

      const tool = new ChangeItemColumnValuesBatchTool(mocks.mockApiClient, { boardId: 456 });

      const result = await tool.execute({
        boardId: 456,
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
    });

    it('handles all items failing', async () => {
      mocks.setError('Board not found');

      const tool = new ChangeItemColumnValuesBatchTool(mocks.mockApiClient, { boardId: 999 });

      const result = await tool.execute({
        boardId: 999,
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
  });

  describe('boardId resolution', () => {
    it('uses boardId from context when available', async () => {
      mocks.setResponse({
        change_multiple_column_values: { id: '101', name: 'Item A', url: 'https://monday.com/101' },
      });

      const tool = new ChangeItemColumnValuesBatchTool(mocks.mockApiClient, { boardId: 456 });

      await tool.execute({
        boardId: 789,
        items: [{ itemId: 101, columnValues: '{"status":{"label":"Done"}}' }],
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ boardId: '456' }),
      );
    });

    it('uses boardId from input when no context', async () => {
      mocks.setResponse({
        change_multiple_column_values: { id: '101', name: 'Item A', url: 'https://monday.com/101' },
      });

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
  });

  describe('createLabelsIfMissing', () => {
    it('passes createLabelsIfMissing per-item to the GraphQL mutation', async () => {
      mocks.setResponses([
        { change_multiple_column_values: { id: '101', name: 'Item A', url: null } },
        { change_multiple_column_values: { id: '102', name: 'Item B', url: null } },
      ]);

      const tool = new ChangeItemColumnValuesBatchTool(mocks.mockApiClient, { boardId: 456 });

      await tool.execute({
        boardId: 456,
        items: [
          { itemId: 101, columnValues: '{"status":{"label":"New Label"}}', createLabelsIfMissing: true },
          { itemId: 102, columnValues: '{"status":{"label":"Existing"}}' },
        ],
      });

      const calls = mocks.getMockRequest().mock.calls;
      expect(calls[0][1]).toEqual(
        expect.objectContaining({ itemId: '101', createLabelsIfMissing: true }),
      );
      expect(calls[1][1]).not.toHaveProperty('createLabelsIfMissing');
    });
  });
});
