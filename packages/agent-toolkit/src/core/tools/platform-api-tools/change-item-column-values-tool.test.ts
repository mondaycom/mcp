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
