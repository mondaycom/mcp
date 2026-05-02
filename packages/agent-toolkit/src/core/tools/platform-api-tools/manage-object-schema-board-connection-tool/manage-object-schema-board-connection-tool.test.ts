import { createMockApiClient } from '../test-utils/mock-api-client';
import { ManageObjectSchemaBoardConnectionTool } from './manage-object-schema-board-connection-tool';

describe('ManageObjectSchemaBoardConnectionTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully connects a board', async () => {
    mocks.setResponse({ connect_board_to_object_schema: { id: 'conn-1', object_schema_id: 'schema-42' } });
    const tool = new ManageObjectSchemaBoardConnectionTool(mocks.mockApiClient);

    const result = await tool.execute({ action: 'connect', boardId: 'board-1', objectSchemaId: 'schema-42' });

    expect((result.content as { message: string }).message).toContain('connected');
  });

  it('throws when boardId missing for connect', async () => {
    const tool = new ManageObjectSchemaBoardConnectionTool(mocks.mockApiClient);

    await expect(tool.execute({ action: 'connect', objectSchemaId: 'schema-1' })).rejects.toThrow('boardId is required');
  });

  it('throws when no schema identifier provided for connect', async () => {
    const tool = new ManageObjectSchemaBoardConnectionTool(mocks.mockApiClient);

    await expect(tool.execute({ action: 'connect', boardId: 'board-1' })).rejects.toThrow('objectSchemaId or objectSchemaName');
  });

  it('successfully detaches boards', async () => {
    mocks.setResponse({
      detach_boards_from_object_schema: [
        { board_id: 'board-1', success: true, error: null },
        { board_id: 'board-2', success: true, error: null },
      ],
    });
    const tool = new ManageObjectSchemaBoardConnectionTool(mocks.mockApiClient);

    const result = await tool.execute({ action: 'detach', boardIds: ['board-1', 'board-2'] });

    expect((result.content as { message: string }).message).toContain('2 board(s)');
  });

  it('throws when boardIds missing for detach', async () => {
    const tool = new ManageObjectSchemaBoardConnectionTool(mocks.mockApiClient);

    await expect(tool.execute({ action: 'detach' })).rejects.toThrow('boardIds is required');
  });

  it('has correct tool properties', () => {
    const tool = new ManageObjectSchemaBoardConnectionTool(mocks.mockApiClient);

    expect(tool.name).toBe('manage_object_schema_board_connection');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('object schema');
  });
});
