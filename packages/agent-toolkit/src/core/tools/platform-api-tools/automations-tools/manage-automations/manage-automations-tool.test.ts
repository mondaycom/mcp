import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import {
  ActivateLiveWorkflowMutation,
  DeactivateLiveWorkflowMutation,
  DeleteLiveWorkflowMutation,
} from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('ManageAutomationsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  describe('action=activate', () => {
    it('should activate a workflow and report the active state', async () => {
      mocks.setResponseOnce({ activate_live_workflow: { is_success: true } } as ActivateLiveWorkflowMutation);

      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'activate',
        workflowId: '42',
      });
      const parsed = parseToolResult(result);

      expect(parsed.workflowId).toBe('42');
      expect(parsed.isActive).toBe(true);
      expect(parsed.message).toContain('42');
      expect(parsed.message).toContain('activated');
    });

    it('should use the activation mutation with id and versionOverride dev', async () => {
      mocks.setResponseOnce({ activate_live_workflow: { is_success: true } } as ActivateLiveWorkflowMutation);

      await callToolByNameRawAsync('manage_automations', {
        action: 'activate',
        workflowId: '42',
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('activateLiveWorkflow'),
        { id: '42' },
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should error when activation does not report success', async () => {
      mocks.setResponseOnce({ activate_live_workflow: { is_success: false } } as ActivateLiveWorkflowMutation);

      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'activate',
        workflowId: '42',
      });

      expect(result.content[0].text).toContain('did not report success');
    });

    it('should propagate GraphQL errors with operation context', async () => {
      mocks.setError('Not authorized');

      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'activate',
        workflowId: '42',
      });

      expect(result.content[0].text).toContain('Failed to activate workflow');
    });
  });

  describe('action=deactivate', () => {
    it('should deactivate a workflow and report the inactive state', async () => {
      mocks.setResponseOnce({ deactivate_live_workflow: { is_success: true } } as DeactivateLiveWorkflowMutation);

      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'deactivate',
        workflowId: '42',
      });
      const parsed = parseToolResult(result);

      expect(parsed.workflowId).toBe('42');
      expect(parsed.isActive).toBe(false);
      expect(parsed.message).toContain('42');
      expect(parsed.message).toContain('deactivated');
    });

    it('should use the deactivation mutation with id and versionOverride dev', async () => {
      mocks.setResponseOnce({ deactivate_live_workflow: { is_success: true } } as DeactivateLiveWorkflowMutation);

      await callToolByNameRawAsync('manage_automations', {
        action: 'deactivate',
        workflowId: '42',
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('deactivateLiveWorkflow'),
        { id: '42' },
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should error when deactivation does not report success', async () => {
      mocks.setResponseOnce({ deactivate_live_workflow: { is_success: false } } as DeactivateLiveWorkflowMutation);

      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'deactivate',
        workflowId: '42',
      });

      expect(result.content[0].text).toContain('did not report success');
    });

    it('should propagate GraphQL errors with operation context', async () => {
      mocks.setError('Not authorized');

      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'deactivate',
        workflowId: '42',
      });

      expect(result.content[0].text).toContain('Failed to deactivate workflow');
    });
  });

  describe('action=delete', () => {
    it('should report success and echo the workflow id', async () => {
      mocks.setResponseOnce({ delete_live_workflow: { is_success: true } } as DeleteLiveWorkflowMutation);

      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'delete',
        workflowId: '42',
      });
      const parsed = parseToolResult(result);

      expect(parsed.workflowId).toBe('42');
      expect(parsed.message).toContain('42');
      expect(parsed.message).toContain('deleted');
    });

    it('should pass id and versionOverride dev', async () => {
      mocks.setResponseOnce({ delete_live_workflow: { is_success: true } } as DeleteLiveWorkflowMutation);

      await callToolByNameRawAsync('manage_automations', {
        action: 'delete',
        workflowId: '42',
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('deleteLiveWorkflow'),
        { id: '42' },
        expect.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should error when deletion does not report success', async () => {
      mocks.setResponseOnce({ delete_live_workflow: { is_success: false } } as DeleteLiveWorkflowMutation);

      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'delete',
        workflowId: '42',
      });

      expect(result.content[0].text).toContain('did not report success');
    });

    it('should propagate GraphQL errors with operation context', async () => {
      mocks.setError('Not authorized');

      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'delete',
        workflowId: '42',
      });

      expect(result.content[0].text).toContain('Failed to delete workflow');
    });
  });

  describe('validation', () => {
    it('should reject whitespace-only workflowId', async () => {
      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'activate',
        workflowId: '   ',
      });

      expect(result.content[0].text).toContain('workflowId must be a non-empty string');
    });
  });
});
