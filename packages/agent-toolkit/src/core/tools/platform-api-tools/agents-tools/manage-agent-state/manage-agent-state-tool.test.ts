import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import {
  ActivateAgentMutation,
  DeactivateAgentMutation,
  RunAgentMutation,
  InactiveReason,
} from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('ManageAgentStateTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  // Happy path tests
  it('should activate an agent successfully', async () => {
    mocks.setResponseOnce({ activate_agent: { success: true } } as ActivateAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_state', {
      action: 'activate',
      agent_id: '7',
    });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  it('should deactivate an agent successfully', async () => {
    mocks.setResponseOnce({ deactivate_agent: { success: true } } as DeactivateAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_state', {
      action: 'deactivate',
      agent_id: '7',
    });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  it('should enqueue an agent run and return trigger_uuid', async () => {
    mocks.setResponseOnce({ run_agent: { trigger_uuid: 'uuid-123' } } as RunAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_state', {
      action: 'run',
      agent_id: '7',
    });
    const parsed = parseToolResult(result);

    expect(parsed.trigger_uuid).toBe('uuid-123');
  });

  // versionOverride dev
  it('should pass versionOverride:dev for activate', async () => {
    mocks.setResponseOnce({ activate_agent: { success: true } } as ActivateAgentMutation);

    await callToolByNameRawAsync('manage_agent_state', {
      action: 'activate',
      agent_id: '7',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('activateAgent'),
      { id: '7' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  // Default inactive_reason
  it('should default inactive_reason to DeactivatedByUser when not provided', async () => {
    mocks.setResponseOnce({ deactivate_agent: { success: true } } as DeactivateAgentMutation);

    await callToolByNameRawAsync('manage_agent_state', {
      action: 'deactivate',
      agent_id: '7',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('deactivateAgent'),
      expect.objectContaining({ inactive_reason: InactiveReason.DeactivatedByUser }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  // Explicit inactive_reason
  it('should accept explicit inactive_reason ACCOUNT_LEVEL_BLOCKING', async () => {
    mocks.setResponseOnce({ deactivate_agent: { success: true } } as DeactivateAgentMutation);

    await callToolByNameRawAsync('manage_agent_state', {
      action: 'deactivate',
      agent_id: '7',
      inactive_reason: 'ACCOUNT_LEVEL_BLOCKING',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('deactivateAgent'),
      expect.objectContaining({ inactive_reason: 'ACCOUNT_LEVEL_BLOCKING' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  // Error propagation
  it('should propagate errors with context for activate', async () => {
    mocks.setError('API error');

    const result = await callToolByNameRawAsync('manage_agent_state', {
      action: 'activate',
      agent_id: '7',
    });

    expect(result.content[0].text).toContain('Failed to activate');
  });

  it('should propagate errors with context for deactivate', async () => {
    mocks.setError('API error');

    const result = await callToolByNameRawAsync('manage_agent_state', {
      action: 'deactivate',
      agent_id: '7',
    });

    expect(result.content[0].text).toContain('Failed to deactivate');
  });

  it('should propagate errors with context for run', async () => {
    mocks.setError('API error');

    const result = await callToolByNameRawAsync('manage_agent_state', {
      action: 'run',
      agent_id: '7',
    });

    expect(result.content[0].text).toContain('Failed to run');
  });

  // success:false fallback
  it('should return success:false when activate_agent is null', async () => {
    mocks.setResponseOnce({ activate_agent: null } as ActivateAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_state', {
      action: 'activate',
      agent_id: '7',
    });

    expect(parseToolResult(result).success).toBe(false);
  });

  it('should return success:false when deactivate_agent is null', async () => {
    mocks.setResponseOnce({ deactivate_agent: null } as DeactivateAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_state', {
      action: 'deactivate',
      agent_id: '7',
    });

    expect(parseToolResult(result).success).toBe(false);
  });

  it('should handle null run_agent response', async () => {
    mocks.setResponseOnce({ run_agent: null } as RunAgentMutation);
    const result = await callToolByNameRawAsync('manage_agent_state', {
      action: 'run',
      agent_id: '7',
    });
    expect(result.content[0].text).toContain('run_agent returned no data');
  });
});
