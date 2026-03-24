import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameAsync, callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';

describe('GetBoardActivityTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns board activity data', async () => {
    mocks.setResponse({
      boards: [
        {
          name: 'Test Board',
          url: 'https://test.monday.com/boards/123',
          activity_logs: [
            {
              created_at: '2026-03-01T00:00:00Z',
              event: 'update_column_value',
              entity: 'pulse',
              user_id: '123',
              data: { before: 'old', after: 'new' },
            },
          ],
        },
      ],
    });

    const result = await callToolByNameAsync('get_board_activity', {
      boardId: 123,
      includeData: true,
    });

    expect(result.message).toBe('Board activity retrieved');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].event).toBe('update_column_value');
    expect(result.data[0].data).toEqual({ before: 'old', after: 'new' });
  });

  it('returns no activity when logs only contain null entries', async () => {
    mocks.setResponse({
      boards: [
        {
          name: 'Test Board',
          url: 'https://test.monday.com/boards/123',
          activity_logs: [null],
        },
      ],
    });

    const result = await callToolByNameRawAsync('get_board_activity', {
      boardId: 123,
    });

    expect(result.content[0].text).toContain('No activity found for board 123');
  });
});
