import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import { PublishWorkflowTool } from './publish-workflow-tool';

describe('PublishWorkflowTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockResponse = {
    publish_workflow: {
      workflow_object_id: '999',
      workflow_live_id: '777',
    },
  };

  it('should return workflowObjectId and workflowLiveId on success', async () => {
    mocks.setResponseOnce(mockResponse);

    const result = await callToolByNameRawAsync('publish_workflow', {
      workflowObjectId: '999',
      workflowDraftId: '111',
    });
    const parsed = parseToolResult(result);

    expect(parsed.workflowObjectId).toBe('999');
    expect(parsed.workflowLiveId).toBe('777');
    expect(parsed.message).toContain('999');
  });

  it('should call the mutation with correct variables and versionOverride dev', async () => {
    mocks.setResponseOnce(mockResponse);

    await callToolByNameRawAsync('publish_workflow', {
      workflowObjectId: '999',
      workflowDraftId: '111',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('publishWorkflow'),
      expect.objectContaining({ workflow_object_id: '999', workflow_draft_id: '111' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should pass should_activate when shouldActivate is true', async () => {
    mocks.setResponseOnce(mockResponse);

    await callToolByNameRawAsync('publish_workflow', {
      workflowObjectId: '999',
      workflowDraftId: '111',
      shouldActivate: true,
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ should_activate: true }),
      expect.anything(),
    );
  });

  it('should not include should_activate when shouldActivate is not provided', async () => {
    mocks.setResponseOnce(mockResponse);

    await callToolByNameRawAsync('publish_workflow', {
      workflowObjectId: '999',
      workflowDraftId: '111',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.objectContaining({ should_activate: expect.anything() }),
      expect.anything(),
    );
  });

  it('should reject whitespace-only workflowObjectId', async () => {
    const result = await callToolByNameRawAsync('publish_workflow', {
      workflowObjectId: '   ',
      workflowDraftId: '111',
    });

    expect(result.content[0].text).toContain('workflowObjectId must be a non-empty string');
  });

  it('should reject whitespace-only workflowDraftId', async () => {
    const result = await callToolByNameRawAsync('publish_workflow', {
      workflowObjectId: '999',
      workflowDraftId: '   ',
    });

    expect(result.content[0].text).toContain('workflowDraftId must be a non-empty string');
  });

  it('should propagate GraphQL errors with operation context', async () => {
    mocks.setError('Not authorized');

    const result = await callToolByNameRawAsync('publish_workflow', {
      workflowObjectId: '999',
      workflowDraftId: '111',
    });

    expect(result.content[0].text).toContain('Failed to publish workflow');
  });

  it('should include custom_objects URL guidance in description', () => {
    const tool = new PublishWorkflowTool(mocks.mockApiClient);
    const desc = tool.getDescription();

    expect(desc).toContain('custom_objects/');
    expect(desc).not.toContain('/workflows/');
  });
});
