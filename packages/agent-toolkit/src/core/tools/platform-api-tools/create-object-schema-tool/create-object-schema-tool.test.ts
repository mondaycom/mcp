import { createMockApiClient } from '../test-utils/mock-api-client';
import { CreateObjectSchemaTool } from './create-object-schema-tool';

describe('CreateObjectSchemaTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully creates an object schema', async () => {
    mocks.setResponse({
      create_object_schema: { id: '42', name: 'my_schema', description: 'A test schema', parent_id: null, revision: 1 },
    });
    const tool = new CreateObjectSchemaTool(mocks.mockApiClient);

    const result = await tool.execute({ name: 'my_schema', description: 'A test schema' });

    expect(result.content).toEqual({
      message: 'Object schema "my_schema" successfully created',
      schema_id: '42',
      schema_name: 'my_schema',
      revision: 1,
    });
  });

  it('passes all fields to API', async () => {
    mocks.setResponse({
      create_object_schema: { id: '5', name: 'child', description: 'desc', parent_id: '3', revision: 1 },
    });
    const tool = new CreateObjectSchemaTool(mocks.mockApiClient);

    await tool.execute({ name: 'child', parentId: '3', description: 'desc' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'child', parentId: '3', description: 'desc' }),
    );
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Unauthorized'));
    const tool = new CreateObjectSchemaTool(mocks.mockApiClient);

    await expect(tool.execute({ name: 'test' })).rejects.toThrow('Unauthorized');
  });

  it('has correct tool properties', () => {
    const tool = new CreateObjectSchemaTool(mocks.mockApiClient);

    expect(tool.name).toBe('create_object_schema');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('object schema');
  });
});
