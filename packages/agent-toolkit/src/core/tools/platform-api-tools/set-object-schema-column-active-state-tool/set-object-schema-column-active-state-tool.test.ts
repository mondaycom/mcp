import { createMockApiClient } from '../test-utils/mock-api-client';
import { SetObjectSchemaColumnActiveStateTool } from './set-object-schema-column-active-state-tool';

describe('SetObjectSchemaColumnActiveStateTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully deactivates a column', async () => {
    mocks.setResponse({
      set_object_schema_column_active_state: { id: '42', name: 'my_schema', description: null, parent_id: null, revision: 2 },
    });
    const tool = new SetObjectSchemaColumnActiveStateTool(mocks.mockApiClient);

    const result = await tool.execute({ action: 'deactivate', objectSchemaId: '42', columnId: 'col-1' });

    expect((result.content as { message: string }).message).toContain('deactivate');
  });

  it('successfully reactivates a column', async () => {
    mocks.setResponse({
      set_object_schema_column_active_state: { id: '42', name: 'my_schema', description: null, parent_id: null, revision: 3 },
    });
    const tool = new SetObjectSchemaColumnActiveStateTool(mocks.mockApiClient);

    const result = await tool.execute({ action: 'reactivate', objectSchemaName: 'my_schema', columnId: 'col-1' });

    expect((result.content as { message: string }).message).toContain('reactivate');
  });

  it('maps action to uppercase enum value', async () => {
    mocks.setResponse({
      set_object_schema_column_active_state: { id: '1', name: 'test', description: null, parent_id: null, revision: 1 },
    });
    const tool = new SetObjectSchemaColumnActiveStateTool(mocks.mockApiClient);

    await tool.execute({ action: 'deactivate', objectSchemaId: '1', columnId: 'col-1' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'DEACTIVATE', columnId: 'col-1' }),
    );
  });

  it('throws when no schema identifier provided', async () => {
    const tool = new SetObjectSchemaColumnActiveStateTool(mocks.mockApiClient);

    await expect(tool.execute({ action: 'deactivate', columnId: 'col-1' })).rejects.toThrow(
      'Either objectSchemaId or objectSchemaName must be provided',
    );
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Unauthorized'));
    const tool = new SetObjectSchemaColumnActiveStateTool(mocks.mockApiClient);

    await expect(tool.execute({ action: 'deactivate', objectSchemaId: '1', columnId: 'col-1' })).rejects.toThrow('Unauthorized');
  });

  it('has correct tool properties', () => {
    const tool = new SetObjectSchemaColumnActiveStateTool(mocks.mockApiClient);

    expect(tool.name).toBe('set_object_schema_column_active_state');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('object schema');
  });
});
