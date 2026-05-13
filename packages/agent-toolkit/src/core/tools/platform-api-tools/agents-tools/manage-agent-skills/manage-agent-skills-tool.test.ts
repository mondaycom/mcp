import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import {
  AddSkillToAgentMutation,
  RemoveSkillFromAgentMutation,
} from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('ManageAgentSkillsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  it('should add a skill to an agent', async () => {
    mocks.setResponseOnce({ add_skill_to_agent: { success: true } } as AddSkillToAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'add',
      agent_id: '7',
      skill_id: 'skill-abc-123',
    });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  it('should remove a skill from an agent', async () => {
    mocks.setResponseOnce({ remove_skill_from_agent: { success: true } } as RemoveSkillFromAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'remove',
      agent_id: '7',
      skill_id: 'skill-abc-123',
    });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  it('should pass correct variables and versionOverride when adding skill', async () => {
    mocks.setResponseOnce({ add_skill_to_agent: { success: true } } as AddSkillToAgentMutation);

    await callToolByNameRawAsync('manage_agent_skills', {
      action: 'add',
      agent_id: '7',
      skill_id: 'skill-abc-123',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('addSkillToAgent'),
      { agent_id: '7', skill_id: 'skill-abc-123' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should pass correct variables and versionOverride when removing skill', async () => {
    mocks.setResponseOnce({ remove_skill_from_agent: { success: true } } as RemoveSkillFromAgentMutation);

    await callToolByNameRawAsync('manage_agent_skills', {
      action: 'remove',
      agent_id: '7',
      skill_id: 'skill-abc-123',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('removeSkillFromAgent'),
      { agent_id: '7', skill_id: 'skill-abc-123' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
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

  it('should propagate errors with operation context for remove', async () => {
    mocks.setError('API error');

    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'remove',
      agent_id: '7',
      skill_id: 'skill-abc-123',
    });

    expect(result.content[0].text).toContain('Failed to remove skill');
  });
});
