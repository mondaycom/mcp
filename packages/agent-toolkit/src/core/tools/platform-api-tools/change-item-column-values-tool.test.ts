import { createMockApiClient } from './test-utils/mock-api-client';
import { ChangeItemColumnValuesTool } from './change-item-column-values-tool';

describe('ChangeItemColumnValuesTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;
  let tool: ChangeItemColumnValuesTool;

  beforeEach(() => {
    mocks = createMockApiClient();
    tool = new ChangeItemColumnValuesTool(mocks.mockApiClient, { boardId: 18414630189 });
  });

  const mockMutationResponse = {
    change_multiple_column_values: {
      id: '12093604112',
      name: 'Test Item',
      url: 'https://monday.monday.com/boards/18414630189/pulses/12093604112',
      column_values: [
        { id: 'color_mm3nhhab', value: '{"index":2,"changed_at":"2026-05-31T13:49:12.379Z"}' },
        { id: 'text_mm3npgdn', value: '"Updated text"' },
      ],
    },
  };

  describe('column_values in response', () => {
    it('returns multiple changed columns when multiple are updated', async () => {
      mocks.setResponse(mockMutationResponse);

      const result = await tool.execute(
        {
          boardId: 18414630189,
          itemId: 12093604112,
          columnValues: '{"color_mm3nhhab":{"label":"Stuck"},"text_mm3npgdn":"Updated text"}',
        },
        undefined as any,
      );

      expect(result).toMatchObject({
        content: expect.objectContaining({
          column_values: {
            color_mm3nhhab: '{"index":2,"changed_at":"2026-05-31T13:49:12.379Z"}',
            text_mm3npgdn: '"Updated text"',
          },
        }),
      });
    });

    it('passes columnIds to the GraphQL query for pre-filtering', async () => {
      mocks.setResponse(mockMutationResponse);

      await tool.execute(
        { boardId: 18414630189, itemId: 12093604112, columnValues: '{"color_mm3nhhab":{"label":"Stuck"}}' },
        undefined as any,
      );

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ columnIds: ['color_mm3nhhab'] }),
      );
    });

    it('sends a double-encoded columnValues payload to the API as a plain JSON object', async () => {
      mocks.setResponse(mockMutationResponse);

      await tool.execute(
        {
          boardId: 18414630189,
          itemId: 12093604112,
          columnValues: JSON.stringify('{"color_mm3nhhab":{"label":"Stuck"}}'),
        },
        undefined as any,
      );

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          columnValues: '{"color_mm3nhhab":{"label":"Stuck"}}',
          columnIds: ['color_mm3nhhab'],
        }),
      );
    });

    it('throws meaningful error for invalid columnValues JSON', async () => {
      await expect(
        tool.execute(
          { boardId: 18414630189, itemId: 12093604112, columnValues: 'not valid json' },
          undefined as any,
        ),
      ).rejects.toThrow('Invalid columnValues JSON');
    });

    it('includes item metadata in response', async () => {
      mocks.setResponse(mockMutationResponse);

      const result = await tool.execute(
        { boardId: 18414630189, itemId: 12093604112, columnValues: '{"color_mm3nhhab":{"label":"Stuck"}}' },
        undefined as any,
      );

      expect(result).toMatchObject({
        content: expect.objectContaining({
          item_id: '12093604112',
          item_name: 'Test Item',
          message: expect.stringContaining('successfully updated'),
        }),
      });
    });
  });

  describe('board lookup', () => {
    it('looks up the item board when no boardId is given', async () => {
      mocks.getMockRequest().mockImplementation(async (query: string, variables: any) =>
        query.includes('GetItemBoardId')
          ? { items: [{ board: { id: '777' } }] }
          : { change_multiple_column_values: { id: variables.itemId, name: 'Item', url: 'u', column_values: [] } },
      );
      const tool = new ChangeItemColumnValuesTool(mocks.mockApiClient);

      await tool.execute({ itemId: 5, columnValues: '{"text":"a"}' } as any);

      const calls = mocks.getMockRequest().mock.calls;
      expect(calls[0][0]).toContain('query GetItemBoardId');
      expect(calls[0][1]).toEqual({ itemId: '5' });
      expect(calls[1][1]).toMatchObject({ boardId: '777', itemId: '5' });
    });

    it('fails with a missing-parameter error when the item has no board', async () => {
      mocks.setResponse({ items: [] });
      const tool = new ChangeItemColumnValuesTool(mocks.mockApiClient);

      await expect(tool.execute({ itemId: 5, columnValues: '{"text":"a"}' } as any)).rejects.toMatchObject({
        code: 'MISSING_REQUIRED_PARAMETER',
        message: 'Could not find the board of item 5. Set boardId.',
      });
    });

    it('does not look up the board when boardId is given', async () => {
      mocks.setResponse({ change_multiple_column_values: { id: '5', name: 'Item', url: 'u', column_values: [] } });
      const tool = new ChangeItemColumnValuesTool(mocks.mockApiClient);

      await tool.execute({ boardId: 9, itemId: 5, columnValues: '{"text":"a"}' } as any);

      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
    });
  });
});
