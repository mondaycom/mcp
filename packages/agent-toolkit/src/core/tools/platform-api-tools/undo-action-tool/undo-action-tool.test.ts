import { createMockApiClient } from '../test-utils/mock-api-client';
import { UndoActionTool } from './undo-action-tool';

describe('Undo Action Tool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('Successfully undoes an action via batch_undo mutation', async () => {
    mocks.setResponse({ batch_undo: '{}' });
    const tool = new UndoActionTool(mocks.mockApiClient, 'fake_token');

    const result = await tool.execute({
      boardId: 123,
      undoRecordId: 'uuid-abc-123',
    });

    expect(result.content).toContain('Successfully undid action');
    expect(result.content).toContain('uuid-abc-123');
    expect(result.content).toContain('123');

    expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        boardId: '123',
        undoRecordId: 'uuid-abc-123',
      }),
    );
  });

  it('Propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Board not found'));
    const tool = new UndoActionTool(mocks.mockApiClient, 'fake_token');

    await expect(
      tool.execute({
        boardId: 999,
        undoRecordId: 'nonexistent-uuid',
      }),
    ).rejects.toThrow('Board not found');
  });

  it('Has correct schema and tool properties', () => {
    const tool = new UndoActionTool(mocks.mockApiClient, 'fake_token');
    const schema = tool.getInputSchema();

    expect(tool.name).toBe('undo_action');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('Undo');
    expect(tool.getDescription()).toContain('column changes, deletes, archives, moves, duplicates');

    expect(() => schema.boardId.parse(123)).not.toThrow();
    expect(() => schema.undoRecordId.parse('uuid-123')).not.toThrow();
  });
});
