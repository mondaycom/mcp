import { createMockApiClient } from '../test-utils/mock-api-client';
import { CreateUpdateTool } from './create-update-tool';

describe('Create Update Tool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  const successfulResponse = {
    create_update: { id: '123456789' },
  };

  it('Successfully creates an update without mentions', async () => {
    mocks.setResponse(successfulResponse);
    const tool = new CreateUpdateTool(mocks.mockApiClient);

    const result = await tool.execute({
      itemId: 456,
      body: 'This is a test update',
    });

    expect(result.content).toEqual({ message: 'Update 123456789 created on item 456', update_id: '123456789', item_id: 456, item_name: undefined, item_url: undefined });
    expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('mutation createUpdate'), {
      itemId: '456',
      body: 'This is a test update',
      mentionsList: undefined,
      parentId: undefined,
    });
  });

  it('Successfully creates an update with mentions', async () => {
    mocks.setResponse(successfulResponse);
    const tool = new CreateUpdateTool(mocks.mockApiClient);

    const result = await tool.execute({
      itemId: 789,
      body: 'Hey, check this out!',
      mentionsList: '[{"id": "12345", "type": "User"}, {"id": "456", "type": "Team"}]',
    });

    expect(result.content).toEqual({ message: 'Update 123456789 created on item 789', update_id: '123456789', item_id: 789, item_name: undefined, item_url: undefined });
    expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('mutation createUpdate'), {
      itemId: '789',
      body: 'Hey, check this out!',
      mentionsList: [
        { id: '12345', type: 'User' },
        { id: '456', type: 'Team' },
      ],
      parentId: undefined,
    });
  });

  it('Successfully creates a reply to an existing update using parentId', async () => {
    mocks.setResponse(successfulResponse);
    const tool = new CreateUpdateTool(mocks.mockApiClient);

    const result = await tool.execute({
      itemId: 456,
      body: 'This is a reply',
      parentId: 111222,
    });

    expect(result.content).toEqual({ message: 'Update 123456789 created on item 456', update_id: '123456789', item_id: 456, item_name: undefined, item_url: undefined });
    expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('mutation createUpdate'), {
      itemId: '456',
      body: 'This is a reply',
      mentionsList: undefined,
      parentId: '111222',
    });
  });

  describe('reply to a reply', () => {
    const replyToReplyError = () =>
      Object.assign(new Error('GraphQL Error'), {
        response: {
          errors: [{ message: 'Cannot create a reply on another reply', extensions: { code: 'REPLY_TO_REPLY_NOT_ALLOWED' } }],
        },
      });

    it('posts the reply on the parent update of the given reply', async () => {
      const mockRequest = mocks.getMockRequest();
      mockRequest
        .mockRejectedValueOnce(replyToReplyError())
        .mockResolvedValueOnce({ items: [{ updates: [{ id: '1', replies: [] }, { id: '2', replies: [{ id: '555' }] }] }] })
        .mockResolvedValueOnce(successfulResponse);
      const tool = new CreateUpdateTool(mocks.mockApiClient);

      const result = await tool.execute({ itemId: 456, body: 'Reply', parentId: 555 });

      expect((result.content as any).update_id).toBe('123456789');
      expect(mockRequest).toHaveBeenCalledTimes(3);
      expect(mockRequest).toHaveBeenNthCalledWith(2, expect.stringContaining('query getItemUpdateReplyIds'), { itemId: '456' });
      expect(mockRequest).toHaveBeenLastCalledWith(expect.stringContaining('mutation createUpdate'), expect.objectContaining({ parentId: '2' }));
    });

    it('rethrows the original error when the reply is not found on the item', async () => {
      mocks
        .getMockRequest()
        .mockRejectedValueOnce(replyToReplyError())
        .mockResolvedValueOnce({ items: [{ updates: [{ id: '1', replies: [{ id: '9' }] }] }] });
      const tool = new CreateUpdateTool(mocks.mockApiClient);

      await expect(tool.execute({ itemId: 456, body: 'Reply', parentId: 555 })).rejects.toThrow(
        /Cannot create a reply on another reply/,
      );
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);
    });

    it('does not look up a parent for other errors', async () => {
      mocks.setError(Object.assign(new Error('GraphQL Error'), { response: { errors: [{ message: 'Item not found' }] } }));
      const tool = new CreateUpdateTool(mocks.mockApiClient);

      await expect(tool.execute({ itemId: 456, body: 'Reply', parentId: 555 })).rejects.toThrow(/Item not found/);
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
    });
  });

  it('Throws error when API returns no update ID', async () => {
    mocks.setResponse({ create_update: null });
    const tool = new CreateUpdateTool(mocks.mockApiClient);

    await expect(
      tool.execute({
        itemId: 456,
        body: 'Test update',
      }),
    ).rejects.toThrow('Failed to create update: no update created');
  });

  it('Throws error for invalid mentionsList JSON', async () => {
    const tool = new CreateUpdateTool(mocks.mockApiClient);

    await expect(
      tool.execute({
        itemId: 456,
        body: 'Test update',
        mentionsList: 'invalid json',
      }),
    ).rejects.toThrow(/Invalid mentionsList JSON format/);
  });

  it('Throws error for invalid mentionsList structure - missing type', async () => {
    const tool = new CreateUpdateTool(mocks.mockApiClient);

    await expect(
      tool.execute({
        itemId: 456,
        body: 'Test update',
        mentionsList: '[{"id": "123"}]',
      }),
    ).rejects.toThrow(/Invalid mentionsList format/);
  });

  it('Throws error for invalid mentionsList structure - missing id', async () => {
    const tool = new CreateUpdateTool(mocks.mockApiClient);

    await expect(
      tool.execute({
        itemId: 456,
        body: 'Test update',
        mentionsList: '[{"type": "User"}]',
      }),
    ).rejects.toThrow(/Invalid mentionsList format/);
  });

  it('Throws error for invalid mentionsList structure - invalid type', async () => {
    const tool = new CreateUpdateTool(mocks.mockApiClient);

    await expect(
      tool.execute({
        itemId: 456,
        body: 'Test update',
        mentionsList: '[{"id": "123", "type": "InvalidType"}]',
      }),
    ).rejects.toThrow(/Invalid mentionsList format/);
  });

  it('Throws error for invalid mentionsList structure - non-string id', async () => {
    const tool = new CreateUpdateTool(mocks.mockApiClient);

    await expect(
      tool.execute({
        itemId: 456,
        body: 'Test update',
        mentionsList: '[{"id": 123, "type": "User"}]',
      }),
    ).rejects.toThrow(/Invalid mentionsList format/);
  });

  it('Throws error for non-array mentionsList', async () => {
    const tool = new CreateUpdateTool(mocks.mockApiClient);

    await expect(
      tool.execute({
        itemId: 456,
        body: 'Test update',
        mentionsList: '{"id": "123", "type": "User"}',
      }),
    ).rejects.toThrow(/Invalid mentionsList format/);
  });

  it('Successfully validates all valid mention types', async () => {
    mocks.setResponse(successfulResponse);
    const tool = new CreateUpdateTool(mocks.mockApiClient);

    const result = await tool.execute({
      itemId: 789,
      body: 'Test with all types',
      mentionsList:
        '[{"id": "1", "type": "User"}, {"id": "2", "type": "Team"}, {"id": "3", "type": "Board"}, {"id": "4", "type": "Project"}]',
    });

    expect(result.content).toEqual({ message: 'Update 123456789 created on item 789', update_id: '123456789', item_id: 789, item_name: undefined, item_url: undefined });
    expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('mutation createUpdate'), {
      itemId: '789',
      body: 'Test with all types',
      mentionsList: [
        { id: '1', type: 'User' },
        { id: '2', type: 'Team' },
        { id: '3', type: 'Board' },
        { id: '4', type: 'Project' },
      ],
      parentId: undefined,
    });
  });

  it('Handles GraphQL response errors', async () => {
    const graphqlError = new Error('GraphQL Error');
    (graphqlError as any).response = {
      errors: [{ message: 'Invalid item ID' }, { message: 'Insufficient permissions' }],
    };
    mocks.setError(graphqlError);
    const tool = new CreateUpdateTool(mocks.mockApiClient);

    await expect(
      tool.execute({
        itemId: 456,
        body: 'Test update',
      }),
    ).rejects.toThrow('Failed to create update: Invalid item ID, Insufficient permissions');
  });

  it('Has correct schema and tool properties', () => {
    const tool = new CreateUpdateTool(mocks.mockApiClient);
    const schema = tool.getInputSchema();

    expect(tool.name).toBe('create_update');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('update');

    expect(() => schema.itemId.parse(123)).not.toThrow();
    expect(() => schema.body.parse('test')).not.toThrow();
    expect(() => schema.mentionsList.parse(undefined)).not.toThrow();
    expect(() => schema.parentId.parse(undefined)).not.toThrow();
    expect(() => schema.parentId.parse(999)).not.toThrow();
  });
});
