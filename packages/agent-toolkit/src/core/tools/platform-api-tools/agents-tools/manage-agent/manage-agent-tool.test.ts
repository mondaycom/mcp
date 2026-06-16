import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import {
  ActivateAgentMutation,
  CreateAgentMutation,
  CreateBlankAgentMutation,
  DeactivateAgentMutation,
  DeleteAgentMutation,
  GetCustomAgentsQuery,
  RunAgentMutation,
  UpdateAgentMutation,
} from 'src/monday-graphql/generated/graphql.dev/graphql';

const mockAgent = {
  id: '7',
  kind: 'PERSONAL',
  state: 'INACTIVE',
  profile: { name: 'Standup Bot', role: 'PM', role_description: 'Runs standups', avatar_url: null, background_color: null },
  goal: 'Keep team aligned',
  plan: '# Plan\n1. collect status',
  user_prompt: null,
  version_id: 'v1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('ManageAgentTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  // ─── create (AI mode) ──────────────────────────────────────────────────────

  describe('action: create', () => {
    it('should create an agent via AI mode and return it', async () => {
      mocks.setResponseOnce({ create_agent: mockAgent } as CreateAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent', { action: 'create', prompt: 'Run my daily standup' });
      const parsed = parseToolResult(result);

      expect(parsed.agent.id).toBe('7');
      expect(parsed.message).toContain('INACTIVE');
    });

    it('should pass prompt and versionOverride dev for AI mode', async () => {
      mocks.setResponseOnce({ create_agent: mockAgent } as CreateAgentMutation);

      await callToolByNameRawAsync('manage_agent', { action: 'create', prompt: 'Run my daily standup' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('createAgent'),
        expect.objectContaining({ input: expect.objectContaining({ prompt: 'Run my daily standup' }) }),
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should reject create without prompt', async () => {
      const result = await callToolByNameRawAsync('manage_agent', { action: 'create' });

      expect(result.content[0].text).toContain('"prompt"');
    });

    it('should throw when AI create returns no id', async () => {
      mocks.setResponseOnce({ create_agent: null } as CreateAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent', { action: 'create', prompt: 'Make an agent' });

      expect(result.content[0].text).toContain('creation returned no id');
    });

    it('should propagate API errors for AI create', async () => {
      mocks.setError('Unauthorized');

      const result = await callToolByNameRawAsync('manage_agent', { action: 'create', prompt: 'Make an agent' });

      expect(result.content[0].text).toContain('Failed to create monday platform agent');
    });
  });

  // ─── create_blank (manual mode) ────────────────────────────────────────────

  describe('action: create_blank', () => {
    it('should create an agent via manual mode and return it', async () => {
      mocks.setResponseOnce({ create_blank_agent: mockAgent } as CreateBlankAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent', { action: 'create_blank', name: 'Standup Bot', role: 'PM' });
      const parsed = parseToolResult(result);

      expect(parsed.agent.id).toBe('7');
    });

    it('should pass name and role for manual mode', async () => {
      mocks.setResponseOnce({ create_blank_agent: mockAgent } as CreateBlankAgentMutation);

      await callToolByNameRawAsync('manage_agent', { action: 'create_blank', name: 'Standup Bot', role: 'PM' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('createBlankAgent'),
        expect.objectContaining({ input: expect.objectContaining({ name: 'Standup Bot', role: 'PM' }) }),
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should throw when manual create returns no id', async () => {
      mocks.setResponseOnce({ create_blank_agent: null } as CreateBlankAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent', { action: 'create_blank', name: 'Bot' });

      expect(result.content[0].text).toContain('creation returned no id');
    });

    it('should propagate API errors for manual create', async () => {
      mocks.setError('Unauthorized');

      const result = await callToolByNameRawAsync('manage_agent', { action: 'create_blank', name: 'Bot' });

      expect(result.content[0].text).toContain('Failed to create blank monday platform agent');
    });
  });

  // ─── get ───────────────────────────────────────────────────────────────────

  describe('action: get', () => {
    it('should fetch a single agent when agent_id is provided', async () => {
      mocks.setResponseOnce({ custom_agents: [mockAgent] } as GetCustomAgentsQuery);

      const result = await callToolByNameRawAsync('manage_agent', { action: 'get', agent_id: '7' });
      const parsed = parseToolResult(result);

      expect(parsed.agent).toEqual(mockAgent);
    });

    it('should pass ids and versionOverride dev when fetching by agent_id', async () => {
      mocks.setResponseOnce({ custom_agents: [mockAgent] } as GetCustomAgentsQuery);

      await callToolByNameRawAsync('manage_agent', { action: 'get', agent_id: '7' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('getCustomAgents'),
        { ids: ['7'] },
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should return not-found message when agent does not exist', async () => {
      mocks.setResponseOnce({ custom_agents: [] } as GetCustomAgentsQuery);

      const result = await callToolByNameRawAsync('manage_agent', { action: 'get', agent_id: '999' });

      expect(result.content[0].text).toContain('not found');
    });

    it('should list agents when agent_id is omitted', async () => {
      mocks.setResponseOnce({ custom_agents: [mockAgent] } as GetCustomAgentsQuery);

      const result = await callToolByNameRawAsync('manage_agent', { action: 'get' });
      const parsed = parseToolResult(result);

      expect(parsed.count).toBe(1);
      expect(parsed.agents[0].id).toBe('7');
    });

    it('should pass limit 100 when listing agents', async () => {
      mocks.setResponseOnce({ custom_agents: [] } as GetCustomAgentsQuery);

      await callToolByNameRawAsync('manage_agent', { action: 'get' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('getCustomAgents'),
        { limit: 100 },
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should propagate API errors with context for get', async () => {
      mocks.setError('Unauthorized');

      const result = await callToolByNameRawAsync('manage_agent', { action: 'get', agent_id: '7' });

      expect(result.content[0].text).toContain('Failed to get monday platform agent');
    });

    it('should propagate API errors with context for list', async () => {
      mocks.setError('Unauthorized');

      const result = await callToolByNameRawAsync('manage_agent', { action: 'get' });

      expect(result.content[0].text).toContain('Failed to list monday platform agents');
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('action: update', () => {
    it('should update an agent and return it', async () => {
      mocks.setResponseOnce({ update_agent: { ...mockAgent, profile: { ...mockAgent.profile, name: 'New Name' } } } as UpdateAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent', { action: 'update', agent_id: '7', name: 'New Name' });
      const parsed = parseToolResult(result);

      expect(parsed.agent.id).toBe('7');
    });

    it('should only include provided fields in the input object', async () => {
      mocks.setResponseOnce({ update_agent: mockAgent } as UpdateAgentMutation);

      await callToolByNameRawAsync('manage_agent', { action: 'update', agent_id: '7', name: 'X' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ input: { name: 'X' } }),
        expect.anything(),
      );
    });

    it('should reject update without agent_id', async () => {
      const result = await callToolByNameRawAsync('manage_agent', { action: 'update', name: 'X' });

      expect(result.content[0].text).toContain('requires "agent_id"');
    });

    it('should reject update with no fields', async () => {
      const result = await callToolByNameRawAsync('manage_agent', { action: 'update', agent_id: '7' });

      expect(result.content[0].text).toContain('at least one of');
    });

    it('should throw when update_agent returns null', async () => {
      mocks.setResponseOnce({ update_agent: null } as UpdateAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent', { action: 'update', agent_id: '7', name: 'X' });

      expect(result.content[0].text).toContain('update_agent returned no data');
    });

    it('should propagate API errors for update', async () => {
      mocks.setError('API error');

      const result = await callToolByNameRawAsync('manage_agent', { action: 'update', agent_id: '7', name: 'X' });

      expect(result.content[0].text).toContain('Failed to update monday platform agent');
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  describe('action: delete', () => {
    const mockDeletedAgent = { ...mockAgent, state: 'DELETED' };

    it('should delete an agent and return it', async () => {
      mocks.setResponseOnce({ delete_agent: mockDeletedAgent } as DeleteAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent', { action: 'delete', agent_id: '7' });
      const parsed = parseToolResult(result);

      expect(parsed.agent.id).toBe('7');
      expect(parsed.message).toContain('deleted');
    });

    it('should pass versionOverride dev for delete', async () => {
      mocks.setResponseOnce({ delete_agent: mockDeletedAgent } as DeleteAgentMutation);

      await callToolByNameRawAsync('manage_agent', { action: 'delete', agent_id: '7' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('deleteAgent'),
        { id: '7' },
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should reject delete without agent_id', async () => {
      const result = await callToolByNameRawAsync('manage_agent', { action: 'delete' });

      expect(result.content[0].text).toContain('requires "agent_id"');
    });

    it('should throw when delete_agent returns no id', async () => {
      mocks.setResponseOnce({ delete_agent: null } as DeleteAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent', { action: 'delete', agent_id: '7' });

      expect(result.content[0].text).toContain('returned no id');
    });

    it('should propagate API errors for delete', async () => {
      mocks.setError('Not authorized');

      const result = await callToolByNameRawAsync('manage_agent', { action: 'delete', agent_id: '7' });

      expect(result.content[0].text).toContain('Failed to delete monday platform agent');
    });
  });

  // ─── activate ──────────────────────────────────────────────────────────────

  describe('action: activate', () => {
    it('should activate an agent', async () => {
      mocks.setResponseOnce({ activate_agent: { success: true } } as ActivateAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent', { action: 'activate', agent_id: '7' });
      const parsed = parseToolResult(result);

      expect(parsed.success).toBe(true);
      expect(parsed.message).toContain('activated');
    });

    it('should pass versionOverride dev for activate', async () => {
      mocks.setResponseOnce({ activate_agent: { success: true } } as ActivateAgentMutation);

      await callToolByNameRawAsync('manage_agent', { action: 'activate', agent_id: '7' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('activateAgent'),
        { id: '7' },
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should reject activate without agent_id', async () => {
      const result = await callToolByNameRawAsync('manage_agent', { action: 'activate' });

      expect(result.content[0].text).toContain('requires "agent_id"');
    });

    it('should return success:false when activate_agent is null', async () => {
      mocks.setResponseOnce({ activate_agent: null } as ActivateAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent', { action: 'activate', agent_id: '7' });

      expect(parseToolResult(result).success).toBe(false);
    });

    it('should propagate API errors for activate', async () => {
      mocks.setError('API error');

      const result = await callToolByNameRawAsync('manage_agent', { action: 'activate', agent_id: '7' });

      expect(result.content[0].text).toContain('Failed to activate monday platform agent');
    });
  });

  // ─── deactivate ────────────────────────────────────────────────────────────

  describe('action: deactivate', () => {
    it('should deactivate an agent', async () => {
      mocks.setResponseOnce({ deactivate_agent: { success: true } } as DeactivateAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent', { action: 'deactivate', agent_id: '7' });
      const parsed = parseToolResult(result);

      expect(parsed.success).toBe(true);
      expect(parsed.message).toContain('deactivated');
    });

    it('should always pass DEACTIVATED_BY_USER as inactive_reason', async () => {
      mocks.setResponseOnce({ deactivate_agent: { success: true } } as DeactivateAgentMutation);

      await callToolByNameRawAsync('manage_agent', { action: 'deactivate', agent_id: '7' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ inactive_reason: 'DEACTIVATED_BY_USER' }),
        expect.anything(),
      );
    });

    it('should reject deactivate without agent_id', async () => {
      const result = await callToolByNameRawAsync('manage_agent', { action: 'deactivate' });

      expect(result.content[0].text).toContain('requires "agent_id"');
    });

    it('should return success:false when deactivate_agent is null', async () => {
      mocks.setResponseOnce({ deactivate_agent: null } as DeactivateAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent', { action: 'deactivate', agent_id: '7' });

      expect(parseToolResult(result).success).toBe(false);
    });

    it('should propagate API errors for deactivate', async () => {
      mocks.setError('API error');

      const result = await callToolByNameRawAsync('manage_agent', { action: 'deactivate', agent_id: '7' });

      expect(result.content[0].text).toContain('Failed to deactivate monday platform agent');
    });
  });

  // ─── run ───────────────────────────────────────────────────────────────────

  describe('action: run', () => {
    it('should enqueue an agent run and return trigger_uuid', async () => {
      mocks.setResponseOnce({ run_agent: { trigger_uuid: 'uuid-123' } } as RunAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent', { action: 'run', agent_id: '7' });
      const parsed = parseToolResult(result);

      expect(parsed.trigger_uuid).toBe('uuid-123');
      expect(parsed.message).toContain('enqueued');
    });

    it('should pass versionOverride dev for run', async () => {
      mocks.setResponseOnce({ run_agent: { trigger_uuid: 'uuid-123' } } as RunAgentMutation);

      await callToolByNameRawAsync('manage_agent', { action: 'run', agent_id: '7' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('runAgent'),
        { id: '7' },
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should reject run without agent_id', async () => {
      const result = await callToolByNameRawAsync('manage_agent', { action: 'run' });

      expect(result.content[0].text).toContain('requires "agent_id"');
    });

    it('should throw when run_agent returns null', async () => {
      mocks.setResponseOnce({ run_agent: null } as RunAgentMutation);

      const result = await callToolByNameRawAsync('manage_agent', { action: 'run', agent_id: '7' });

      expect(result.content[0].text).toContain('run_agent returned no data');
    });

    it('should propagate API errors for run', async () => {
      mocks.setError('API error');

      const result = await callToolByNameRawAsync('manage_agent', { action: 'run', agent_id: '7' });

      expect(result.content[0].text).toContain('Failed to run monday platform agent');
    });
  });
});
