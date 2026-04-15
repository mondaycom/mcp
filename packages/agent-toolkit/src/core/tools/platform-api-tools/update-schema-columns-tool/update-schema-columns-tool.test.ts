import { createMockApiClient } from '../test-utils/mock-api-client';
import { UpdateSchemaColumnsTool } from './update-schema-columns-tool';

describe('UpdateSchemaColumnsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully updates schema columns', async () => {
    mocks.setResponse({
      update_schema_columns: { id: '42', name: 'my_schema', description: null, parent_id: null, revision: 3 },
    });
    const tool = new UpdateSchemaColumnsTool(mocks.mockApiClient);

    const result = await tool.execute({
      schemaName: 'my_schema',
      columns: [{ column_id: 'col-1', title: 'Updated Name' }],
    });

    expect(result.content).toEqual({
      message: 'Columns successfully updated on schema "my_schema"',
      entity_id: '42',
      entity_name: 'my_schema',
      revision: 3,
    });
  });

  it('passes versionOverride dev to API request', async () => {
    mocks.setResponse({
      update_schema_columns: { id: '1', name: 'test', description: null, parent_id: null, revision: 2 },
    });
    const tool = new UpdateSchemaColumnsTool(mocks.mockApiClient);

    await tool.execute({ schemaId: '1', columns: [{ column_id: 'col-1', title: 'New title' }] });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ schemaId: '1' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('passes columns array correctly', async () => {
    mocks.setResponse({
      update_schema_columns: { id: '1', name: 'test', description: null, parent_id: null, revision: 2 },
    });
    const tool = new UpdateSchemaColumnsTool(mocks.mockApiClient);
    const columns = [{ column_id: 'col-1', title: 'New', description: 'Updated desc' }];

    await tool.execute({ schemaId: '1', columns });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ columns }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Unauthorized'));
    const tool = new UpdateSchemaColumnsTool(mocks.mockApiClient);

    await expect(tool.execute({ schemaId: '1', columns: [{ column_id: 'col-1' }] })).rejects.toThrow('Unauthorized');
  });

  it('has correct tool properties', () => {
    const tool = new UpdateSchemaColumnsTool(mocks.mockApiClient);

    expect(tool.name).toBe('update_schema_columns');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('schema');
  });
});
