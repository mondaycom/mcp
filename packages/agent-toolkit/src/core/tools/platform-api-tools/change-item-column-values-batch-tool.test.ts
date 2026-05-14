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
});
