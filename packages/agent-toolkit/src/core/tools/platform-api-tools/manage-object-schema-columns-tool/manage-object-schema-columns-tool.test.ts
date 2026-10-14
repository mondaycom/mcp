import { createMockApiClient } from '../test-utils/mock-api-client';
import { ManageObjectSchemaColumnsTool } from './manage-object-schema-columns-tool';

describe('ManageObjectSchemaColumnsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully creates columns', async () => {
    mocks.setResponse({
      create_object_schema_columns: { id: '42', name: 'my_schema', description: null, parent_id: null, revision: 2 },
    });
    const tool = new ManageObjectSchemaColumnsTool(mocks.mockApiClient);

    const result = await tool.execute({
      action: 'create',
      objectSchemaName: 'my_schema',
      columns: [{ type: 'text', title: 'Name' }],
    });

    expect((result.content as { message: string }).message).toContain('added');
  });

  it('successfully updates columns', async () => {
    mocks.setResponse({
      update_object_schema_columns: { id: '42', name: 'my_schema', description: null, parent_id: null, revision: 3 },
    });
    const tool = new ManageObjectSchemaColumnsTool(mocks.mockApiClient);

    const result = await tool.execute({
      action: 'update',
      objectSchemaId: '42',
      columns: [{ column_id: 'col-1', title: 'Updated Name' }],
    });

    expect((result.content as { message: string }).message).toContain('updated');
  });

  it('throws when no schema identifier provided', async () => {
    const tool = new ManageObjectSchemaColumnsTool(mocks.mockApiClient);

    await expect(
      tool.execute({ action: 'create', columns: [{ type: 'text', title: 'Name' }] }),
    ).rejects.toThrow('Either objectSchemaId or objectSchemaName must be provided');
  });

  it('applies default policy for create when omitted', async () => {
    mocks.setResponse({
      create_object_schema_columns: { id: '1', name: 'test', description: null, parent_id: null, revision: 1 },
    });
    const tool = new ManageObjectSchemaColumnsTool(mocks.mockApiClient);

    await tool.execute({ action: 'create', objectSchemaId: '1', columns: [{ type: 'numbers', title: 'Score' }] });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({ policy: { can_override: [], cannot_delete: false } }),
        ]),
      }),
    );
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Unauthorized'));
    const tool = new ManageObjectSchemaColumnsTool(mocks.mockApiClient);

    await expect(
      tool.execute({ action: 'create', objectSchemaId: '1', columns: [{ type: 'text', title: 'Name' }] }),
    ).rejects.toThrow('Unauthorized');
  });

  it('has correct tool properties', () => {
    const tool = new ManageObjectSchemaColumnsTool(mocks.mockApiClient);

    expect(tool.name).toBe('manage_object_schema_columns');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('object schema');
  });
});
