import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import { CreateAgentSkillMutation } from 'src/monday-graphql/generated/graphql.dev/graphql';

const mockSkill = { id: 'skill-123', name: 'Send Slack Message', description: 'Posts to Slack' };

describe('CreateAgentSkillTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  it('should create a skill and return it', async () => {
    mocks.setResponseOnce({ create_agent_skill: mockSkill } as CreateAgentSkillMutation);

    const result = await callToolByNameRawAsync('create_agent_skill', {
      name: 'Send Slack Message',
      content: '## Instructions\nPost a message.',
    });
    const parsed = parseToolResult(result);

    expect(parsed.skill.id).toBe('skill-123');
  });

  it('should pass name, content, and description to the mutation', async () => {
    mocks.setResponseOnce({ create_agent_skill: mockSkill } as CreateAgentSkillMutation);

    await callToolByNameRawAsync('create_agent_skill', {
      name: 'Send Slack Message',
      content: '## Instructions\nPost a message.',
      description: 'Posts to Slack',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('createAgentSkill'),
      { name: 'Send Slack Message', content: '## Instructions\nPost a message.', description: 'Posts to Slack' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should pass versionOverride dev', async () => {
    mocks.setResponseOnce({ create_agent_skill: mockSkill } as CreateAgentSkillMutation);

    await callToolByNameRawAsync('create_agent_skill', {
      name: 'Send Slack Message',
      content: '## Instructions',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should throw when create_agent_skill returns null', async () => {
    mocks.setResponseOnce({ create_agent_skill: null } as CreateAgentSkillMutation);

    const result = await callToolByNameRawAsync('create_agent_skill', {
      name: 'Send Slack Message',
      content: '## Instructions',
    });

    expect(result.content[0].text).toContain('create_agent_skill returned no data');
  });

  it('should propagate API errors with context', async () => {
    mocks.setError('API error');

    const result = await callToolByNameRawAsync('create_agent_skill', {
      name: 'Send Slack Message',
      content: '## Instructions',
    });

    expect(result.content[0].text).toContain('Failed to create monday platform agent skill');
  });
});
