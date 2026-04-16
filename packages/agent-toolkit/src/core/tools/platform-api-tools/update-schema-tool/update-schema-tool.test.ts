import { createMockApiClient } from '../test-utils/mock-api-client';
import { UpdateSchemaTool } from './update-schema-tool';

describe('UpdateSchemaTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully updates a schema', async () => {
    mocks.setResponse({
      update_schema: { id: '42', name: 'my_schema', description: 'Updated desc', parent_id: null, revision: 2 },
    });
    const tool = new UpdateSchemaTool(mocks.mockApiClient);

    const result = await tool.execute({ id: '42', revision: 1, description: 'Updated desc' });

    expect(result.content).toEqual({
      message: 'Schema "my_schema" successfully updated',
      schema_id: '42',
      schema_name: 'my_schema',
      revision: 2,
    });
  });

  it('passes versionOverride dev to API request', async () => {
    mocks.setResponse({
      update_schema: { id: '1', name: 'test', description: null, parent_id: null, revision: 2 },
    });
    const tool = new UpdateSchemaTool(mocks.mockApiClient);

    await tool.execute({ id: '1', revision: 1 });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: '1', revision: 1 }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('passes optional parentId and description', async () => {
    mocks.setResponse({
      update_schema: { id: '5', name: 'child', description: 'desc', parent_id: '3', revision: 3 },
    });
    const tool = new UpdateSchemaTool(mocks.mockApiClient);

    await tool.execute({ id: '5', revision: 2, parentId: '3', description: 'desc' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: '5', revision: 2, parentId: '3', description: 'desc' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Unauthorized'));
    const tool = new UpdateSchemaTool(mocks.mockApiClient);

    await expect(tool.execute({ id: '1', revision: 1 })).rejects.toThrow('Unauthorized');
  });

  it('has correct tool properties', () => {
    const tool = new UpdateSchemaTool(mocks.mockApiClient);

    expect(tool.name).toBe('update_schema');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('schema');
  });
});
