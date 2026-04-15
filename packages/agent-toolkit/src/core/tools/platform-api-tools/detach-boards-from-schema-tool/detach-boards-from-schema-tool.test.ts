import { createMockApiClient } from '../test-utils/mock-api-client';
import { DetachBoardsFromSchemaTool } from './detach-boards-from-schema-tool';

describe('DetachBoardsFromSchemaTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully detaches boards from schema', async () => {
    mocks.setResponse({
      detach_boards_from_schema: [
        { board_id: 'board-1', success: true, error: null },
        { board_id: 'board-2', success: true, error: null },
      ],
    });
    const tool = new DetachBoardsFromSchemaTool(mocks.mockApiClient);

    const result = await tool.execute({ boardIds: ['board-1', 'board-2'] });

    expect((result.content as { message: string }).message).toBe('Detached 2/2 board(s) from schema');
  });

  it('passes versionOverride dev to API request', async () => {
    mocks.setResponse({ detach_boards_from_schema: [{ board_id: 'board-1', success: true, error: null }] });
    const tool = new DetachBoardsFromSchemaTool(mocks.mockApiClient);

    await tool.execute({ boardIds: ['board-1'] });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ boardIds: ['board-1'] }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('reports partial failures', async () => {
    mocks.setResponse({
      detach_boards_from_schema: [
        { board_id: 'board-1', success: true, error: null },
        { board_id: 'board-2', success: false, error: 'Not found' },
      ],
    });
    const tool = new DetachBoardsFromSchemaTool(mocks.mockApiClient);

    const result = await tool.execute({ boardIds: ['board-1', 'board-2'] });

    expect((result.content as { message: string }).message).toBe('Detached 1/2 board(s) from schema');
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Unauthorized'));
    const tool = new DetachBoardsFromSchemaTool(mocks.mockApiClient);

    await expect(tool.execute({ boardIds: ['board-1'] })).rejects.toThrow('Unauthorized');
  });

  it('has correct tool properties', () => {
    const tool = new DetachBoardsFromSchemaTool(mocks.mockApiClient);

    expect(tool.name).toBe('detach_boards_from_schema');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('schema');
  });
});
