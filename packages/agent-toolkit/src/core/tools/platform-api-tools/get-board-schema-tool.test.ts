import { GetBoardSchemaTool } from './get-board-schema-tool';
import { createMockApiClient } from './test-utils/mock-api-client';

describe('GetBoardSchemaTool', () => {
  it('should return empty arrays when columns and groups are null', async () => {
    const mocks = createMockApiClient();
    mocks.setResponse({
      boards: [
        {
          columns: null,
          groups: null,
        },
      ],
    });

    const tool = new GetBoardSchemaTool(mocks.mockApiClient, 'fake_token');
    const result = await tool.execute({ boardId: 123 });

    expect(result.content).toEqual({
      message: 'Board schema retrieved',
      board_id: 123,
      columns: [],
      groups: [],
    });
  });
});
