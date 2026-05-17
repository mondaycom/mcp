import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import {
  CreateAgentSkillMutation,
  GetAgentSkillsCatalogQuery,
  GetAgentTriggersCatalogQuery,
} from 'src/monday-graphql/generated/graphql.dev/graphql';

const mockTrigger = {
  block_reference_id: 'status-change-ref',
  name: 'Status Change',
  description: 'Fires when a status column changes',
  field_schemas: [{ field_key: 'board_id', value_schema: 'The ID of the board to watch' }],
  required_fields: [{ field_key: 'board_id', depends_on: [], optional: false }],
};

const mockSkill = { id: 'skill-1', name: 'Board Manager', description: 'Manages boards and items' };

describe('AgentCatalogTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  // ─── list_triggers ─────────────────────────────────────────────────────────

  describe('action: list_triggers', () => {
    it('should return the triggers catalog', async () => {
      mocks.setResponseOnce({ agent_triggers_catalog: [mockTrigger] } as GetAgentTriggersCatalogQuery);

      const result = await callToolByNameRawAsync('agent_catalog', { action: 'list_triggers' });
      const parsed = parseToolResult(result);

      expect(parsed.count).toBe(1);
      expect(parsed.triggers[0].block_reference_id).toBe('status-change-ref');
    });

    it('should pass versionOverride dev when listing triggers', async () => {
      mocks.setResponseOnce({ agent_triggers_catalog: [] } as GetAgentTriggersCatalogQuery);

      await callToolByNameRawAsync('agent_catalog', { action: 'list_triggers' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('getAgentTriggersCatalog'),
        expect.objectContaining({ block_reference_ids: undefined }),
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should pass block_reference_ids when provided', async () => {
      mocks.setResponseOnce({ agent_triggers_catalog: [mockTrigger] } as GetAgentTriggersCatalogQuery);

      await callToolByNameRawAsync('agent_catalog', { action: 'list_triggers', block_reference_ids: ['status-change-ref'] });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ block_reference_ids: ['status-change-ref'] }),
        expect.anything(),
      );
    });

    it('should return count 0 when no triggers exist', async () => {
      mocks.setResponseOnce({ agent_triggers_catalog: [] } as GetAgentTriggersCatalogQuery);

      const result = await callToolByNameRawAsync('agent_catalog', { action: 'list_triggers' });
      const parsed = parseToolResult(result);

      expect(parsed.count).toBe(0);
      expect(parsed.triggers).toEqual([]);
    });

    it('should propagate API errors for list_triggers', async () => {
      mocks.setError('Unauthorized');

      const result = await callToolByNameRawAsync('agent_catalog', { action: 'list_triggers' });

      expect(result.content[0].text).toContain('Failed to fetch monday platform agent triggers catalog');
    });
  });

  // ─── list_skills ───────────────────────────────────────────────────────────

  describe('action: list_skills', () => {
    it('should return the skills catalog', async () => {
      mocks.setResponseOnce({ agent_skills_catalog: [mockSkill] } as GetAgentSkillsCatalogQuery);

      const result = await callToolByNameRawAsync('agent_catalog', { action: 'list_skills' });
      const parsed = parseToolResult(result);

      expect(parsed.count).toBe(1);
      expect(parsed.skills[0].id).toBe('skill-1');
    });

    it('should pass versionOverride dev when listing skills', async () => {
      mocks.setResponseOnce({ agent_skills_catalog: [] } as GetAgentSkillsCatalogQuery);

      await callToolByNameRawAsync('agent_catalog', { action: 'list_skills' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('getAgentSkillsCatalog'),
        expect.anything(),
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should return count 0 when no skills exist', async () => {
      mocks.setResponseOnce({ agent_skills_catalog: [] } as GetAgentSkillsCatalogQuery);

      const result = await callToolByNameRawAsync('agent_catalog', { action: 'list_skills' });
      const parsed = parseToolResult(result);

      expect(parsed.count).toBe(0);
      expect(parsed.skills).toEqual([]);
    });

    it('should propagate API errors for list_skills', async () => {
      mocks.setError('Unauthorized');

      const result = await callToolByNameRawAsync('agent_catalog', { action: 'list_skills' });

      expect(result.content[0].text).toContain('Failed to fetch monday platform agent skills catalog');
    });
  });

  // ─── create_skill ──────────────────────────────────────────────────────────

  describe('action: create_skill', () => {
    const mockCreatedSkill = { id: 'skill-123', name: 'Send Slack Message', description: 'Posts to Slack' };

    it('should create a skill and return it', async () => {
      mocks.setResponseOnce({ create_agent_skill: mockCreatedSkill } as CreateAgentSkillMutation);

      const result = await callToolByNameRawAsync('agent_catalog', {
        action: 'create_skill',
        name: 'Send Slack Message',
        content: '## Instructions\nPost a message.',
      });
      const parsed = parseToolResult(result);

      expect(parsed.skill.id).toBe('skill-123');
    });

    it('should pass name, content, and description to the mutation', async () => {
      mocks.setResponseOnce({ create_agent_skill: mockCreatedSkill } as CreateAgentSkillMutation);

      await callToolByNameRawAsync('agent_catalog', {
        action: 'create_skill',
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

    it('should reject create_skill without name', async () => {
      const result = await callToolByNameRawAsync('agent_catalog', {
        action: 'create_skill',
        content: '## Instructions\nPost a message.',
      });

      expect(result.content[0].text).toContain('"name" and "content"');
    });

    it('should reject create_skill without content', async () => {
      const result = await callToolByNameRawAsync('agent_catalog', {
        action: 'create_skill',
        name: 'Send Slack Message',
      });

      expect(result.content[0].text).toContain('"name" and "content"');
    });

    it('should throw when create_agent_skill returns null', async () => {
      mocks.setResponseOnce({ create_agent_skill: null } as CreateAgentSkillMutation);

      const result = await callToolByNameRawAsync('agent_catalog', {
        action: 'create_skill',
        name: 'Send Slack Message',
        content: '## Instructions',
      });

      expect(result.content[0].text).toContain('create_agent_skill returned no data');
    });

    it('should propagate API errors for create_skill', async () => {
      mocks.setError('API error');

      const result = await callToolByNameRawAsync('agent_catalog', {
        action: 'create_skill',
        name: 'Send Slack Message',
        content: '## Instructions',
      });

      expect(result.content[0].text).toContain('Failed to create monday platform agent skill');
    });
  });
});
