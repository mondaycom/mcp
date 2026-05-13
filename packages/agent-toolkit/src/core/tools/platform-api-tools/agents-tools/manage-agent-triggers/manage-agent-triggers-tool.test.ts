import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import {
  GetAgentActiveTriggersQuery,
  AddTriggerToAgentMutation,
  RemoveTriggerFromAgentMutation,
} from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('ManageAgentTriggersTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockActiveTrigger = {
    node_id: 'node-abc',
    block_reference_id: 'status-change-ref',
    name: 'Status Change',
    description: 'Fires when a status column changes',
    field_summary: 'board_id=42',
  };

  it('should list active triggers for an agent', async () => {
    mocks.setResponseOnce({ agent_active_triggers: [mockActiveTrigger] } as GetAgentActiveTriggersQuery);

    const result = await callToolByNameRawAsync('manage_agent_triggers', { action: 'list', agent_id: '7' });
    const parsed = parseToolResult(result);

    expect(parsed.count).toBe(1);
    expect(parsed.triggers[0].node_id).toBe('node-abc');
  });

  it('should pass agent_id and versionOverride dev when listing', async () => {
    mocks.setResponseOnce({ agent_active_triggers: [] } as GetAgentActiveTriggersQuery);

    await callToolByNameRawAsync('manage_agent_triggers', { action: 'list', agent_id: '7' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('getAgentActiveTriggers'),
      { agent_id: '7' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should add a trigger to an agent', async () => {
    mocks.setResponseOnce({ add_trigger_to_agent: { success: true } } as AddTriggerToAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_triggers', {
      action: 'add',
      agent_id: '7',
      block_reference_id: 'status-change-ref',
      field_values: { board_id: '42' },
    });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  it('should pass block_reference_id and field_values when adding trigger', async () => {
    mocks.setResponseOnce({ add_trigger_to_agent: { success: true } } as AddTriggerToAgentMutation);

    await callToolByNameRawAsync('manage_agent_triggers', {
      action: 'add',
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

    await callToolByNameRawAsync('manage_agent_triggers', {
      action: 'add',
      agent_id: '7',
      block_reference_id: 'status-change-ref',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ field_values: undefined }),
      expect.anything(),
    );
  });

  it('should remove a trigger from an agent', async () => {
    mocks.setResponseOnce({ remove_trigger_from_agent: { success: true } } as RemoveTriggerFromAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_triggers', {
      action: 'remove',
      agent_id: '7',
      node_id: 'node-abc',
    });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  it('should pass node_id and versionOverride dev when removing', async () => {
    mocks.setResponseOnce({ remove_trigger_from_agent: { success: true } } as RemoveTriggerFromAgentMutation);

    await callToolByNameRawAsync('manage_agent_triggers', { action: 'remove', agent_id: '7', node_id: 'node-abc' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('removeTriggerFromAgent'),
      { agent_id: '7', node_id: 'node-abc' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should reject add action without block_reference_id', async () => {
    const result = await callToolByNameRawAsync('manage_agent_triggers', { action: 'add', agent_id: '7' });

    expect(result.content[0].text).toContain('block_reference_id is required');
  });

  it('should reject remove action without node_id', async () => {
    const result = await callToolByNameRawAsync('manage_agent_triggers', { action: 'remove', agent_id: '7' });

    expect(result.content[0].text).toContain('node_id is required');
  });

  it('should propagate errors with operation context', async () => {
    mocks.setError('Not found');

    const result = await callToolByNameRawAsync('manage_agent_triggers', { action: 'list', agent_id: '999' });

    expect(result.content[0].text).toContain('Failed to list active triggers');
  });
});
