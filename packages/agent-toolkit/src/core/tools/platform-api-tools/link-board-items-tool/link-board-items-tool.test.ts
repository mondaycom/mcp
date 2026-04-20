import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameAsync, createMockApiClient } from '../test-utils/mock-api-client';

const TOOL_NAME = 'link_board_items';

describe('LinkBoardItemsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  it('runs one mutation per pair when the same source appears twice on the source side', async () => {
    mocks.setResponses([{}, {}]);

    const result = await callToolByNameAsync(TOOL_NAME, {
      sourceBoardId: 1,
      targetBoardId: 2,
      linkSide: 'source',
      linkColumnId: 'link_col',
      pairs: [
        { sourceItemId: '1', targetItemId: '10' },
        { sourceItemId: '1', targetItemId: '20' },
      ],
    });

    expect(result.succeeded).toHaveLength(2);
    expect(mocks.mockRequest).toHaveBeenCalledTimes(2);
    const lastVariables = mocks.mockRequest.mock.calls[1][1];
    expect(JSON.parse(lastVariables.columnValues).link_col.item_ids).toEqual(['20']);
  });

  it('writes source-side links with one mutation per pair', async () => {
    mocks.setResponses([{}, {}]);

    const result = await callToolByNameAsync(TOOL_NAME, {
      sourceBoardId: 10,
      targetBoardId: 20,
      linkSide: 'source',
      linkColumnId: 'link_col',
      pairs: [
        { sourceItemId: '1', targetItemId: '10' },
        { sourceItemId: '2', targetItemId: '20' },
      ],
    });

    expect(result.succeeded).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
    expect(mocks.mockRequest).toHaveBeenCalledTimes(2);
  });

  it('writes target-side links with one mutation per distinct target', async () => {
    mocks.setResponses([{}]);

    const result = await callToolByNameAsync(TOOL_NAME, {
      sourceBoardId: 10,
      targetBoardId: 20,
      linkSide: 'target',
      linkColumnId: 'link_col',
      pairs: [
        { sourceItemId: '1001', targetItemId: '2001' },
        { sourceItemId: '1002', targetItemId: '2001' },
      ],
    });

    expect(result.succeeded).toHaveLength(2);
    expect(mocks.mockRequest).toHaveBeenCalledTimes(1);
    expect(String(mocks.mockRequest.mock.calls[0][0])).toContain('change_multiple_column_values');
  });
});
