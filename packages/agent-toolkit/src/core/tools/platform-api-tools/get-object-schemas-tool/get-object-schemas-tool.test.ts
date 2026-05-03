import { createMockApiClient } from '../test-utils/mock-api-client';
import { GetObjectSchemasTool } from './get-object-schemas-tool';

describe('GetObjectSchemasTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully retrieves object schemas', async () => {
    mocks.setResponse({
      get_object_schemas: [
        { id: '1', name: 'schema_a', description: 'First', parent_id: null, revision: 1, account_id: '99', connected_boards_count: 0 },
      ],
    });
    const tool = new GetObjectSchemasTool(mocks.mockApiClient);

    const result = await tool.execute({});

    expect((result.content as { message: string }).message).toBe('Retrieved 1 object schema(s)');
  });

  it('passes ids filter', async () => {
    mocks.setResponse({ get_object_schemas: [] });
    const tool = new GetObjectSchemasTool(mocks.mockApiClient);

    await tool.execute({ ids: ['1', '2'] });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ids: ['1', '2'] }),
    );
  });

  it('passes excludeCreatedByMonday flag', async () => {
    mocks.setResponse({ get_object_schemas: [] });
    const tool = new GetObjectSchemasTool(mocks.mockApiClient);

    await tool.execute({ excludeCreatedByMonday: true });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ excludeCreatedByMonday: true }),
    );
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Unauthorized'));
    const tool = new GetObjectSchemasTool(mocks.mockApiClient);

    await expect(tool.execute({})).rejects.toThrow('Unauthorized');
  });

  it('has correct tool properties', () => {
    const tool = new GetObjectSchemasTool(mocks.mockApiClient);

    expect(tool.name).toBe('get_object_schemas');
    expect(tool.type).toBe('read');
    expect(tool.getDescription()).toContain('object schema');
  });
});
