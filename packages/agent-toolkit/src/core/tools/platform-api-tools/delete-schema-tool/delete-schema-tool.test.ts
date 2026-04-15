import { createMockApiClient } from '../test-utils/mock-api-client';
import { DeleteSchemaTool } from './delete-schema-tool';

describe('DeleteSchemaTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully deletes a schema by id', async () => {
    mocks.setResponse({ delete_schema: { id: '42', name: 'my_schema' } });
    const tool = new DeleteSchemaTool(mocks.mockApiClient);

    const result = await tool.execute({ id: '42' });

    expect(result.content).toEqual({
      message: 'Schema "my_schema" successfully deleted',
      entity_id: '42',
      entity_name: 'my_schema',
    });
  });

  it('passes versionOverride dev to API request', async () => {
    mocks.setResponse({ delete_schema: { id: '1', name: 'test' } });
    const tool = new DeleteSchemaTool(mocks.mockApiClient);

    await tool.execute({ name: 'test' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'test' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('passes id or name', async () => {
    mocks.setResponse({ delete_schema: { id: '5', name: 'schema_a' } });
    const tool = new DeleteSchemaTool(mocks.mockApiClient);

    await tool.execute({ name: 'schema_a' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'schema_a' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Unauthorized'));
    const tool = new DeleteSchemaTool(mocks.mockApiClient);

    await expect(tool.execute({ id: '1' })).rejects.toThrow('Unauthorized');
  });

  it('has correct tool properties', () => {
    const tool = new DeleteSchemaTool(mocks.mockApiClient);

    expect(tool.name).toBe('delete_schema');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('schema');
  });
});
