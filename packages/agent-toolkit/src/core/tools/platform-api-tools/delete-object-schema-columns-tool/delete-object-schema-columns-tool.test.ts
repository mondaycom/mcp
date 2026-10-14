import { createMockApiClient } from '../test-utils/mock-api-client';
import { DeleteObjectSchemaColumnsTool } from './delete-object-schema-columns-tool';

describe('DeleteObjectSchemaColumnsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully deletes columns', async () => {
    mocks.setResponse({
      delete_object_schema_columns: { id: '42', name: 'my_schema', description: null, parent_id: null, revision: 2 },
    });
    const tool = new DeleteObjectSchemaColumnsTool(mocks.mockApiClient);

    const result = await tool.execute({ objectSchemaId: '42', columnIds: ['col-1', 'col-2'] });

    expect((result.content as { message: string }).message).toContain('2 column(s)');
  });

  it('passes versionOverride dev to API request', async () => {
    mocks.setResponse({
      delete_object_schema_columns: { id: '1', name: 'test', description: null, parent_id: null, revision: 1 },
    });
    const tool = new DeleteObjectSchemaColumnsTool(mocks.mockApiClient);

    await tool.execute({ objectSchemaId: '1', columnIds: ['col-1'] });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ objectSchemaId: '1', columnIds: ['col-1'] }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('throws when neither objectSchemaId nor objectSchemaName provided', async () => {
    const tool = new DeleteObjectSchemaColumnsTool(mocks.mockApiClient);

    await expect(tool.execute({ columnIds: ['col-1'] })).rejects.toThrow('Either objectSchemaId or objectSchemaName must be provided');
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Unauthorized'));
    const tool = new DeleteObjectSchemaColumnsTool(mocks.mockApiClient);

    await expect(tool.execute({ objectSchemaId: '1', columnIds: ['col-1'] })).rejects.toThrow('Unauthorized');
  });

  it('has correct tool properties', () => {
    const tool = new DeleteObjectSchemaColumnsTool(mocks.mockApiClient);

    expect(tool.name).toBe('delete_object_schema_columns');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('object schema');
  });
});
