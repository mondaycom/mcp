import { createMockApiClient } from '../test-utils/mock-api-client';
import { GetSchemasTool } from './get-schemas-tool';

describe('GetSchemasTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully retrieves schemas', async () => {
    mocks.setResponse({
      get_schemas: [
        { id: '1', name: 'schema_a', description: 'First', parent_id: null, revision: 1, account_id: '99' },
        { id: '2', name: 'schema_b', description: null, parent_id: null, revision: 2, account_id: '99' },
      ],
    });
    const tool = new GetSchemasTool(mocks.mockApiClient);

    const result = await tool.execute({});

    expect((result.content as { message: string }).message).toBe('Retrieved 2 schema(s)');
    expect((result.content as { schemas: unknown[] }).schemas).toHaveLength(2);
  });

  it('passes versionOverride dev to API request', async () => {
    mocks.setResponse({ get_schemas: [] });
    const tool = new GetSchemasTool(mocks.mockApiClient);

    await tool.execute({});

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('passes ids filter', async () => {
    mocks.setResponse({ get_schemas: [{ id: '1', name: 'schema_a', description: null, parent_id: null, revision: 1, account_id: '99' }] });
    const tool = new GetSchemasTool(mocks.mockApiClient);

    await tool.execute({ ids: ['1'] });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ids: ['1'] }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Unauthorized'));
    const tool = new GetSchemasTool(mocks.mockApiClient);

    await expect(tool.execute({})).rejects.toThrow('Unauthorized');
  });

  it('has correct tool properties', () => {
    const tool = new GetSchemasTool(mocks.mockApiClient);

    expect(tool.name).toBe('get_schemas');
    expect(tool.type).toBe('read');
    expect(tool.getDescription()).toContain('schema');
  });
});
