import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import { CreateAgentSkillMutation } from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('CreateAgentSkillTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockSkill = {
    id: 'skill-123',
    name: 'Send Slack Message',
    description: 'Sends a message to a Slack channel',
  };

  it('should create a skill and return the created skill', async () => {
    mocks.setResponseOnce({ create_agent_skill: mockSkill } as CreateAgentSkillMutation);

    const result = await callToolByNameRawAsync('create_agent_skill', {
      name: 'Send Slack Message',
      content: '## Instructions\nSend a message.',
      description: 'Sends a message to a Slack channel',
    });
    const parsed = parseToolResult(result);

    expect(parsed.skill.id).toBe('skill-123');
    expect(parsed.skill.name).toBe('Send Slack Message');
  });

  it('should pass name, content, and description to the mutation', async () => {
    mocks.setResponseOnce({ create_agent_skill: mockSkill } as CreateAgentSkillMutation);

    await callToolByNameRawAsync('create_agent_skill', {
      name: 'Send Slack Message',
      content: '## Instructions\nSend a message.',
      description: 'Sends a message to a Slack channel',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('createAgentSkill'),
      { name: 'Send Slack Message', content: '## Instructions\nSend a message.', description: 'Sends a message to a Slack channel' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should create a skill without description when omitted', async () => {
    mocks.setResponseOnce({ create_agent_skill: mockSkill } as CreateAgentSkillMutation);

    await callToolByNameRawAsync('create_agent_skill', {
      name: 'Send Slack Message',
      content: '## Instructions\nSend a message.',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ description: undefined }),
      expect.anything(),
    );
  });

  it('should throw when create_agent_skill returns null', async () => {
    mocks.setResponseOnce({ create_agent_skill: null } as CreateAgentSkillMutation);

    const result = await callToolByNameRawAsync('create_agent_skill', {
      name: 'Send Slack Message',
      content: '## Instructions\nSend a message.',
    });

    expect(result.content[0].text).toContain('create_agent_skill returned no data');
  });

  it('should propagate API errors with operation context', async () => {
    mocks.setError('Forbidden');

    const result = await callToolByNameRawAsync('create_agent_skill', {
      name: 'Send Slack Message',
      content: '## Instructions\nSend a message.',
    });

    expect(result.content[0].text).toContain('Failed to create monday platform agent skill');
  });
});
