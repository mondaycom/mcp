import { createMockApiClient } from '../test-utils/mock-api-client';
import { DEFAULT_LIMIT_PER_ITEM, GetUpdatesTool, MAX_TEXT_BODY_LENGTH } from './get-updates-tool';

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
        url: 'https://monday.com/items/123',
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

  it('Gets updates for one item with default parameters', async () => {
    mocks.setResponse(mockItemUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectIds: ['123'], objectType: 'Item' } as any);

    const content = result.content as any;
    expect(content.items).toHaveLength(1);
    expect(content.items[0]).toMatchObject({ item_id: '123', url: 'https://monday.com/items/123', count: 2 });
    expect(content.items[0].updates[0]).toMatchObject({
      id: 'update_1',
      text_body: 'This is update 1',
      creator: { id: 'user_1', name: 'John Doe' },
    });
    expect(content.pagination).toEqual({ page: 1, limit: 25 });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('query GetItemsUpdates'),
      expect.objectContaining({
        itemIds: ['123'],
        itemsLimit: 1,
        limit: 25,
        page: 1,
        includeReplies: false,
        includeAssets: false,
      }),
    );
  });

  it('Gets board updates with default parameters', async () => {
    mocks.setResponse(mockBoardUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectIds: ['456'], objectType: 'Board' } as any);

    const content = result.content as any;
    expect(content.board_id).toBe('456');
    expect(content.updates).toHaveLength(1);
    expect(content.updates[0]).toMatchObject({ id: 'board_update_1', text_body: 'Board-level update' });
    expect(content.pagination).toEqual({ page: 1, limit: 25, count: 1 });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('query GetBoardUpdates'),
      expect.objectContaining({
        boardId: '456',
        limit: 25,
        page: 1,
        includeReplies: false,
        includeAssets: false,
        boardUpdatesOnly: true,
      }),
    );
  });

  it('Passes custom pagination through', async () => {
    mocks.setResponse(mockItemUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectIds: ['123'], objectType: 'Item', limit: 50, page: 2 } as any);

    expect((result.content as any).pagination).toEqual({ page: 2, limit: 50 });
    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ limit: 50, page: 2 }),
    );
  });

  it('Includes replies and assets when asked', async () => {
    mocks.setResponse({
      items: [
        {
          id: '123',
          updates: [
            {
              ...mockItemUpdatesResponse.items[0].updates[0],
              replies: [
                {
                  id: 'reply_1',
                  text_body: 'This is a reply',
                  created_at: '2024-01-01T11:00:00Z',
                  updated_at: '2024-01-01T11:00:00Z',
                  creator: { id: 'user_2', name: 'Jane Smith' },
                },
              ],
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
    });
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({
      objectIds: ['123'],
      objectType: 'Item',
      includeReplies: true,
      includeAssets: true,
    } as any);

    const update = (result.content as any).items[0].updates[0];
    expect(update.replies).toHaveLength(1);
    expect(update.replies[0].text_body).toBe('This is a reply');
    expect(update.assets).toHaveLength(1);
    expect(update.assets[0].name).toBe('document.pdf');
    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ includeReplies: true, includeAssets: true }),
    );
  });

  it('Returns an empty list for an item without updates', async () => {
    mocks.setResponse({ items: [{ id: '123', updates: [] }] });
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectIds: ['123'], objectType: 'Item' } as any);

    expect((result.content as any).items[0]).toMatchObject({ item_id: '123', updates: [], count: 0 });
  });

  it('Returns a message when the board has no updates', async () => {
    mocks.setResponse({ boards: [{ id: '456', updates: [] }] });
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectIds: ['456'], objectType: 'Board' } as any);

    expect(result.content).toBe('No updates found for board with id 456');
  });

  it('Handles GraphQL response errors', async () => {
    const graphqlError = new Error('GraphQL Error');
    (graphqlError as any).response = {
      errors: [{ message: 'Item not found' }, { message: 'Insufficient permissions' }],
    };
    mocks.setError(graphqlError);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await expect(tool.execute({ objectIds: ['123'], objectType: 'Item' } as any)).rejects.toThrow(
      'Failed to get updates: Item not found, Insufficient permissions',
    );
  });

  it('Handles network errors', async () => {
    mocks.setError(new Error('Network request failed'));
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await expect(tool.execute({ objectIds: ['123'], objectType: 'Item' } as any)).rejects.toThrow(
      'Failed to get updates: Network request failed',
    );
  });

  it('Has correct schema and tool properties', () => {
    const tool = new GetUpdatesTool(mocks.mockApiClient);
    const schema = tool.getInputSchema();

    expect(tool.name).toBe('get_updates');
    expect(tool.type).toBe('read');
    expect(tool.getDescription()).toContain('updates');
    expect(tool.getDescription()).toContain('items');
    expect(tool.getDescription()).toContain('board');

    expect(() => schema.objectId.parse('123')).not.toThrow();
    expect(() => schema.objectId.parse(undefined)).not.toThrow();
    expect(() => schema.objectIds.parse(['123'])).not.toThrow();
    expect(() => schema.objectIds.parse(undefined)).not.toThrow();
    expect(() => schema.objectType.parse('Item')).not.toThrow();
    expect(() => schema.objectType.parse('Board')).not.toThrow();
    expect(() => schema.limit.parse(50)).not.toThrow();
    expect(() => schema.page.parse(2)).not.toThrow();
    expect(() => schema.fromDate.parse('2024-01-01')).not.toThrow();
    expect(() => schema.toDate.parse('2024-01-31')).not.toThrow();
    expect(() => schema.includeItemUpdates.parse(true)).not.toThrow();
  });

  it('Rejects out-of-range limit and page values', () => {
    const schema = new GetUpdatesTool(mocks.mockApiClient).getInputSchema();

    expect(() => schema.limit.parse(0)).toThrow();
    expect(() => schema.limit.parse(101)).toThrow();
    expect(() => schema.page.parse(0)).toThrow();
  });

  it('Rejects an empty or oversized objectIds list', () => {
    const schema = new GetUpdatesTool(mocks.mockApiClient).getInputSchema();

    expect(() => schema.objectIds.parse([])).toThrow();
    expect(() => schema.objectIds.parse(Array.from({ length: 26 }, (_, i) => String(i)))).toThrow();
  });

  it('Rejects more than one board id with an INVALID_TOOL_ARGS validation error', async () => {
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await expect(tool.execute({ objectIds: ['1', '2'], objectType: 'Board' } as any)).rejects.toMatchObject({
      name: 'ToolValidationError',
      code: 'INVALID_TOOL_ARGS',
      message: 'Board queries take exactly one board ID in objectIds',
    });
  });

  it('Rejects a half date range with an INVALID_TOOL_ARGS validation error', async () => {
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await expect(
      tool.execute({ objectIds: ['456'], objectType: 'Board', fromDate: '2024-01-01' } as any),
    ).rejects.toMatchObject({ name: 'ToolValidationError', code: 'INVALID_TOOL_ARGS' });
    await expect(
      tool.execute({ objectIds: ['456'], objectType: 'Board', toDate: '2024-01-31' } as any),
    ).rejects.toThrow('Both fromDate and toDate must be provided together');
  });

  it('Passes a board date range to the API, covering the whole last day', async () => {
    mocks.setResponse(mockBoardUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await tool.execute({
      objectIds: ['456'],
      objectType: 'Board',
      fromDate: '2024-01-31',
      toDate: '2024-01-31',
    } as any);

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('query GetBoardUpdates'),
      expect.objectContaining({ boardId: '456', fromDate: '2024-01-31T00:00:00Z', toDate: '2024-01-31T23:59:59Z' }),
    );
  });

  it('Passes full ISO8601 datetimes through without normalization', async () => {
    mocks.setResponse(mockBoardUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await tool.execute({
      objectIds: ['456'],
      objectType: 'Board',
      fromDate: '2024-01-01T08:00:00Z',
      toDate: '2024-01-31T23:59:59Z',
    } as any);

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fromDate: '2024-01-01T08:00:00Z', toDate: '2024-01-31T23:59:59Z' }),
    );
  });

  it('Does not send date variables when no range is given', async () => {
    mocks.setResponse(mockBoardUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await tool.execute({ objectIds: ['456'], objectType: 'Board' } as any);

    const callArgs = mocks.getMockRequest().mock.calls[0][1];
    expect(callArgs).not.toHaveProperty('fromDate');
    expect(callArgs).not.toHaveProperty('toDate');
  });

  it('Includes item updates in a board query when asked', async () => {
    mocks.setResponse(mockBoardUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await tool.execute({ objectIds: ['456'], objectType: 'Board', includeItemUpdates: true } as any);

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('query GetBoardUpdates'),
      expect.objectContaining({ boardId: '456', boardUpdatesOnly: false }),
    );
  });

  it('Filters item updates by creation time for a date range', async () => {
    mocks.setResponse(mockItemUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({
      objectIds: ['123'],
      objectType: 'Item',
      fromDate: '2024-01-02',
      toDate: '2024-01-02',
    } as any);

    const item = (result.content as any).items[0];
    expect(item.updates.map((u: any) => u.id)).toEqual(['update_2']);
    expect(item.count).toBe(1);
    const callArgs = mocks.getMockRequest().mock.calls[0][1];
    expect(callArgs).not.toHaveProperty('fromDate');
  });

  it('Gets updates for several items in one request, grouped per item', async () => {
    mocks.setResponse({
      items: [
        { id: '123', url: 'https://monday.com/items/123', updates: mockItemUpdatesResponse.items[0].updates },
        { id: '789', url: 'https://monday.com/items/789', updates: [] },
      ],
    });
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectIds: ['123', '789'], objectType: 'Item', limit: 5 } as any);

    expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('query GetItemsUpdates'),
      expect.objectContaining({ itemIds: ['123', '789'], itemsLimit: 2, limit: 5, page: 1 }),
    );
    const content = result.content as any;
    expect(content.items).toHaveLength(2);
    expect(content.items[0]).toMatchObject({ item_id: '123', count: 2 });
    expect(content.items[0].updates.map((u: any) => u.id)).toEqual(['update_1', 'update_2']);
    expect(content.items[1]).toMatchObject({ item_id: '789', updates: [], count: 0 });
    expect(content).not.toHaveProperty('not_found');
  });

  it('Lists requested items the API did not return', async () => {
    mocks.setResponse({ items: [{ id: '123', url: 'https://monday.com/items/123', updates: [] }] });
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectIds: ['123', '404', '405'], objectType: 'Item' } as any);

    expect((result.content as any).not_found).toEqual(['404', '405']);
  });

  it('Uses a smaller default limit per item when reading several items', async () => {
    mocks.setResponse({ items: [] });
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await tool.execute({ objectIds: ['123', '789'], objectType: 'Item' } as any);

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('query GetItemsUpdates'),
      expect.objectContaining({ limit: DEFAULT_LIMIT_PER_ITEM }),
    );
  });

  it('Truncates long update and reply bodies and flags them', async () => {
    const longText = 'x'.repeat(MAX_TEXT_BODY_LENGTH + 10);
    mocks.setResponse({
      items: [
        {
          id: '123',
          updates: [
            {
              ...mockItemUpdatesResponse.items[0].updates[0],
              text_body: longText,
              replies: [{ id: 'reply_1', text_body: longText, created_at: null, updated_at: null, creator: null }],
            },
          ],
        },
      ],
    });
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectIds: ['123'], objectType: 'Item', includeReplies: true } as any);

    const update = (result.content as any).items[0].updates[0];
    expect(update.text_body).toHaveLength(MAX_TEXT_BODY_LENGTH);
    expect(update.text_body_truncated).toBe(true);
    expect(update.replies[0].text_body).toHaveLength(MAX_TEXT_BODY_LENGTH);
    expect(update.replies[0].text_body_truncated).toBe(true);
  });

  it('Returns full bodies with includeFullText', async () => {
    const longText = 'x'.repeat(MAX_TEXT_BODY_LENGTH + 10);
    mocks.setResponse({
      items: [{ id: '123', updates: [{ ...mockItemUpdatesResponse.items[0].updates[0], text_body: longText }] }],
    });
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectIds: ['123'], objectType: 'Item', includeFullText: true } as any);

    const update = (result.content as any).items[0].updates[0];
    expect(update.text_body).toBe(longText);
    expect(update).not.toHaveProperty('text_body_truncated');
  });

  describe('deprecated objectId alias', () => {
    it('Treats objectId alone as a one-item objectIds for an Item query', async () => {
      mocks.setResponse(mockItemUpdatesResponse);
      const tool = new GetUpdatesTool(mocks.mockApiClient);

      const result = await tool.execute({ objectId: '123', objectType: 'Item' } as any);

      const content = result.content as any;
      expect(content.items).toHaveLength(1);
      expect(content.items[0]).toMatchObject({ item_id: '123', url: 'https://monday.com/items/123', count: 2 });
      expect(content.pagination).toEqual({ page: 1, limit: 25 });
      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetItemsUpdates'),
        expect.objectContaining({ itemIds: ['123'], itemsLimit: 1, limit: 25, page: 1 }),
      );
    });

    it('Treats objectId alone as the board ID for a Board query', async () => {
      mocks.setResponse(mockBoardUpdatesResponse);
      const tool = new GetUpdatesTool(mocks.mockApiClient);

      const result = await tool.execute({ objectId: '456', objectType: 'Board' } as any);

      const content = result.content as any;
      expect(content.board_id).toBe('456');
      expect(content.updates).toHaveLength(1);
      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoardUpdates'),
        expect.objectContaining({ boardId: '456', limit: 25, boardUpdatesOnly: true }),
      );
    });

    it('Rejects objectId together with objectIds with an INVALID_TOOL_ARGS validation error', async () => {
      const tool = new GetUpdatesTool(mocks.mockApiClient);

      await expect(
        tool.execute({ objectId: '123', objectIds: ['123'], objectType: 'Item' } as any),
      ).rejects.toMatchObject({
        name: 'ToolValidationError',
        code: 'INVALID_TOOL_ARGS',
        message: 'Pass the IDs in objectIds only; objectId is deprecated',
      });
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('Rejects a call with neither objectId nor objectIds with an INVALID_TOOL_ARGS validation error', async () => {
      const tool = new GetUpdatesTool(mocks.mockApiClient);

      await expect(tool.execute({ objectType: 'Item' } as any)).rejects.toMatchObject({
        name: 'ToolValidationError',
        code: 'INVALID_TOOL_ARGS',
        message: 'objectIds is required: pass the IDs to get updates from',
      });
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('Does not mention objectId in the tool description', () => {
      const tool = new GetUpdatesTool(mocks.mockApiClient);

      expect(tool.getDescription()).toContain('objectIds');
      expect(tool.getDescription()).not.toMatch(/objectId(?!s)/);
    });
  });

  it('Does not flag bodies within the limit', async () => {
    mocks.setResponse(mockItemUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectIds: ['123'], objectType: 'Item' } as any);

    expect((result.content as any).items[0].updates[0]).not.toHaveProperty('text_body_truncated');
  });
});
