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
    it('should activate an automation and report the active state', async () => {
      mocks.setResponseOnce({ activate_live_workflow: { is_success: true } } as ActivateLiveWorkflowMutation);

      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'activate',
        automationId: '42',
      });
      const parsed = parseToolResult(result);

      expect(parsed.automationId).toBe('42');
      expect(parsed.isActive).toBe(true);
      expect(parsed.message).toContain('42');
      expect(parsed.message).toContain('activated');
    });

    it('should use the activation mutation with id and versionOverride dev', async () => {
      mocks.setResponseOnce({ activate_live_workflow: { is_success: true } } as ActivateLiveWorkflowMutation);

      await callToolByNameRawAsync('manage_automations', {
        action: 'activate',
        automationId: '42',
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
        automationId: '42',
      });

      expect(result.content[0].text).toContain('did not report success');
    });

    it('should propagate GraphQL errors with operation context', async () => {
      mocks.setError('Not authorized');

      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'activate',
        automationId: '42',
      });

      expect(result.content[0].text).toContain('Failed to activate automation');
    });
  });

  describe('action=deactivate', () => {
    it('should deactivate an automation and report the inactive state', async () => {
      mocks.setResponseOnce({ deactivate_live_workflow: { is_success: true } } as DeactivateLiveWorkflowMutation);

      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'deactivate',
        automationId: '42',
      });
      const parsed = parseToolResult(result);

      expect(parsed.automationId).toBe('42');
      expect(parsed.isActive).toBe(false);
      expect(parsed.message).toContain('42');
      expect(parsed.message).toContain('deactivated');
    });

    it('should use the deactivation mutation with id and versionOverride dev', async () => {
      mocks.setResponseOnce({ deactivate_live_workflow: { is_success: true } } as DeactivateLiveWorkflowMutation);

      await callToolByNameRawAsync('manage_automations', {
        action: 'deactivate',
        automationId: '42',
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
        automationId: '42',
      });

      expect(result.content[0].text).toContain('did not report success');
    });

    it('should propagate GraphQL errors with operation context', async () => {
      mocks.setError('Not authorized');

      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'deactivate',
        automationId: '42',
      });

      expect(result.content[0].text).toContain('Failed to deactivate automation');
    });
  });

  describe('action=delete', () => {
    it('should report success and echo the automation id', async () => {
      mocks.setResponseOnce({ delete_live_workflow: { is_success: true } } as DeleteLiveWorkflowMutation);

      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'delete',
        automationId: '42',
      });
      const parsed = parseToolResult(result);

      expect(parsed.automationId).toBe('42');
      expect(parsed.message).toContain('42');
      expect(parsed.message).toContain('deleted');
    });

    it('should pass id and versionOverride dev', async () => {
      mocks.setResponseOnce({ delete_live_workflow: { is_success: true } } as DeleteLiveWorkflowMutation);

      await callToolByNameRawAsync('manage_automations', {
        action: 'delete',
        automationId: '42',
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
        automationId: '42',
      });

      expect(result.content[0].text).toContain('did not report success');
    });

    it('should propagate GraphQL errors with operation context', async () => {
      mocks.setError('Not authorized');

      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'delete',
        automationId: '42',
      });

      expect(result.content[0].text).toContain('Failed to delete automation');
    });
  });

  describe('validation', () => {
    it('should accept the deprecated workflowId alias', async () => {
      mocks.setResponseOnce({ activate_live_workflow: { is_success: true } } as ActivateLiveWorkflowMutation);

      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'activate',
        workflowId: '42',
      });
      const parsed = parseToolResult(result);

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.anything(), { id: '42' }, expect.anything());
      expect(parsed.automationId).toBe('42');
      expect(parsed.workflowId).toBe('42');
    });

    it.each([
      ['neither', {}],
      ['both', { automationId: '42', workflowId: '42' }],
    ])('should reject %s of automationId and workflowId', async (_label, ids) => {
      const result = await callToolByNameRawAsync('manage_automations', { action: 'delete', ...ids });

      expect(result.content[0].text).toContain('Provide exactly one of automationId or workflowId');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should reject whitespace-only automationId', async () => {
      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'activate',
        automationId: '   ',
      });

      expect(result.content[0].text).toContain('automationId must be a non-empty string');
    });

    it('should reject whitespace-only workflowId', async () => {
      const result = await callToolByNameRawAsync('manage_automations', {
        action: 'activate',
        workflowId: '   ',
      });

      expect(result.content[0].text).toContain('workflowId must be a non-empty string');
    });
  });
});
