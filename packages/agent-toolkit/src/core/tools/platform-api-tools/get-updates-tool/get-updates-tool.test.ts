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
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectId: '123', objectType: 'Item' } as any);

    const parsedResult = result.content as any;
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
      }),
    );
  });

  it('Successfully gets board updates with default parameters', async () => {
    mocks.setResponse(mockBoardUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectId: '456', objectType: 'Board' } as any);

    const parsedResult = result.content as any;
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
        includeReplies: false,
        includeAssets: false,
        boardUpdatesOnly: true,
      }),
    );
  });

  it('Successfully gets updates with custom pagination', async () => {
    mocks.setResponse(mockItemUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectId: '123', objectType: 'Item', limit: 50, page: 2 } as any);

    const parsedResult = result.content as any;
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
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectId: '123', objectType: 'Item', includeReplies: true } as any);

    const parsedResult = result.content as any;
    expect(parsedResult.updates[0].replies).toBeDefined();
    expect(parsedResult.updates[0].replies).toHaveLength(1);
    expect(parsedResult.updates[0].replies[0].text_body).toBe('This is a reply');

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        itemId: '123',
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
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectId: '123', objectType: 'Item', includeAssets: true } as any);

    const parsedResult = result.content as any;
    expect(parsedResult.updates[0].assets).toBeDefined();
    expect(parsedResult.updates[0].assets).toHaveLength(1);
    expect(parsedResult.updates[0].assets[0].name).toBe('document.pdf');

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        itemId: '123',
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
            },
          ],
        },
      ],
    };

    mocks.setResponse(fullResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({
      objectId: '123',
      objectType: 'Item',
      includeReplies: true,
      includeAssets: true,
    } as any);

    const parsedResult = result.content as any;
    expect(parsedResult.updates[0].replies).toBeDefined();
    expect(parsedResult.updates[0].assets).toBeDefined();
  });

  it('Returns message when no updates exist', async () => {
    const emptyResponse = {
      items: [{ id: '123', updates: [] }],
    };

    mocks.setResponse(emptyResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectId: '123', objectType: 'Item' } as any);

    expect(result.content).toBe('No updates found for item with id 123');
  });

  it('Returns message when item has no updates field', async () => {
    const noUpdatesResponse = {
      items: [{ id: '123' }],
    };

    mocks.setResponse(noUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectId: '123', objectType: 'Item' } as any);

    expect(result.content).toBe('No updates found for item with id 123');
  });


  it('Handles GraphQL response errors', async () => {
    const graphqlError = new Error('GraphQL Error');
    (graphqlError as any).response = {
      errors: [{ message: 'Item not found' }, { message: 'Insufficient permissions' }],
    };
    mocks.setError(graphqlError);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await expect(tool.execute({ objectId: '123', objectType: 'Item' } as any)).rejects.toThrow(
      'Failed to get updates: Item not found, Insufficient permissions',
    );
  });

  it('Handles network errors', async () => {
    const networkError = new Error('Network request failed');
    mocks.setError(networkError);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await expect(tool.execute({ objectId: '123', objectType: 'Item' } as any)).rejects.toThrow('Failed to get updates: Network request failed');
  });

  it('Has correct schema and tool properties', () => {
    const tool = new GetUpdatesTool(mocks.mockApiClient);
    const schema = tool.getInputSchema();

    expect(tool.name).toBe('get_updates');
    expect(tool.type).toBe('read');
    expect(tool.getDescription()).toContain('updates');
    expect(tool.getDescription()).toContain('item');
    expect(tool.getDescription()).toContain('board');

    expect(() => schema.objectId.parse('123')).not.toThrow();
    expect(() => schema.objectType.parse('Item')).not.toThrow();
    expect(() => schema.objectType.parse('Board')).not.toThrow();
    expect(() => schema.limit.parse(50)).not.toThrow();
    expect(() => schema.page.parse(2)).not.toThrow();
    expect(() => schema.includeReplies.parse(true)).not.toThrow();
    expect(() => schema.includeAssets.parse(true)).not.toThrow();
    expect(() => schema.fromDate.parse('2024-01-01')).not.toThrow();
    expect(() => schema.toDate.parse('2024-01-31')).not.toThrow();
    expect(() => schema.includeItemUpdates.parse(true)).not.toThrow();
  });

  it('Rejects limit values outside valid range', async () => {
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await expect(tool.execute({ itemId: 123, limit: 0 } as any)).rejects.toThrow();

    await expect(tool.execute({ itemId: 123, limit: 101 } as any)).rejects.toThrow();
  });

  it('Rejects page values less than 1', async () => {
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await expect(tool.execute({ itemId: 123, page: 0 } as any)).rejects.toThrow();
  });

  it('Successfully gets board updates with date range filtering', async () => {
    mocks.setResponse(mockBoardUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({
      objectId: '456',
      objectType: 'Board',
      fromDate: '2024-01-01',
      toDate: '2024-01-31',
    } as any);

    const parsedResult = result.content as any;
    expect(parsedResult.updates).toHaveLength(1);

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('query GetBoardUpdates'),
      expect.objectContaining({
        boardId: '456',
        limit: 25,
        page: 1,
        fromDate: '2024-01-01T00:00:00Z',
        toDate: '2024-01-31T23:59:59Z',
        boardUpdatesOnly: true,
      }),
    );
  });

  it('Passes full ISO8601 datetime strings through without normalization', async () => {
    mocks.setResponse(mockBoardUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await tool.execute({
      objectId: '456',
      objectType: 'Board',
      fromDate: '2024-01-01T08:00:00Z',
      toDate: '2024-01-31T23:59:59Z',
    } as any);

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('query GetBoardUpdates'),
      expect.objectContaining({
        fromDate: '2024-01-01T08:00:00Z',
        toDate: '2024-01-31T23:59:59Z',
      }),
    );
  });

  it('Throws error when only fromDate is provided without toDate', async () => {
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await expect(
      tool.execute({ objectId: '456', objectType: 'Board', fromDate: '2024-01-01' } as any),
    ).rejects.toThrow('Both fromDate and toDate must be provided together');
  });

  it('Throws error when only toDate is provided without fromDate', async () => {
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await expect(
      tool.execute({ objectId: '456', objectType: 'Board', toDate: '2024-01-31' } as any),
    ).rejects.toThrow('Both fromDate and toDate must be provided together');
  });

  it('Throws error when date range is used with Item objectType', async () => {
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await expect(
      tool.execute({
        objectId: '123',
        objectType: 'Item',
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      } as any),
    ).rejects.toThrow('Date range filtering (fromDate/toDate) is only supported for Board objectType');
  });

  it('Successfully gets board updates with includeItemUpdates set to true', async () => {
    mocks.setResponse(mockBoardUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await tool.execute({
      objectId: '456',
      objectType: 'Board',
      includeItemUpdates: true,
    } as any);

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('query GetBoardUpdates'),
      expect.objectContaining({
        boardId: '456',
        boardUpdatesOnly: false,
      }),
    );
  });

  it('Does not include date variables when dates are not provided for board queries', async () => {
    mocks.setResponse(mockBoardUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await tool.execute({ objectId: '456', objectType: 'Board' } as any);

    const callArgs = mocks.getMockRequest().mock.calls[0][1];
    expect(callArgs).not.toHaveProperty('fromDate');
    expect(callArgs).not.toHaveProperty('toDate');
  });

  it('Includes the whole last day of a date-only range', async () => {
    mocks.setResponse(mockBoardUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await tool.execute({ objectId: '456', objectType: 'Board', fromDate: '2024-01-31', toDate: '2024-01-31' } as any);

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fromDate: '2024-01-31T00:00:00Z', toDate: '2024-01-31T23:59:59Z' }),
    );
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
    expect(content.items[0]).toMatchObject({ item_id: '123', url: 'https://monday.com/items/123', count: 2 });
    expect(content.items[0].updates.map((u: any) => u.id)).toEqual(['update_1', 'update_2']);
    expect(content.items[1]).toMatchObject({ item_id: '789', updates: [], count: 0 });
    expect(content).not.toHaveProperty('not_found');
    expect(content.pagination).toEqual({ page: 1, limit: 5 });
  });

  it('Lists requested items the API did not return', async () => {
    mocks.setResponse({ items: [{ id: '123', url: 'https://monday.com/items/123', updates: [] }] });
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectIds: ['123', '404', '405'], objectType: 'Item' } as any);

    expect((result.content as any).not_found).toEqual(['404', '405']);
  });

  it('Uses a smaller default limit per item with objectIds', async () => {
    mocks.setResponse({ items: [] });
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await tool.execute({ objectIds: ['123', '789'], objectType: 'Item' } as any);

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('query GetItemsUpdates'),
      expect.objectContaining({ limit: DEFAULT_LIMIT_PER_ITEM }),
    );
  });

  it.each([
    ['both', { objectId: '123', objectIds: ['789'] }],
    ['neither', {}],
  ])('Rejects %s objectId and objectIds', async (_label, ids) => {
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await expect(tool.execute({ ...ids, objectType: 'Item' } as any)).rejects.toThrow(
      'Provide exactly one of objectId or objectIds',
    );
  });

  it('Rejects objectIds for Board objectType', async () => {
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    await expect(tool.execute({ objectIds: ['1', '2'], objectType: 'Board' } as any)).rejects.toThrow(
      'objectIds is only supported for Item objectType',
    );
  });

  it('Rejects more objectIds than the per-call maximum', () => {
    const tool = new GetUpdatesTool(mocks.mockApiClient);
    const schema = tool.getInputSchema();

    expect(() => schema.objectIds.parse(Array.from({ length: 26 }, (_, i) => String(i)))).toThrow();
    expect(() => schema.objectIds.parse([])).toThrow();
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

    const result = await tool.execute({ objectId: '123', objectType: 'Item', includeReplies: true } as any);

    const update = (result.content as any).updates[0];
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

    const result = await tool.execute({ objectId: '123', objectType: 'Item', includeFullText: true } as any);

    const update = (result.content as any).updates[0];
    expect(update.text_body).toBe(longText);
    expect(update).not.toHaveProperty('text_body_truncated');
  });

  it('Does not flag bodies within the limit', async () => {
    mocks.setResponse(mockItemUpdatesResponse);
    const tool = new GetUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({ objectId: '123', objectType: 'Item' } as any);

    expect((result.content as any).updates[0]).not.toHaveProperty('text_body_truncated');
  });
});
