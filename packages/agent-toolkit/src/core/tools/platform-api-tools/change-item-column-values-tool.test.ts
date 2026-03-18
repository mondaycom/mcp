import { createMockApiClient } from './test-utils/mock-api-client';
import { ChangeItemColumnValuesTool } from './change-item-column-values-tool';

describe('ChangeItemColumnValuesTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  const successfulResponse = {
    change_multiple_column_values: {
      id: '123456789',
    },
  };

  describe('with boardId in context', () => {
    it('calls the mutation with correct variables including options.disable_undo=false', async () => {
      mocks.setResponse(successfulResponse);

      const tool = new ChangeItemColumnValuesTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });
      const result = await tool.execute({
        itemId: 123,
        columnValues: '{"text_column": "New Value"}',
      });

      expect(result.content).toBe('Item 123456789 successfully updated with the new column values');
      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('mutation changeItemColumnValues'),
        {
          boardId: '456',
          itemId: '123',
          columnValues: '{"text_column": "New Value"}',
          options: { disable_undo: false },
        },
      );
    });
  });

  describe('with boardId in input', () => {
    it('calls the mutation with correct variables including options.disable_undo=false', async () => {
      mocks.setResponse(successfulResponse);

      const tool = new ChangeItemColumnValuesTool(mocks.mockApiClient, 'fake_token');
      const result = await tool.execute({
        boardId: 789,
        itemId: 123,
        columnValues: '{"status_column": {"label": "Done"}}',
      });

      expect(result.content).toBe('Item 123456789 successfully updated with the new column values');
      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('mutation changeItemColumnValues'),
        {
          boardId: '789',
          itemId: '123',
          columnValues: '{"status_column": {"label": "Done"}}',
          options: { disable_undo: false },
        },
      );
    });
  });

  it('propagates errors from the API', async () => {
    mocks.setError('Something went wrong');

    const tool = new ChangeItemColumnValuesTool(mocks.mockApiClient, 'fake_token', { boardId: 456 });

    await expect(
      tool.execute({
        itemId: 123,
        columnValues: '{"text_column": "New Value"}',
      }),
    ).rejects.toThrow('Something went wrong');
  });
});
