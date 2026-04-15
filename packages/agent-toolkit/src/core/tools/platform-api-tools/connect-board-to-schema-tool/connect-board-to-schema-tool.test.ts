import { createMockApiClient } from '../test-utils/mock-api-client';
import { ConnectBoardToSchemaTool } from './connect-board-to-schema-tool';

describe('ConnectBoardToSchemaTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully connects a board to a schema', async () => {
    mocks.setResponse({ connect_board_to_schema: { id: 'conn-1', entity_id: 'schema-42' } });
    const tool = new ConnectBoardToSchemaTool(mocks.mockApiClient);

    const result = await tool.execute({ boardId: 'board-1', schemaId: 'schema-42' });

    expect(result.content).toEqual({
      message: 'Board successfully connected to schema',
      connection_id: 'conn-1',
      schema_id: 'schema-42',
    });
  });

  it('passes versionOverride dev to API request', async () => {
    mocks.setResponse({ connect_board_to_schema: { id: 'conn-1', entity_id: 'schema-1' } });
    const tool = new ConnectBoardToSchemaTool(mocks.mockApiClient);

    await tool.execute({ boardId: 'board-1', schemaName: 'my_schema' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ boardId: 'board-1', schemaName: 'my_schema' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('passes schemaId or schemaName', async () => {
    mocks.setResponse({ connect_board_to_schema: { id: 'conn-2', entity_id: 'schema-5' } });
    const tool = new ConnectBoardToSchemaTool(mocks.mockApiClient);

    await tool.execute({ boardId: 'board-2', schemaId: 'schema-5' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ boardId: 'board-2', schemaId: 'schema-5' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Unauthorized'));
    const tool = new ConnectBoardToSchemaTool(mocks.mockApiClient);

    await expect(tool.execute({ boardId: 'board-1', schemaId: 'schema-1' })).rejects.toThrow('Unauthorized');
  });

  it('has correct tool properties', () => {
    const tool = new ConnectBoardToSchemaTool(mocks.mockApiClient);

    expect(tool.name).toBe('connect_board_to_schema');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('schema');
  });
});
