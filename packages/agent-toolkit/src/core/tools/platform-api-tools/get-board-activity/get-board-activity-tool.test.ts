import { createMockApiClient } from '../test-utils/mock-api-client';
import { GetBoardActivityTool } from './get-board-activity-tool';

const mockBoard = {
  name: 'Test Board',
  url: 'https://monday.com/boards/1',
  activity_logs: [
    { created_at: '2024-01-01T00:00:00Z', event: 'create_pulse', entity: 'pulse', user_id: '123', data: '{"key":"value"}' },
    null,
    { created_at: '2024-01-02T00:00:00Z', event: 'update_pulse', entity: 'pulse', user_id: '456', data: '{"foo":"bar"}' },
  ],
};

describe('GetBoardActivityTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('maps response to correct shape with board metadata and filtered nulls', async () => {
    mocks.setResponse({ boards: [mockBoard] });
    const tool = new GetBoardActivityTool(mocks.mockApiClient);

    const result = await tool.execute({ boardId: 1, includeData: false });

    expect(result.content).toEqual({
      message: 'Board activity retrieved',
      board_id: 1,
      board_name: 'Test Board',
      board_url: 'https://monday.com/boards/1',
      data: [
        { created_at: '2024-01-01T00:00:00Z', event: 'create_pulse', entity: 'pulse', user_id: '123' },
        { created_at: '2024-01-02T00:00:00Z', event: 'update_pulse', entity: 'pulse', user_id: '456' },
      ],
    });
  });

  it('includes data field only when includeData is true', async () => {
    mocks.setResponse({ boards: [mockBoard] });
    const tool = new GetBoardActivityTool(mocks.mockApiClient);

    const result = await tool.execute({ boardId: 1, includeData: true });

    expect(result.content).toEqual({
      message: 'Board activity retrieved',
      board_id: 1,
      board_name: 'Test Board',
      board_url: 'https://monday.com/boards/1',
      data: [
        { created_at: '2024-01-01T00:00:00Z', event: 'create_pulse', entity: 'pulse', user_id: '123', data: '{"key":"value"}' },
        { created_at: '2024-01-02T00:00:00Z', event: 'update_pulse', entity: 'pulse', user_id: '456', data: '{"foo":"bar"}' },
      ],
    });
  });

  it('returns message when no activity found', async () => {
    mocks.setResponse({ boards: [{ ...mockBoard, activity_logs: [] }] });
    const tool = new GetBoardActivityTool(mocks.mockApiClient);

    const result = await tool.execute({ boardId: 42, includeData: false });

    expect(result.content).toContain('No activity found for board 42');
  });

  it('passes all filters to GraphQL with correct type conversions', async () => {
    mocks.setResponse({ boards: [mockBoard] });
    const tool = new GetBoardActivityTool(mocks.mockApiClient);

    await tool.execute({
      boardId: 42,
      itemIds: [101, 202],
      userIds: [300, 400],
      fromDate: '2024-01-01T00:00:00Z',
      toDate: '2024-02-01T00:00:00Z',
      includeData: true,
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('query GetBoardActivity'),
      {
        boardId: '42',
        itemIds: ['101', '202'],
        userIds: ['300', '400'],
        fromDate: '2024-01-01T00:00:00Z',
        toDate: '2024-02-01T00:00:00Z',
        limit: 1000,
        page: 1,
        includeData: true,
      },
    );
  });

  it('passes undefined for omitted filters — not empty arrays', async () => {
    mocks.setResponse({ boards: [mockBoard] });
    const tool = new GetBoardActivityTool(mocks.mockApiClient);

    await tool.execute({ boardId: 1, includeData: false });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('query GetBoardActivity'),
      expect.objectContaining({
        itemIds: undefined,
        userIds: undefined,
      }),
    );
  });

  it('passes empty arrays when filters are explicitly set to []', async () => {
    mocks.setResponse({ boards: [mockBoard] });
    const tool = new GetBoardActivityTool(mocks.mockApiClient);

    await tool.execute({ boardId: 1, itemIds: [], userIds: [], includeData: false });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('query GetBoardActivity'),
      expect.objectContaining({
        itemIds: [],
        userIds: [],
      }),
    );
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Unauthorized'));
    const tool = new GetBoardActivityTool(mocks.mockApiClient);

    await expect(tool.execute({ boardId: 1, includeData: false })).rejects.toThrow('Unauthorized');
  });
});