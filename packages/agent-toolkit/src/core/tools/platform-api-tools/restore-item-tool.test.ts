import { createMockApiClient } from './test-utils/mock-api-client';
import { RestoreItemTool } from './restore-item-tool';

describe('Restore Item Tool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('Successfully restores an item via restore_item mutation', async () => {
    mocks.setResponse({ restore_item: { id: '123', name: 'My item' } });
    const tool = new RestoreItemTool(mocks.mockApiClient);

    const result = await tool.execute({ itemId: 123 });

    expect(result.content).toEqual({
      message: 'Item 123 successfully restored',
      item_id: '123',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
    expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ itemId: '123' }));
  });

  it('Propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Item not found'));
    const tool = new RestoreItemTool(mocks.mockApiClient);

    await expect(tool.execute({ itemId: 999 })).rejects.toThrow('Item not found');
  });

  it('Has correct schema and tool properties', () => {
    const tool = new RestoreItemTool(mocks.mockApiClient);
    const schema = tool.getInputSchema();

    expect(tool.name).toBe('restore_item');
    expect(tool.type).toBe('write');
    expect(tool.annotations.destructiveHint).toBe(false);
    expect(tool.annotations.idempotentHint).toBe(true);
    expect(tool.getDescription()).toContain('Restore');

    expect(() => schema.itemId.parse(123)).not.toThrow();
  });
});
