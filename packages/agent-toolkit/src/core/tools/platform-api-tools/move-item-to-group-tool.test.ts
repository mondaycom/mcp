import { createMockApiClient } from './test-utils/mock-api-client';
import { MoveItemToGroupTool } from './move-item-to-group-tool';

function graphQLError(message: string, code: string) {
  const error = new Error(message);
  (error as any).response = { errors: [{ message, extensions: { code } }] };
  return error;
}

describe('MoveItemToGroupTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;
  let tool: MoveItemToGroupTool;

  beforeEach(() => {
    mocks = createMockApiClient();
    tool = new MoveItemToGroupTool(mocks.mockApiClient);
  });

  it('moves the item and reports the target group', async () => {
    mocks.setResponse({ move_item_to_group: { id: '123' } });

    const result = await tool.execute({ itemId: 123, groupId: 'topics' }, undefined as any);

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.anything(), { itemId: '123', groupId: 'topics' });
    expect(result.content).toBe('Item 123 successfully moved to group topics');
  });

  it('propagates the API error code', async () => {
    mocks.setError(graphQLError('Resource not found', 'ResourceNotFoundException'));

    await expect(tool.execute({ itemId: 123, groupId: 'group_stale' }, undefined as any)).rejects.toThrow(
      'Failed to move item to group: Resource not found (details: {"code":"ResourceNotFoundException"})',
    );
  });

  it('keeps the GraphQL response on the rethrown error', async () => {
    const error = graphQLError('Resource not found', 'ResourceNotFoundException');
    mocks.setError(error);

    await expect(tool.execute({ itemId: 123, groupId: 'group_stale' }, undefined as any)).rejects.toMatchObject({
      response: (error as any).response,
    });
  });
});
