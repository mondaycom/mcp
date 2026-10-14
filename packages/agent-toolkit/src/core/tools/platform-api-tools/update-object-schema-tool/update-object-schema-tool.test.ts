import { createMockApiClient } from '../test-utils/mock-api-client';
import { UpdateObjectSchemaTool } from './update-object-schema-tool';

describe('UpdateObjectSchemaTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully updates an object schema', async () => {
    mocks.setResponse({
      update_object_schema: { id: '42', name: 'my_schema', description: 'Updated', parent_id: null, revision: 2 },
    });
    const tool = new UpdateObjectSchemaTool(mocks.mockApiClient);

    const result = await tool.execute({ id: '42', revision: 1, description: 'Updated' });

    expect(result.content).toEqual({
      message: 'Object schema "my_schema" successfully updated',
      schema_id: '42',
      schema_name: 'my_schema',
      revision: 2,
    });
  });

  it('passes all fields to API', async () => {
    mocks.setResponse({
      update_object_schema: { id: '42', name: 'my_schema', description: null, parent_id: null, revision: 2 },
    });
    const tool = new UpdateObjectSchemaTool(mocks.mockApiClient);

    await tool.execute({ id: '42', revision: 1, parentId: '10', description: 'new desc' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: '42', revision: 1, parentId: '10', description: 'new desc' }),
    );
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Conflict'));
    const tool = new UpdateObjectSchemaTool(mocks.mockApiClient);

    await expect(tool.execute({ id: '42', revision: 1 })).rejects.toThrow('Conflict');
  });

  it('has correct tool properties', () => {
    const tool = new UpdateObjectSchemaTool(mocks.mockApiClient);

    expect(tool.name).toBe('update_object_schema');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('revision');
  });
});
