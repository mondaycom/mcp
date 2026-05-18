import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import {
  ActivateLiveWorkflowMutation,
  DeactivateLiveWorkflowMutation,
} from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('SetWorkflowActiveStateTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  it('should activate a workflow and report the active state', async () => {
    mocks.setResponseOnce({ activate_live_workflow: { is_success: true } } as ActivateLiveWorkflowMutation);

    const result = await callToolByNameRawAsync('set_workflow_active_state', {
      workflowId: '42',
      action: 'activate',
    });
    const parsed = parseToolResult(result);

    expect(parsed.workflowId).toBe('42');
    expect(parsed.isActive).toBe(true);
    expect(parsed.message).toContain('42');
    expect(parsed.message).toContain('activated');
  });

  it('should deactivate a workflow and report the inactive state', async () => {
    mocks.setResponseOnce({ deactivate_live_workflow: { is_success: true } } as DeactivateLiveWorkflowMutation);

    const result = await callToolByNameRawAsync('set_workflow_active_state', {
      workflowId: '42',
      action: 'deactivate',
    });
    const parsed = parseToolResult(result);

    expect(parsed.workflowId).toBe('42');
    expect(parsed.isActive).toBe(false);
    expect(parsed.message).toContain('42');
    expect(parsed.message).toContain('deactivated');
  });

  it('should use the activation mutation with id and versionOverride dev', async () => {
    mocks.setResponseOnce({ activate_live_workflow: { is_success: true } } as ActivateLiveWorkflowMutation);

    await callToolByNameRawAsync('set_workflow_active_state', {
      workflowId: '42',
      action: 'activate',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('activateLiveWorkflow'),
      { id: '42' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should use the deactivation mutation with id and versionOverride dev', async () => {
    mocks.setResponseOnce({ deactivate_live_workflow: { is_success: true } } as DeactivateLiveWorkflowMutation);

    await callToolByNameRawAsync('set_workflow_active_state', {
      workflowId: '42',
      action: 'deactivate',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('deactivateLiveWorkflow'),
      { id: '42' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should error when the selected mutation does not report success', async () => {
    mocks.setResponseOnce({ deactivate_live_workflow: { is_success: false } } as DeactivateLiveWorkflowMutation);

    const result = await callToolByNameRawAsync('set_workflow_active_state', {
      workflowId: '42',
      action: 'deactivate',
    });

    expect(result.content[0].text).toContain('did not report success');
  });

  it('should propagate GraphQL errors with operation context', async () => {
    mocks.setError('Not authorized');

    const result = await callToolByNameRawAsync('set_workflow_active_state', {
      workflowId: '42',
      action: 'activate',
    });

    expect(result.content[0].text).toContain('Failed to activate workflow');
  });

  it('should reject whitespace-only workflowId', async () => {
    const result = await callToolByNameRawAsync('set_workflow_active_state', {
      workflowId: '   ',
      action: 'activate',
    });

    expect(result.content[0].text).toContain('workflowId must be a non-empty string');
  });
});
