import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import {
  AddSkillToAgentMutation,
  AddTriggerToAgentMutation,
  GetAgentActiveTriggersQuery,
  RemoveSkillFromAgentMutation,
  RemoveTriggerFromAgentMutation,
} from 'src/monday-graphql/generated/graphql.dev/graphql';

const mockActiveTrigger = {
  node_id: 'node-abc',
  block_reference_id: 'status-change-ref',
  name: 'Status Change',
  description: 'Fires when a status column changes',
  field_summary: 'board_id=42',
};

describe('ManageAgentCapabilitiesTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  // ─── list_triggers ─────────────────────────────────────────────────────────

  describe('action: list_triggers', () => {
    it('should list active triggers for an agent', async () => {
      mocks.setResponseOnce({ agent_active_triggers: [mockActiveTrigger] } as GetAgentActiveTriggersQuery);

      const result = await callToolByNameRawAsync('manage_agent_capabilities', { action: 'list_triggers', agent_id: '7' });
      const parsed = parseToolResult(result);

      expect(parsed.count).toBe(1);
      expect(parsed.triggers[0].node_id).toBe('node-abc');
    });

    it('should pass agent_id and versionOverride dev when listing triggers', async () => {
      mocks.setResponseOnce({ agent_active_triggers: [] } as GetAgentActiveTriggersQuery);

      await callToolByNameRawAsync('manage_agent_capabilities', { action: 'list_triggers', agent_id: '7' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('getAgentActiveTriggers'),
        { agent_id: '7' },
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should return empty list with count 0 when no triggers exist', async () => {
      mocks.setResponseOnce({ agent_active_triggers: [] } as GetAgentActiveTriggersQuery);

      const result = await callToolByNameRawAsync('manage_agent_capabilities', { action: 'list_triggers', agent_id: '7' });
      const parsed = parseToolResult(result);

      expect(parsed.count).toBe(0);
      expect(parsed.triggers).toEqual([]);
    });

    it('should propagate API errors for list_triggers', async () => {
      mocks.setError('Not found');

      const result = await callToolByNameRawAsync('manage_agent_capabilities', { action: 'list_triggers', agent_id: '7' });

      expect(result.content[0].text).toContain('Failed to list active triggers');
    });
  });

  // ─── add_trigger ───────────────────────────────────────────────────────────

  describe('action: add_trigger', () => {
    it('should add a trigger to an agent', async () => {
      mocks.setResponseOnce({ add_trigger_to_agent: { success: true } } as AddTriggerToAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent_capabilities', {
        action: 'add_trigger',
        agent_id: '7',
        block_reference_id: 'status-change-ref',
        field_values: { board_id: '42' },
      });
      const parsed = parseToolResult(result);

      expect(parsed.success).toBe(true);
    });

    it('should pass block_reference_id, field_values, and versionOverride dev', async () => {
      mocks.setResponseOnce({ add_trigger_to_agent: { success: true } } as AddTriggerToAgentMutation);

      await callToolByNameRawAsync('manage_agent_capabilities', {
        action: 'add_trigger',
        agent_id: '7',
        block_reference_id: 'status-change-ref',
        field_values: { board_id: '42' },
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('addTriggerToAgent'),
        { agent_id: '7', block_reference_id: 'status-change-ref', field_values: { board_id: '42' } },
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should add a trigger without field_values when omitted', async () => {
      mocks.setResponseOnce({ add_trigger_to_agent: { success: true } } as AddTriggerToAgentMutation);

      await callToolByNameRawAsync('manage_agent_capabilities', {
        action: 'add_trigger',
        agent_id: '7',
        block_reference_id: 'status-change-ref',
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ field_values: undefined }),
        expect.anything(),
      );
    });

    it('should reject add_trigger without block_reference_id', async () => {
      const result = await callToolByNameRawAsync('manage_agent_capabilities', { action: 'add_trigger', agent_id: '7' });

      expect(result.content[0].text).toContain('block_reference_id is required');
    });

    it('should return success:false when add_trigger_to_agent is null', async () => {
      mocks.setResponseOnce({ add_trigger_to_agent: null } as AddTriggerToAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent_capabilities', {
        action: 'add_trigger',
        agent_id: '7',
        block_reference_id: 'status-change-ref',
      });

      expect(parseToolResult(result).success).toBe(false);
    });

    it('should propagate API errors for add_trigger', async () => {
      mocks.setError('API error');

      const result = await callToolByNameRawAsync('manage_agent_capabilities', {
        action: 'add_trigger',
        agent_id: '7',
        block_reference_id: 'status-change-ref',
      });

      expect(result.content[0].text).toContain('Failed to add trigger to monday platform agent');
    });
  });

  // ─── remove_trigger ────────────────────────────────────────────────────────

  describe('action: remove_trigger', () => {
    it('should remove a trigger from an agent', async () => {
      mocks.setResponseOnce({ remove_trigger_from_agent: { success: true } } as RemoveTriggerFromAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent_capabilities', {
        action: 'remove_trigger',
        agent_id: '7',
        node_id: 'node-abc',
      });
      const parsed = parseToolResult(result);

      expect(parsed.success).toBe(true);
    });

    it('should pass node_id and versionOverride dev when removing trigger', async () => {
      mocks.setResponseOnce({ remove_trigger_from_agent: { success: true } } as RemoveTriggerFromAgentMutation);

      await callToolByNameRawAsync('manage_agent_capabilities', { action: 'remove_trigger', agent_id: '7', node_id: 'node-abc' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('removeTriggerFromAgent'),
        { agent_id: '7', node_id: 'node-abc' },
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should reject remove_trigger without node_id', async () => {
      const result = await callToolByNameRawAsync('manage_agent_capabilities', { action: 'remove_trigger', agent_id: '7' });

      expect(result.content[0].text).toContain('node_id is required');
    });

    it('should return success:false when remove_trigger_from_agent is null', async () => {
      mocks.setResponseOnce({ remove_trigger_from_agent: null } as RemoveTriggerFromAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent_capabilities', {
        action: 'remove_trigger',
        agent_id: '7',
        node_id: 'node-abc',
      });

      expect(parseToolResult(result).success).toBe(false);
    });

    it('should propagate API errors for remove_trigger', async () => {
      mocks.setError('API error');

      const result = await callToolByNameRawAsync('manage_agent_capabilities', {
        action: 'remove_trigger',
        agent_id: '7',
        node_id: 'node-abc',
      });

      expect(result.content[0].text).toContain('Failed to remove trigger from monday platform agent');
    });
  });

  // ─── add_skill ─────────────────────────────────────────────────────────────

  describe('action: add_skill', () => {
    it('should add a skill to an agent', async () => {
      mocks.setResponseOnce({ add_skill_to_agent: { success: true } } as AddSkillToAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent_capabilities', {
        action: 'add_skill',
        agent_id: '7',
        skill_id: 'skill-abc-123',
      });
      const parsed = parseToolResult(result);

      expect(parsed.success).toBe(true);
      expect(parsed.message).toContain('added');
    });

    it('should pass agent_id and skill_id when adding skill', async () => {
      mocks.setResponseOnce({ add_skill_to_agent: { success: true } } as AddSkillToAgentMutation);

      await callToolByNameRawAsync('manage_agent_capabilities', { action: 'add_skill', agent_id: '7', skill_id: 'skill-abc-123' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('addSkillToAgent'),
        { agent_id: '7', skill_id: 'skill-abc-123' },
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should reject add_skill without skill_id', async () => {
      const result = await callToolByNameRawAsync('manage_agent_capabilities', { action: 'add_skill', agent_id: '7' });

      expect(result.content[0].text).toContain('skill_id is required');
    });

    it('should return success:false when add_skill_to_agent is null', async () => {
      mocks.setResponseOnce({ add_skill_to_agent: null } as AddSkillToAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent_capabilities', {
        action: 'add_skill',
        agent_id: '7',
        skill_id: 'skill-abc-123',
      });

      expect(parseToolResult(result).success).toBe(false);
    });

    it('should propagate API errors for add_skill', async () => {
      mocks.setError('API error');

      const result = await callToolByNameRawAsync('manage_agent_capabilities', {
        action: 'add_skill',
        agent_id: '7',
        skill_id: 'skill-abc-123',
      });

      expect(result.content[0].text).toContain('Failed to add skill to monday platform agent');
    });
  });

  // ─── remove_skill ──────────────────────────────────────────────────────────

  describe('action: remove_skill', () => {
    it('should remove a skill from an agent', async () => {
      mocks.setResponseOnce({ remove_skill_from_agent: { success: true } } as RemoveSkillFromAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent_capabilities', {
        action: 'remove_skill',
        agent_id: '7',
        skill_id: 'skill-abc-123',
      });
      const parsed = parseToolResult(result);

      expect(parsed.success).toBe(true);
      expect(parsed.message).toContain('removed');
    });

    it('should reject remove_skill without skill_id', async () => {
      const result = await callToolByNameRawAsync('manage_agent_capabilities', { action: 'remove_skill', agent_id: '7' });

      expect(result.content[0].text).toContain('skill_id is required');
    });

    it('should return success:false when remove_skill_from_agent is null', async () => {
      mocks.setResponseOnce({ remove_skill_from_agent: null } as RemoveSkillFromAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent_capabilities', {
        action: 'remove_skill',
        agent_id: '7',
        skill_id: 'skill-abc-123',
      });

      expect(parseToolResult(result).success).toBe(false);
    });

    it('should propagate API errors for remove_skill', async () => {
      mocks.setError('API error');

      const result = await callToolByNameRawAsync('manage_agent_capabilities', {
        action: 'remove_skill',
        agent_id: '7',
        skill_id: 'skill-abc-123',
      });

      expect(result.content[0].text).toContain('Failed to remove skill from monday platform agent');
    });
  });
});
