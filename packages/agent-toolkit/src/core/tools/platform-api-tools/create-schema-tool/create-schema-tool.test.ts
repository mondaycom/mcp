import { createMockApiClient } from '../test-utils/mock-api-client';
import { CreateSchemaTool } from './create-schema-tool';

describe('CreateSchemaTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully creates a schema', async () => {
    mocks.setResponse({
      create_schema: { id: '42', name: 'my_schema', description: 'A test schema', parent_id: null },
    });
    const tool = new CreateSchemaTool(mocks.mockApiClient);

    const result = await tool.execute({ name: 'my_schema', description: 'A test schema' });

    expect(result.content).toEqual({
      message: 'Schema "my_schema" successfully created',
      entity_id: '42',
      entity_name: 'my_schema',
    });
  });

  it('passes versionOverride dev to API request', async () => {
    mocks.setResponse({
      create_schema: { id: '1', name: 'test', description: null, parent_id: null },
    });
    const tool = new CreateSchemaTool(mocks.mockApiClient);

    await tool.execute({ name: 'test' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'test' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('passes optional parentId and description', async () => {
    mocks.setResponse({
      create_schema: { id: '5', name: 'child', description: 'desc', parent_id: '3' },
    });
    const tool = new CreateSchemaTool(mocks.mockApiClient);

    await tool.execute({ name: 'child', parentId: '3', description: 'desc' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'child', parentId: '3', description: 'desc' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Unauthorized'));
    const tool = new CreateSchemaTool(mocks.mockApiClient);

    await expect(tool.execute({ name: 'test' })).rejects.toThrow('Unauthorized');
  });

  it('has correct tool properties', () => {
    const tool = new CreateSchemaTool(mocks.mockApiClient);

    expect(tool.name).toBe('create_schema');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('schema');
  });
});
