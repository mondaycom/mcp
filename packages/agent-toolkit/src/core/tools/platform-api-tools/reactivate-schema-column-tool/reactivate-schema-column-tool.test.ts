import { createMockApiClient } from '../test-utils/mock-api-client';
import { ReactivateSchemaColumnTool } from './reactivate-schema-column-tool';

describe('ReactivateSchemaColumnTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully reactivates a schema column', async () => {
    mocks.setResponse({
      reactivate_schema_column: { id: '42', name: 'my_schema', description: null, parent_id: null, revision: 2 },
    });
    const tool = new ReactivateSchemaColumnTool(mocks.mockApiClient);

    const result = await tool.execute({ schemaId: '42', columnId: 'col-1' });

    expect((result.content as { message: string }).message).toContain('col-1');
    expect((result.content as { message: string }).message).toContain('reactivated');
  });

  it('passes versionOverride dev to API request', async () => {
    mocks.setResponse({
      reactivate_schema_column: { id: '1', name: 'test', description: null, parent_id: null, revision: 2 },
    });
    const tool = new ReactivateSchemaColumnTool(mocks.mockApiClient);

    await tool.execute({ schemaId: '1', columnId: 'col-1' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ schemaId: '1', columnId: 'col-1' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('accepts schemaName instead of schemaId', async () => {
    mocks.setResponse({
      reactivate_schema_column: { id: '5', name: 'my_schema', description: null, parent_id: null, revision: 3 },
    });
    const tool = new ReactivateSchemaColumnTool(mocks.mockApiClient);

    await tool.execute({ schemaName: 'my_schema', columnId: 'col-2' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ schemaName: 'my_schema', columnId: 'col-2' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Unauthorized'));
    const tool = new ReactivateSchemaColumnTool(mocks.mockApiClient);

    await expect(tool.execute({ schemaId: '1', columnId: 'col-1' })).rejects.toThrow('Unauthorized');
  });

  it('has correct tool properties', () => {
    const tool = new ReactivateSchemaColumnTool(mocks.mockApiClient);

    expect(tool.name).toBe('reactivate_schema_column');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('schema');
  });
});
