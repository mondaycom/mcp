import { createMockApiClient } from '../test-utils/mock-api-client';
import { SendFeedbackTool } from './send-feedback-tool';

describe('SendFeedbackTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
  });

  it('sets session context metadata with all fields', async () => {
    const tool = new SendFeedbackTool(mocks.mockApiClient);
    const sessionContext = { metadata: {} as Record<string, unknown> };

    const result = await tool.execute(
      {
        kind: 'bug',
        title: 'create_item fails on large boards',
        description: 'When the board has more than 500 items, create_item returns a timeout error.',
        tool_name: 'create_item',
      },
      sessionContext,
    );

    expect(sessionContext.metadata).toMatchObject({
      kind: 'bug',
      title: 'create_item fails on large boards',
      description: 'When the board has more than 500 items, create_item returns a timeout error.',
      tool_name: 'create_item',
    });

    expect(result.content).toEqual(
      expect.objectContaining({ message: expect.stringContaining('submitted successfully') }),
    );
  });

  it('omits tool_name from metadata when not provided', async () => {
    const tool = new SendFeedbackTool(mocks.mockApiClient);
    const sessionContext = { metadata: {} as Record<string, unknown> };

    await tool.execute(
      {
        kind: 'feedback',
        title: 'Great tool!',
        description: 'Really helpful for automation.',
      },
      sessionContext,
    );

    expect(sessionContext.metadata).not.toHaveProperty('tool_name');
    expect(sessionContext.metadata).toMatchObject({
      kind: 'feedback',
      title: 'Great tool!',
      description: 'Really helpful for automation.',
    });
  });
});
