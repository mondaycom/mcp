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
    const tool = new CreateUpdateTool(mocks.mockApiClient, 'fake_token');

    const result = await tool.execute({
      itemId: 456,
      body: 'This is a test update',
    });

    expect(result.content).toBe('Update 123456789 successfully created on item 456');
    expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('mutation createUpdate'), {
      itemId: '456',
      body: 'This is a test update',
      mentionsList: undefined,
    });
  });

  it('Successfully creates an update with mentions', async () => {
    mocks.setResponse(successfulResponse);
    const tool = new CreateUpdateTool(mocks.mockApiClient, 'fake_token');

    const result = await tool.execute({
      itemId: 789,
      body: 'Hey, check this out!',
      mentionsList: '[{"id": "12345", "type": "User"}, {"id": "456", "type": "Team"}]',
    });

    expect(result.content).toBe('Update 123456789 successfully created on item 789');
    expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('mutation createUpdate'), {
      itemId: '789',
      body: 'Hey, check this out!',
      mentionsList: [
        { id: '12345', type: 'User' },
        { id: '456', type: 'Team' },
      ],
    });
  });

  it('Throws error when API returns no update ID', async () => {
    mocks.setResponse({ create_update: null });
    const tool = new CreateUpdateTool(mocks.mockApiClient, 'fake_token');

    await expect(
      tool.execute({
        itemId: 456,
        body: 'Test update',
      }),
    ).rejects.toThrow('Failed to create update: no update created');
  });

  it('Throws error for invalid mentionsList JSON', async () => {
    const tool = new CreateUpdateTool(mocks.mockApiClient, 'fake_token');

    await expect(
      tool.execute({
        itemId: 456,
        body: 'Test update',
        mentionsList: 'invalid json',
      }),
    ).rejects.toThrow(/Invalid mentionsList JSON format/);
  });

  it('Throws error for invalid mentionsList structure - missing type', async () => {
    const tool = new CreateUpdateTool(mocks.mockApiClient, 'fake_token');

    await expect(
      tool.execute({
        itemId: 456,
        body: 'Test update',
        mentionsList: '[{"id": "123"}]',
      }),
    ).rejects.toThrow(/Invalid mentionsList format/);
  });

  it('Throws error for invalid mentionsList structure - missing id', async () => {
    const tool = new CreateUpdateTool(mocks.mockApiClient, 'fake_token');

    await expect(
      tool.execute({
        itemId: 456,
        body: 'Test update',
        mentionsList: '[{"type": "User"}]',
      }),
    ).rejects.toThrow(/Invalid mentionsList format/);
  });

  it('Throws error for invalid mentionsList structure - invalid type', async () => {
    const tool = new CreateUpdateTool(mocks.mockApiClient, 'fake_token');

    await expect(
      tool.execute({
        itemId: 456,
        body: 'Test update',
        mentionsList: '[{"id": "123", "type": "InvalidType"}]',
      }),
    ).rejects.toThrow(/Invalid mentionsList format/);
  });

  it('Throws error for invalid mentionsList structure - non-string id', async () => {
    const tool = new CreateUpdateTool(mocks.mockApiClient, 'fake_token');

    await expect(
      tool.execute({
        itemId: 456,
        body: 'Test update',
        mentionsList: '[{"id": 123, "type": "User"}]',
      }),
    ).rejects.toThrow(/Invalid mentionsList format/);
  });

  it('Throws error for non-array mentionsList', async () => {
    const tool = new CreateUpdateTool(mocks.mockApiClient, 'fake_token');

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
    const tool = new CreateUpdateTool(mocks.mockApiClient, 'fake_token');

    const result = await tool.execute({
      itemId: 789,
      body: 'Test with all types',
      mentionsList:
        '[{"id": "1", "type": "User"}, {"id": "2", "type": "Team"}, {"id": "3", "type": "Board"}, {"id": "4", "type": "Project"}]',
    });

    expect(result.content).toBe('Update 123456789 successfully created on item 789');
    expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('mutation createUpdate'), {
      itemId: '789',
      body: 'Test with all types',
      mentionsList: [
        { id: '1', type: 'User' },
        { id: '2', type: 'Team' },
        { id: '3', type: 'Board' },
        { id: '4', type: 'Project' },
      ],
    });
  });

  it('Handles GraphQL response errors', async () => {
    const graphqlError = new Error('GraphQL Error');
    (graphqlError as any).response = {
      errors: [{ message: 'Invalid item ID' }, { message: 'Insufficient permissions' }],
    };
    mocks.setError(graphqlError);
    const tool = new CreateUpdateTool(mocks.mockApiClient, 'fake_token');

    await expect(
      tool.execute({
        itemId: 456,
        body: 'Test update',
      }),
    ).rejects.toThrow('Failed to create update: Invalid item ID, Insufficient permissions');
  });

  it('Has correct schema and tool properties', () => {
    const tool = new CreateUpdateTool(mocks.mockApiClient, 'fake_token');
    const schema = tool.getInputSchema();

    expect(tool.name).toBe('create_update');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('update');

    expect(() => schema.itemId.parse(123)).not.toThrow();
    expect(() => schema.body.parse('test')).not.toThrow();
    expect(() => schema.mentionsList.parse(undefined)).not.toThrow();
  });
});
