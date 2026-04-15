import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameAsync, callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';

const TOOL_NAME = 'link_board_items';

const makeLinkCandidateResponse = (
  items: Array<{ id: string; linkedItemIds?: string[] }>,
) => ({
  boards: [
    {
      id: '1',
      name: 'Target Board',
      items_page: {
        items: items.map((item) => ({
          id: item.id,
          name: 'n',
          column_values: [
            {
              id: 'link_col',
              type: 'board_relation',
              text: '',
              value: null,
              linked_item_ids: item.linkedItemIds ?? [],
            },
          ],
        })),
        cursor: null,
      },
    },
  ],
});

describe('LinkBoardItemsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  it('rejects the same source mapped to two different targets', async () => {
    const result = await callToolByNameRawAsync(TOOL_NAME, {
      sourceBoardId: 1,
      targetBoardId: 2,
      linkSide: 'source',
      linkColumnId: 'link_col',
      pairs: [
        { sourceItemId: 's1', targetItemId: 't1' },
        { sourceItemId: 's1', targetItemId: 't2' },
      ],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Each sourceItemId may map to only one targetItemId');
  });

  it('writes source-side links with one mutation per pair', async () => {
    mocks.setResponses([{}, {}]);

    const result = await callToolByNameAsync(TOOL_NAME, {
      sourceBoardId: 10,
      targetBoardId: 20,
      linkSide: 'source',
      linkColumnId: 'link_col',
      pairs: [
        { sourceItemId: 's1', targetItemId: 't1' },
        { sourceItemId: 's2', targetItemId: 't2' },
      ],
    });

    expect(result.succeeded).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
    expect(mocks.mockRequest).toHaveBeenCalledTimes(2);
  });

  it('merges existing links when writing on the target side', async () => {
    mocks.setResponses([
      makeLinkCandidateResponse([{ id: 'tgt1', linkedItemIds: ['old_s'] }]),
      {},
    ]);

    const result = await callToolByNameAsync(TOOL_NAME, {
      sourceBoardId: 10,
      targetBoardId: 20,
      linkSide: 'target',
      linkColumnId: 'link_col',
      pairs: [{ sourceItemId: 'new_s', targetItemId: 'tgt1' }],
    });

    expect(result.succeeded).toHaveLength(1);
    expect(mocks.mockRequest).toHaveBeenCalledTimes(2);
    const writeCall = mocks.mockRequest.mock.calls[1][0];
    expect(String(writeCall)).toContain('change_multiple_column_values');
  });
});
