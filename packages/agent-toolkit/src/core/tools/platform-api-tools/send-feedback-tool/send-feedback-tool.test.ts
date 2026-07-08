import { createMockApiClient } from '../test-utils/mock-api-client';
import { SendFeedbackTool } from './send-feedback-tool';
import { trackEvent } from '../../../../utils/tracking.utils';

jest.mock('../../../../utils/tracking.utils', () => ({
  trackEvent: jest.fn(),
}));

const mockTrackEvent = trackEvent as jest.MockedFunction<typeof trackEvent>;

describe('SendFeedbackTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('fires a mcp_feedback_submitted BigBrain event with all fields', async () => {
    const tool = new SendFeedbackTool(mocks.mockApiClient, 'test-token', {
      agentType: 'monday_agent',
      agentClientName: 'my-client',
    });

    const result = await tool.execute({
      feedback_type: 'bug_report',
      title: 'create_item fails on large boards',
      description: 'When the board has more than 500 items, create_item returns a timeout error.',
      tool_name: 'create_item',
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: 'mcp_feedback_submitted',
      data: expect.objectContaining({
        feedback_type: 'bug_report',
        title: 'create_item fails on large boards',
        description: 'When the board has more than 500 items, create_item returns a timeout error.',
        tool_name: 'create_item',
        agent_type: 'monday_agent',
        agent_client_name: 'my-client',
      }),
    });

    expect(result.content).toEqual(
      expect.objectContaining({ message: expect.stringContaining('submitted successfully') }),
    );
  });

  it('omits optional fields when not provided', async () => {
    const tool = new SendFeedbackTool(mocks.mockApiClient);

    await tool.execute({
      feedback_type: 'feedback',
      title: 'Great tool!',
      description: 'Really helpful for automation.',
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    const eventData = mockTrackEvent.mock.calls[0][0].data;
    expect(eventData).not.toHaveProperty('tool_name');
    expect(eventData).not.toHaveProperty('agent_type');
    expect(eventData).not.toHaveProperty('agent_client_name');
  });

  it('extracts account and user id from a valid JWT token', async () => {
    // JWT with payload: { actid: 12345, uid: 67890, aai: 111, tid: 222, rgn: 'use1', per: 'me:rw' }
    const payload = { actid: 12345, uid: 67890, aai: 111, tid: 222, rgn: 'use1', per: 'me:rw' };
    const base64urlPayload = Buffer.from(JSON.stringify(payload))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    const token = `eyJhbGciOiJIUzI1NiJ9.${base64urlPayload}.signature`;

    const tool = new SendFeedbackTool(mocks.mockApiClient, token);

    await tool.execute({
      feedback_type: 'feature_request',
      title: 'Support batch operations',
      description: 'Allow updating multiple items at once.',
    });

    const eventData = mockTrackEvent.mock.calls[0][0].data;
    expect(eventData).toMatchObject({ actid: 12345, uid: 67890, aai: 111, rgn: 'use1' });
  });
});
