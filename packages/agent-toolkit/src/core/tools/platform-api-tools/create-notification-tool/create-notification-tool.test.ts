import { NotificationTargetType } from '../../../../monday-graphql/generated/graphql/graphql';
import { createMockApiClient } from '../test-utils/mock-api-client';
import { CreateNotificationTool } from './create-notification-tool';

describe('Create Notification Tool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  const input = {
    user_id: '111',
    target_id: '222',
    text: 'Please review this item',
    target_type: NotificationTargetType.Project,
  };

  it('Successfully sends a notification', async () => {
    mocks.setResponse({ create_notification: { id: '987', text: 'Please review this item' } });
    const tool = new CreateNotificationTool(mocks.mockApiClient);

    const result = await tool.execute(input);

    expect(result.content).toEqual({
      message: 'Notification 987 sent to user 111',
      notification_id: '987',
      user_id: '111',
      target_id: '222',
      target_type: 'Project',
      text: 'Please review this item',
    });
    expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('mutation createNotification'), {
      user_id: '111',
      target_id: '222',
      text: 'Please review this item',
      target_type: 'Project',
    });
  });

  it('Throws a descriptive error when the API returns no notification', async () => {
    mocks.setResponse({ create_notification: null });
    const tool = new CreateNotificationTool(mocks.mockApiClient);

    await expect(tool.execute(input)).rejects.toThrow(
      /No notification was created for user 111 on Project target 222/,
    );
  });

  it('Surfaces GraphQL response errors with their details', async () => {
    const graphqlError = new Error('GraphQL Error');
    (graphqlError as any).response = {
      errors: [
        { message: 'User not found', extensions: { code: 'InvalidUserIdException' } },
        { message: 'Insufficient permissions' },
      ],
    };
    mocks.setError(graphqlError);
    const tool = new CreateNotificationTool(mocks.mockApiClient);

    await expect(tool.execute(input)).rejects.toThrow(
      'Failed to send notification to user 111: User not found (details: {"code":"InvalidUserIdException"}), Insufficient permissions',
    );
  });

  it('Wraps non-GraphQL errors with the operation context', async () => {
    mocks.setError(new Error('Network down'));
    const tool = new CreateNotificationTool(mocks.mockApiClient);

    await expect(tool.execute(input)).rejects.toThrow('Failed to send notification to user 111: Network down');
  });

  it('Has correct schema and tool properties', () => {
    const tool = new CreateNotificationTool(mocks.mockApiClient);
    const schema = tool.getInputSchema();

    expect(tool.name).toBe('create_notification');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('notification');

    expect(() => schema.user_id.parse('111')).not.toThrow();
    expect(() => schema.target_id.parse('222')).not.toThrow();
    expect(() => schema.text.parse('hello')).not.toThrow();
    expect(() => schema.target_type.parse('Post')).not.toThrow();
    expect(() => schema.target_type.parse('NotAType')).toThrow();
  });
});
