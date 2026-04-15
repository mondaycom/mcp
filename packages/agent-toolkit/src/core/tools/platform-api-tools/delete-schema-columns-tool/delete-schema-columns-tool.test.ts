import { createMockApiClient } from '../test-utils/mock-api-client';
import { DeleteSchemaColumnsTool } from './delete-schema-columns-tool';

describe('DeleteSchemaColumnsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully deletes schema columns', async () => {
    mocks.setResponse({
      delete_entity_columns: { id: '42', name: 'my_schema', description: null, parent_id: null, revision: 2 },
    });
    const tool = new DeleteSchemaColumnsTool(mocks.mockApiClient);

    const result = await tool.execute({ entityId: '42', columnIds: ['col-1', 'col-2'] });

    expect((result.content as { message: string }).message).toContain('2 column(s)');
    expect((result.content as { message: string }).message).toContain('deleted');
  });

  it('passes versionOverride dev to API request', async () => {
    mocks.setResponse({
      delete_entity_columns: { id: '1', name: 'test', description: null, parent_id: null, revision: 2 },
    });
    const tool = new DeleteSchemaColumnsTool(mocks.mockApiClient);

    await tool.execute({ entityId: '1', columnIds: ['col-1'] });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ entityId: '1', columnIds: ['col-1'] }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('accepts entityName instead of entityId', async () => {
    mocks.setResponse({
      delete_entity_columns: { id: '5', name: 'my_schema', description: null, parent_id: null, revision: 3 },
    });
    const tool = new DeleteSchemaColumnsTool(mocks.mockApiClient);

    await tool.execute({ entityName: 'my_schema', columnIds: ['col-1'] });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ entityName: 'my_schema', columnIds: ['col-1'] }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Unauthorized'));
    const tool = new DeleteSchemaColumnsTool(mocks.mockApiClient);

    await expect(tool.execute({ entityId: '1', columnIds: ['col-1'] })).rejects.toThrow('Unauthorized');
  });

  it('has correct tool properties', () => {
    const tool = new DeleteSchemaColumnsTool(mocks.mockApiClient);

    expect(tool.name).toBe('delete_entity_columns');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('schema');
  });
});
