import { z } from 'zod';
import { createMockApiClient } from './test-utils/mock-api-client';
import { SendMcpSupportTool, sendMcpSupportToolSchema } from './send-mcp-support-tool';
import { trackEvent } from '../../../utils/tracking.utils';
import { extractTokenInfo } from '../../../utils/token.utils';

jest.mock('../../../utils/tracking.utils');
jest.mock('../../../utils/token.utils');

const mockedTrackEvent = trackEvent as jest.MockedFunction<typeof trackEvent>;
const mockedExtractTokenInfo = extractTokenInfo as jest.MockedFunction<typeof extractTokenInfo>;

describe('Send MCP Support Tool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
    mockedExtractTokenInfo.mockReturnValue({
      tid: 123,
      aai: 456,
      uid: 789,
      actid: 101112,
      rgn: 'us-east',
      per: 'admin',
    });
  });

  it('Sends feedback with complete tracking data', async () => {
    const tool = new SendMcpSupportTool(mocks.mockApiClient, 'fake_token');

    const result = await tool.execute({
      type: 'bug_report',
      message: 'This is a test bug report with sufficient details.',
    });

    expect(result.content).toContain('Thank you for your bug report!');
    expect(result.content).toContain('sent to the monday MCP team');

    const feedbackCall = mockedTrackEvent.mock.calls.find(
      call => call[0].name === 'monday_mcp_support_feedback'
    );
    expect(feedbackCall).toBeDefined();
    expect(feedbackCall![0].data).toMatchObject({
      feedbackType: 'bug_report',
      message: 'This is a test bug report with sufficient details.',
      tid: 123,
      aai: 456,
      uid: 789,
    });
  });

  it('Handles optional title field', async () => {
    const tool = new SendMcpSupportTool(mocks.mockApiClient, 'fake_token');

    const withTitle = await tool.execute({
      type: 'feedback',
      message: 'Message with title',
      title: 'Test Title',
    });
    expect(withTitle.content).toContain('Thank you');
    
    let feedbackCall = mockedTrackEvent.mock.calls.find(
      call => call[0].name === 'monday_mcp_support_feedback'
    );
    expect(feedbackCall![0].data.title).toBe('Test Title');

    jest.clearAllMocks();

    const withoutTitle = await tool.execute({
      type: 'feedback',
      message: 'Message without title',
    });
    expect(withoutTitle.content).toContain('Thank you');
    
    feedbackCall = mockedTrackEvent.mock.calls.find(
      call => call[0].name === 'monday_mcp_support_feedback'
    );
    expect(feedbackCall![0].data).not.toHaveProperty('title');
  });

  it('Captures token and context information', async () => {
    const tool = new SendMcpSupportTool(mocks.mockApiClient, 'fake_token', {
      boardId: 12345,
      agentType: 'test-agent',
      agentClientName: 'TestClient',
    });

    await tool.execute({
      type: 'feedback',
      message: 'Test message with context',
    });

    const feedbackCall = mockedTrackEvent.mock.calls.find(
      call => call[0].name === 'monday_mcp_support_feedback'
    );
    expect(feedbackCall![0].data).toMatchObject({
      boardId: 12345,
      agentType: 'test-agent',
      agentClientName: 'TestClient',
      tid: 123,
      uid: 789,
    });
  });

  it('Works without token or context', async () => {
    mockedExtractTokenInfo.mockReturnValue({});
    const tool = new SendMcpSupportTool(mocks.mockApiClient);

    await tool.execute({
      type: 'feedback',
      message: 'Test message without extras',
    });

    const feedbackCall = mockedTrackEvent.mock.calls.find(
      call => call[0].name === 'monday_mcp_support_feedback'
    );
    expect(feedbackCall![0].data).toMatchObject({
      feedbackType: 'feedback',
      message: 'Test message without extras',
    });
    expect(feedbackCall![0].data).not.toHaveProperty('boardId');
  });

  it('Validates message length and type requirements', () => {
    const schema = z.object(sendMcpSupportToolSchema);

    // Too short
    expect(schema.safeParse({ type: 'feedback', message: 'Short' }).success).toBe(false);
    
    // Too long
    expect(schema.safeParse({ type: 'feedback', message: 'a'.repeat(2001) }).success).toBe(false);
    
    // Invalid type
    expect(schema.safeParse({ type: 'invalid', message: 'Valid message' }).success).toBe(false);
    
    // Valid
    expect(schema.safeParse({ type: 'feedback', message: '1234567890' }).success).toBe(true);
  });

  it('Validates title length requirement', () => {
    const schema = z.object(sendMcpSupportToolSchema);

    // Too long title
    const longTitle = 'a'.repeat(101);
    expect(schema.safeParse({ 
      type: 'bug_report', 
      message: 'Valid message', 
      title: longTitle 
    }).success).toBe(false);
    
    // Valid title
    expect(schema.safeParse({ 
      type: 'bug_report', 
      message: 'Valid message', 
      title: 'Valid Title' 
    }).success).toBe(true);
  });
});

