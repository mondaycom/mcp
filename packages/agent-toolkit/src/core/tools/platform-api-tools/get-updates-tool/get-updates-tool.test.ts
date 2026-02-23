import { createMockApiClient } from '../test-utils/mock-api-client';
import { GetUpdatesTool } from './get-updates-tool';

describe('Get Updates Tool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  const mockItemUpdatesResponse = {
    items: [
      {
        id: '123',
        updates: [
          {
            id: 'update_1',
            body: '<p>This is update 1</p>',
            text_body: 'This is update 1',
            created_at: '2024-01-01T10:00:00Z',
            updated_at: '2024-01-01T10:00:00Z',
            item_id: '123',
            creator: {
              id: 'user_1',
              name: 'John Doe',
            },
          },
          {
            id: 'update_2',
            body: '<p>This is update 2</p>',
            text_body: 'This is update 2',
            created_at: '2024-01-02T10:00:00Z',
            updated_at: '2024-01-02T10:00:00Z',
            item_id: '123',
            creator: {
              id: 'user_2',
              name: 'Jane Smith',
            },
          },
        ],
      },
    ],
  };

  const mockBoardUpdatesResponse = {
    boards: [
      {
        id: '456',
        updates: [
          {
            id: 'board_update_1',
            body: '<p>Board-level update</p>',
            text_body: 'Board-level update',
            created_at: '2024-01-03T10:00:00Z',
            updated_at: '2024-01-03T10:00:00Z',
            item_id: null,
            creator: {
              id: 'user_3',
              name: 'Admin User',
            },
          },
        ],
      },
    ],
  };

  it('Successfully gets updates for an item with default parameters', async () => {
    mocks.setResponse(mockItemUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient, 'fake_token');

    const result = await tool.execute({ itemId: 123 } as any);

    const parsedResult = JSON.parse(result.content);
    expect(parsedResult.updates).toHaveLength(2);
    expect(parsedResult.updates[0].id).toBe('update_1');
    expect(parsedResult.updates[0].text_body).toBe('This is update 1');
    expect(parsedResult.updates[0].creator.name).toBe('John Doe');
    expect(parsedResult.pagination).toEqual({
      page: 1,
      limit: 25,
      count: 2,
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('query GetItemUpdates'),
      expect.objectContaining({
        itemId: '123',
        limit: 25,
        page: 1,
        includeReplies: false,
        includeAssets: false,
        includeLikes: false,
        includeViewers: false,
      }),
    );
  });

  it('Successfully gets board-level updates', async () => {
    mocks.setResponse(mockBoardUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient, 'fake_token');

    const result = await tool.execute({ boardId: 456 } as any);

    const parsedResult = JSON.parse(result.content);
    expect(parsedResult.updates).toHaveLength(1);
    expect(parsedResult.updates[0].id).toBe('board_update_1');
    expect(parsedResult.updates[0].text_body).toBe('Board-level update');
    expect(parsedResult.pagination).toEqual({
      page: 1,
      limit: 25,
      count: 1,
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('query GetBoardUpdates'),
      expect.objectContaining({
        boardId: '456',
        limit: 25,
        page: 1,
      }),
    );
  });

  it('Successfully gets updates with custom pagination', async () => {
    mocks.setResponse(mockItemUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient, 'fake_token');

    const result = await tool.execute({ itemId: 123, limit: 50, page: 2 } as any);

    const parsedResult = JSON.parse(result.content);
    expect(parsedResult.pagination).toEqual({
      page: 2,
      limit: 50,
      count: 2,
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        limit: 50,
        page: 2,
      }),
    );
  });

  it('Successfully gets updates with replies included', async () => {
    const responseWithReplies = {
      items: [
        {
          id: '123',
          updates: [
            {
              id: 'update_1',
              body: '<p>This is update 1</p>',
              text_body: 'This is update 1',
              created_at: '2024-01-01T10:00:00Z',
              updated_at: '2024-01-01T10:00:00Z',
              item_id: '123',
              creator: {
                id: 'user_1',
                name: 'John Doe',
              },
              replies: [
                {
                  id: 'reply_1',
                  body: '<p>This is a reply</p>',
                  text_body: 'This is a reply',
                  created_at: '2024-01-01T11:00:00Z',
                  updated_at: '2024-01-01T11:00:00Z',
                  creator: {
                    id: 'user_2',
                    name: 'Jane Smith',
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    mocks.setResponse(responseWithReplies);
    const tool = new GetUpdatesTool(mocks.mockApiClient, 'fake_token');

    const result = await tool.execute({ itemId: 123, includeReplies: true } as any);

    const parsedResult = JSON.parse(result.content);
    expect(parsedResult.updates[0].replies).toBeDefined();
    expect(parsedResult.updates[0].replies).toHaveLength(1);
    expect(parsedResult.updates[0].replies[0].text_body).toBe('This is a reply');

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        includeReplies: true,
      }),
    );
  });

  it('Successfully gets updates with assets included', async () => {
    const responseWithAssets = {
      items: [
        {
          id: '123',
          updates: [
            {
              id: 'update_1',
              body: '<p>Update with file</p>',
              text_body: 'Update with file',
              created_at: '2024-01-01T10:00:00Z',
              updated_at: '2024-01-01T10:00:00Z',
              item_id: '123',
              creator: {
                id: 'user_1',
                name: 'John Doe',
              },
              assets: [
                {
                  id: 'asset_1',
                  name: 'document.pdf',
                  url: 'https://example.com/document.pdf',
                  file_extension: 'pdf',
                  file_size: 12345,
                  created_at: '2024-01-01T10:00:00Z',
                },
              ],
            },
          ],
        },
      ],
    };

    mocks.setResponse(responseWithAssets);
    const tool = new GetUpdatesTool(mocks.mockApiClient, 'fake_token');

    const result = await tool.execute({ itemId: 123, includeAssets: true } as any);

    const parsedResult = JSON.parse(result.content);
    expect(parsedResult.updates[0].assets).toBeDefined();
    expect(parsedResult.updates[0].assets).toHaveLength(1);
    expect(parsedResult.updates[0].assets[0].name).toBe('document.pdf');

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        includeAssets: true,
      }),
    );
  });

  it('Successfully gets updates with likes included', async () => {
    const responseWithLikes = {
      items: [
        {
          id: '123',
          updates: [
            {
              id: 'update_1',
              body: '<p>Popular update</p>',
              text_body: 'Popular update',
              created_at: '2024-01-01T10:00:00Z',
              updated_at: '2024-01-01T10:00:00Z',
              item_id: '123',
              creator: {
                id: 'user_1',
                name: 'John Doe',
              },
              likes: [
                {
                  id: 'like_1',
                  created_at: '2024-01-01T11:00:00Z',
                  creator: {
                    id: 'user_2',
                    name: 'Jane Smith',
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    mocks.setResponse(responseWithLikes);
    const tool = new GetUpdatesTool(mocks.mockApiClient, 'fake_token');

    const result = await tool.execute({ itemId: 123, includeLikes: true } as any);

    const parsedResult = JSON.parse(result.content);
    expect(parsedResult.updates[0].likes).toBeDefined();
    expect(parsedResult.updates[0].likes).toHaveLength(1);
    expect(parsedResult.updates[0].likes[0].creator.name).toBe('Jane Smith');

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        includeLikes: true,
      }),
    );
  });

  it('Successfully gets updates with viewers included', async () => {
    const responseWithViewers = {
      items: [
        {
          id: '123',
          updates: [
            {
              id: 'update_1',
              body: '<p>Update with viewers</p>',
              text_body: 'Update with viewers',
              created_at: '2024-01-01T10:00:00Z',
              updated_at: '2024-01-01T10:00:00Z',
              item_id: '123',
              creator: {
                id: 'user_1',
                name: 'John Doe',
              },
              viewers: [{ id: 'viewer_1' }, { id: 'viewer_2' }],
            },
          ],
        },
      ],
    };

    mocks.setResponse(responseWithViewers);
    const tool = new GetUpdatesTool(mocks.mockApiClient, 'fake_token');

    const result = await tool.execute({ itemId: 123, includeViewers: true } as any);

    const parsedResult = JSON.parse(result.content);
    expect(parsedResult.updates[0].viewers).toBeDefined();
    expect(parsedResult.updates[0].viewers).toHaveLength(2);

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        includeViewers: true,
      }),
    );
  });

  it('Successfully gets updates with all optional fields included', async () => {
    const fullResponse = {
      items: [
        {
          id: '123',
          updates: [
            {
              id: 'update_1',
              body: '<p>Complete update</p>',
              text_body: 'Complete update',
              created_at: '2024-01-01T10:00:00Z',
              updated_at: '2024-01-01T10:00:00Z',
              item_id: '123',
              creator: { id: 'user_1', name: 'John Doe' },
              replies: [
                {
                  id: 'reply_1',
                  body: '<p>Reply</p>',
                  text_body: 'Reply',
                  created_at: '2024-01-01T11:00:00Z',
                  updated_at: '2024-01-01T11:00:00Z',
                  creator: { id: 'user_2', name: 'Jane Smith' },
                },
              ],
              assets: [
                {
                  id: 'asset_1',
                  name: 'file.pdf',
                  url: 'https://example.com/file.pdf',
                  file_extension: 'pdf',
                  file_size: 1234,
                  created_at: '2024-01-01T10:00:00Z',
                },
              ],
              likes: [
                {
                  id: 'like_1',
                  created_at: '2024-01-01T11:00:00Z',
                  creator: { id: 'user_3', name: 'Bob Johnson' },
                },
              ],
              viewers: [{ id: 'viewer_1' }],
            },
          ],
        },
      ],
    };

    mocks.setResponse(fullResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient, 'fake_token');

    const result = await tool.execute({
      itemId: 123,
      includeReplies: true,
      includeAssets: true,
      includeLikes: true,
      includeViewers: true,
    } as any);

    const parsedResult = JSON.parse(result.content);
    expect(parsedResult.updates[0].replies).toBeDefined();
    expect(parsedResult.updates[0].assets).toBeDefined();
    expect(parsedResult.updates[0].likes).toBeDefined();
    expect(parsedResult.updates[0].viewers).toBeDefined();
  });

  it('Returns empty array when no updates exist', async () => {
    const emptyResponse = {
      items: [{ id: '123', updates: [] }],
    };

    mocks.setResponse(emptyResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient, 'fake_token');

    const result = await tool.execute({ itemId: 123 } as any);

    const parsedResult = JSON.parse(result.content);
    expect(parsedResult.updates).toEqual([]);
    expect(parsedResult.pagination.count).toBe(0);
  });

  it('Returns empty array when item has no updates field', async () => {
    const noUpdatesResponse = {
      items: [{ id: '123' }],
    };

    mocks.setResponse(noUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient, 'fake_token');

    const result = await tool.execute({ itemId: 123 } as any);

    const parsedResult = JSON.parse(result.content);
    expect(parsedResult.updates).toEqual([]);
    expect(parsedResult.pagination.count).toBe(0);
  });

  it('Throws error when neither itemId nor boardId is provided', async () => {
    const tool = new GetUpdatesTool(mocks.mockApiClient, 'fake_token');

    await expect(tool.execute({} as any)).rejects.toThrow('Either itemId or boardId must be provided');
  });

  it('Throws error when both itemId and boardId are provided', async () => {
    const tool = new GetUpdatesTool(mocks.mockApiClient, 'fake_token');

    await expect(tool.execute({ itemId: 123, boardId: 456 } as any)).rejects.toThrow(
      'Cannot provide both itemId and boardId - choose one',
    );
  });

  it('Handles GraphQL response errors', async () => {
    const graphqlError = new Error('GraphQL Error');
    (graphqlError as any).response = {
      errors: [{ message: 'Item not found' }, { message: 'Insufficient permissions' }],
    };
    mocks.setError(graphqlError);
    const tool = new GetUpdatesTool(mocks.mockApiClient, 'fake_token');

    await expect(tool.execute({ itemId: 123 } as any)).rejects.toThrow(
      'Failed to get updates: Item not found, Insufficient permissions',
    );
  });

  it('Handles network errors', async () => {
    const networkError = new Error('Network request failed');
    mocks.setError(networkError);
    const tool = new GetUpdatesTool(mocks.mockApiClient, 'fake_token');

    await expect(tool.execute({ itemId: 123 } as any)).rejects.toThrow('Failed to get updates: Network request failed');
  });

  it('Has correct schema and tool properties', () => {
    const tool = new GetUpdatesTool(mocks.mockApiClient, 'fake_token');
    const schema = tool.getInputSchema();

    expect(tool.name).toBe('get_updates');
    expect(tool.type).toBe('read');
    expect(tool.getDescription()).toContain('updates');
    expect(tool.getDescription()).toContain('item');
    expect(tool.getDescription()).toContain('board');

    expect(() => schema.itemId.parse(123)).not.toThrow();
    expect(() => schema.boardId.parse(456)).not.toThrow();
    expect(() => schema.limit.parse(50)).not.toThrow();
    expect(() => schema.page.parse(2)).not.toThrow();
    expect(() => schema.includeReplies.parse(true)).not.toThrow();
    expect(() => schema.includeAssets.parse(true)).not.toThrow();
    expect(() => schema.includeLikes.parse(true)).not.toThrow();
    expect(() => schema.includeViewers.parse(true)).not.toThrow();
  });

  it('Rejects limit values outside valid range', async () => {
    const tool = new GetUpdatesTool(mocks.mockApiClient, 'fake_token');

    await expect(tool.execute({ itemId: 123, limit: 0 } as any)).rejects.toThrow();

    await expect(tool.execute({ itemId: 123, limit: 101 } as any)).rejects.toThrow();
  });

  it('Rejects page values less than 1', async () => {
    const tool = new GetUpdatesTool(mocks.mockApiClient, 'fake_token');

    await expect(tool.execute({ itemId: 123, page: 0 } as any)).rejects.toThrow();
  });
});
