import { GetBoardSchemaTool } from './get-board-schema-tool';
import { createMockApiClient } from './test-utils/mock-api-client';

describe('GetBoardSchemaTool', () => {
  it('should handle null columns and groups without rendering undefined', async () => {
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

    expect(result.content).toContain('The current schema of the board 123 is:');
    expect(result.content).toContain('Columns:');
    expect(result.content).toContain('Groups:');
    expect(result.content).not.toContain('undefined');
  });
});
