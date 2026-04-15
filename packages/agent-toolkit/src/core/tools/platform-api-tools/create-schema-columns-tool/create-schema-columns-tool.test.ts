import { createMockApiClient } from '../test-utils/mock-api-client';
import { CreateSchemaColumnsTool } from './create-schema-columns-tool';

describe('CreateSchemaColumnsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully creates schema columns', async () => {
    mocks.setResponse({
      create_schema_columns: { id: '42', name: 'my_schema', description: null, parent_id: null, revision: 2 },
    });
    const tool = new CreateSchemaColumnsTool(mocks.mockApiClient);

    const result = await tool.execute({
      schemaName: 'my_schema',
      columns: [{ type: 'text', title: 'Name' }],
    });

    expect(result.content).toEqual({
      message: 'Columns successfully added to schema "my_schema"',
<<<<<<< HEAD
      schema_id: '42',
      schema_name: 'my_schema',
=======
      entity_id: '42',
      entity_name: 'my_schema',
>>>>>>> 770d725 (feat(agent-toolkit): add data-structure schema management tools (v5.2.0))
      revision: 2,
    });
  });

  it('passes versionOverride dev to API request', async () => {
    mocks.setResponse({
      create_schema_columns: { id: '1', name: 'test', description: null, parent_id: null, revision: 1 },
    });
    const tool = new CreateSchemaColumnsTool(mocks.mockApiClient);

    await tool.execute({ schemaId: '1', columns: [{ type: 'status', title: 'Status' }] });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ schemaId: '1' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

<<<<<<< HEAD
  it('applies default policy when not provided', async () => {
=======
  it('passes columns array with default policy when omitted', async () => {
>>>>>>> 770d725 (feat(agent-toolkit): add data-structure schema management tools (v5.2.0))
    mocks.setResponse({
      create_schema_columns: { id: '1', name: 'test', description: null, parent_id: null, revision: 1 },
    });
    const tool = new CreateSchemaColumnsTool(mocks.mockApiClient);

    await tool.execute({ schemaId: '1', columns: [{ type: 'numbers', title: 'Score', defaults: { unit: { symbol: '$' } } }] });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({ type: 'numbers', title: 'Score', policy: { can_override: [], cannot_delete: false } }),
        ]),
      }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Unauthorized'));
    const tool = new CreateSchemaColumnsTool(mocks.mockApiClient);

    await expect(tool.execute({ schemaId: '1', columns: [{ type: 'text', title: 'Name' }] })).rejects.toThrow('Unauthorized');
  });

  it('has correct tool properties', () => {
    const tool = new CreateSchemaColumnsTool(mocks.mockApiClient);

    expect(tool.name).toBe('create_schema_columns');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('schema');
  });
});
