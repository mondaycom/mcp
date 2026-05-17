import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import { DeactivateLiveWorkflowMutation } from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('DeactivateWorkflowTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  it('should report success and echo the workflow id', async () => {
    mocks.setResponseOnce({ deactivate_live_workflow: { is_success: true } } as DeactivateLiveWorkflowMutation);

    const result = await callToolByNameRawAsync('deactivate_workflow', { workflowId: '42' });
    const parsed = parseToolResult(result);

    expect(parsed.workflowId).toBe('42');
    expect(parsed.isActive).toBe(false);
    expect(parsed.message).toContain('42');
    expect(parsed.message).toContain('deactivated');
  });

  it('should pass id and versionOverride dev', async () => {
    mocks.setResponseOnce({ deactivate_live_workflow: { is_success: true } } as DeactivateLiveWorkflowMutation);

    await callToolByNameRawAsync('deactivate_workflow', { workflowId: '42' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('deactivateLiveWorkflow'),
      { id: '42' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should error when deactivation does not report success', async () => {
    mocks.setResponseOnce({ deactivate_live_workflow: { is_success: false } } as DeactivateLiveWorkflowMutation);

    const result = await callToolByNameRawAsync('deactivate_workflow', { workflowId: '42' });

    expect(result.content[0].text).toContain('did not report success');
  });

  it('should propagate GraphQL errors with operation context', async () => {
    mocks.setError('Not authorized');

    const result = await callToolByNameRawAsync('deactivate_workflow', { workflowId: '42' });

    expect(result.content[0].text).toContain('Failed to deactivate workflow');
  });

  it('should reject whitespace-only workflowId', async () => {
    const result = await callToolByNameRawAsync('deactivate_workflow', { workflowId: '   ' });

    expect(result.content[0].text).toContain('workflowId must be a non-empty string');
  });
});
