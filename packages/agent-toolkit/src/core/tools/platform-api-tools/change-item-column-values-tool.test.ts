import { createMockApiClient } from './test-utils/mock-api-client';
import { ChangeItemColumnValuesTool, LINKED_ITEM_IDS_RESPONSE_LIMIT } from './change-item-column-values-tool';
import { NonDeprecatedColumnType } from 'src/utils/types';

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

    it('returns linked item ids for board relation columns', async () => {
      mocks.setResponse({
        change_multiple_column_values: {
          ...mockMutationResponse.change_multiple_column_values,
          column_values: [
            {
              id: 'board_relation',
              type: NonDeprecatedColumnType.BoardRelation,
              value: null,
              linked_item_ids: ['123'],
            },
          ],
        },
      });

      const result = await tool.execute({
        boardId: 18414630189,
        itemId: 12093604112,
        columnValues: '{"board_relation":{"item_ids":[123]}}',
      });

      expect(result.content).toEqual(
        expect.objectContaining({
          column_values: {
            board_relation: {
              linked_item_ids: ['123'],
            },
          },
        }),
      );
    });

    it('returns linked item ids for dependency columns', async () => {
      mocks.setResponse({
        change_multiple_column_values: {
          ...mockMutationResponse.change_multiple_column_values,
          column_values: [
            {
              id: 'dependency',
              type: NonDeprecatedColumnType.Dependency,
              value: null,
              linked_item_ids: ['789'],
            },
          ],
        },
      });

      const result = await tool.execute({
        boardId: 18414630189,
        itemId: 12093604112,
        columnValues: '{"dependency":{"item_ids":[789]}}',
      });

      expect(result.content).toEqual(
        expect.objectContaining({
          column_values: {
            dependency: {
              linked_item_ids: ['789'],
            },
          },
        }),
      );
    });

    it('omits linked item ids above the response limit without marking the update as failed', async () => {
      const linkedItemIds = Array.from({ length: LINKED_ITEM_IDS_RESPONSE_LIMIT + 1 }, (_, index) => String(index + 1));
      mocks.setResponse({
        change_multiple_column_values: {
          ...mockMutationResponse.change_multiple_column_values,
          column_values: [
            {
              id: 'board_relation',
              type: NonDeprecatedColumnType.BoardRelation,
              value: null,
              linked_item_ids: linkedItemIds,
            },
          ],
        },
      });

      const result = await tool.execute({
        boardId: 18414630189,
        itemId: 12093604112,
        columnValues: '{"board_relation":{"item_ids":[123]}}',
      });

      expect(result).not.toHaveProperty('isError');
      expect(result.content).toEqual(
        expect.objectContaining({
          column_values: {
            board_relation: {
              linked_item_count: LINKED_ITEM_IDS_RESPONSE_LIMIT + 1,
              linked_item_ids_omitted: true,
              message: expect.stringContaining('Update succeeded'),
            },
          },
        }),
      );
      expect((result.content as any).column_values.board_relation).not.toHaveProperty('linked_item_ids');
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
});
