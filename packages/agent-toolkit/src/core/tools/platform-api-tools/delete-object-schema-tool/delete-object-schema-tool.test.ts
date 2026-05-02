import { createMockApiClient } from '../test-utils/mock-api-client';
import { DeleteObjectSchemaTool } from './delete-object-schema-tool';

describe('DeleteObjectSchemaTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully deletes an object schema by id', async () => {
    mocks.setResponse({ delete_object_schema: { id: '42', name: 'my_schema' } });
    const tool = new DeleteObjectSchemaTool(mocks.mockApiClient);

    const result = await tool.execute({ id: '42' });

    expect((result.content as { message: string }).message).toContain('successfully deleted');
  });

  it('accepts name instead of id', async () => {
    mocks.setResponse({ delete_object_schema: { id: '42', name: 'my_schema' } });
    const tool = new DeleteObjectSchemaTool(mocks.mockApiClient);

    await tool.execute({ name: 'my_schema' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'my_schema' }),
    );
  });

  it('throws when neither id nor name provided', async () => {
    const tool = new DeleteObjectSchemaTool(mocks.mockApiClient);

    await expect(tool.execute({})).rejects.toThrow('Either id or name must be provided');
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Forbidden'));
    const tool = new DeleteObjectSchemaTool(mocks.mockApiClient);

    await expect(tool.execute({ id: '1' })).rejects.toThrow('Forbidden');
  });

  it('has correct tool properties', () => {
    const tool = new DeleteObjectSchemaTool(mocks.mockApiClient);

    expect(tool.name).toBe('delete_object_schema');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('object schema');
  });
});
