import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import {
  CreateAgentSkillMutation,
  AddSkillToAgentMutation,
  RemoveSkillFromAgentMutation,
} from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('ManageAgentSkillsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockCreatedSkill = { id: 'skill-123', name: 'Send Slack Message', description: 'Posts to Slack' };

  // create
  it('should create a skill and return it', async () => {
    mocks.setResponseOnce({ create_agent_skill: mockCreatedSkill } as CreateAgentSkillMutation);

    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'create',
      name: 'Send Slack Message',
      content: '## Instructions\nPost a message.',
    });
    const parsed = parseToolResult(result);

    expect(parsed.skill.id).toBe('skill-123');
  });

  it('should pass name, content, and description when creating', async () => {
    mocks.setResponseOnce({ create_agent_skill: mockCreatedSkill } as CreateAgentSkillMutation);

    await callToolByNameRawAsync('manage_agent_skills', {
      action: 'create',
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

  it('should reject create without name', async () => {
    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'create',
      content: '## Instructions',
    });
    expect(result.content[0].text).toContain('name and content are required');
  });

  it('should throw when create_agent_skill returns null', async () => {
    mocks.setResponseOnce({ create_agent_skill: null } as CreateAgentSkillMutation);

    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'create',
      name: 'Send Slack Message',
      content: '## Instructions',
    });

    expect(result.content[0].text).toContain('create_agent_skill returned no data');
  });

  it('should propagate errors with operation context for create', async () => {
    mocks.setError('API error');

    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'create',
      name: 'Send Slack Message',
      content: '## Instructions',
    });

    expect(result.content[0].text).toContain('Failed to create monday platform agent skill');
  });

  // add
  it('should add a skill to an agent', async () => {
    mocks.setResponseOnce({ add_skill_to_agent: { success: true } } as AddSkillToAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'add',
      agent_id: '7',
      skill_id: 'skill-abc-123',
    });

    expect(parseToolResult(result).success).toBe(true);
  });

  it('should pass correct variables and versionOverride when adding skill', async () => {
    mocks.setResponseOnce({ add_skill_to_agent: { success: true } } as AddSkillToAgentMutation);

    await callToolByNameRawAsync('manage_agent_skills', { action: 'add', agent_id: '7', skill_id: 'skill-abc-123' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('addSkillToAgent'),
      { agent_id: '7', skill_id: 'skill-abc-123' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should reject add without agent_id', async () => {
    const result = await callToolByNameRawAsync('manage_agent_skills', { action: 'add', skill_id: 'skill-abc-123' });
    expect(result.content[0].text).toContain('agent_id and skill_id are required');
  });

  it('should propagate errors with operation context for add', async () => {
    mocks.setError('API error');

    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'add',
      agent_id: '7',
      skill_id: 'skill-abc-123',
    });

    expect(result.content[0].text).toContain('Failed to add skill');
  });

  it('should return success:false when add_skill_to_agent is null', async () => {
    mocks.setResponseOnce({ add_skill_to_agent: null } as AddSkillToAgentMutation);
    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'add',
      agent_id: '7',
      skill_id: 'skill-abc-123',
    });
    expect(parseToolResult(result).success).toBe(false);
  });

  // remove
  it('should remove a skill from an agent', async () => {
    mocks.setResponseOnce({ remove_skill_from_agent: { success: true } } as RemoveSkillFromAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'remove',
      agent_id: '7',
      skill_id: 'skill-abc-123',
    });

    expect(parseToolResult(result).success).toBe(true);
  });

  it('should pass correct variables and versionOverride when removing skill', async () => {
    mocks.setResponseOnce({ remove_skill_from_agent: { success: true } } as RemoveSkillFromAgentMutation);

    await callToolByNameRawAsync('manage_agent_skills', { action: 'remove', agent_id: '7', skill_id: 'skill-abc-123' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('removeSkillFromAgent'),
      { agent_id: '7', skill_id: 'skill-abc-123' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should propagate errors with operation context for remove', async () => {
    mocks.setError('API error');

    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'remove',
      agent_id: '7',
      skill_id: 'skill-abc-123',
    });

    expect(result.content[0].text).toContain('Failed to remove skill');
  });

  it('should return success:false when remove_skill_from_agent is null', async () => {
    mocks.setResponseOnce({ remove_skill_from_agent: null } as RemoveSkillFromAgentMutation);
    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'remove',
      agent_id: '7',
      skill_id: 'skill-abc-123',
    });
    expect(parseToolResult(result).success).toBe(false);
  });
});
