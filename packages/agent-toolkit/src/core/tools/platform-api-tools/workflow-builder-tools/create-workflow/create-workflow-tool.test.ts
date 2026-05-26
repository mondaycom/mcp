import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import { CreateWorkflowMutation } from '../../../../../monday-graphql/generated/graphql.dev/graphql';

describe('CreateWorkflowBuilderTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockResponse: CreateWorkflowMutation = {
    create_workflow: {
      workflow_object_id: '999',
      workflow_draft_id: '111',
    },
  };

  it('should return workflowObjectId and workflowDraftId on success', async () => {
    mocks.setResponseOnce(mockResponse);

    const result = await callToolByNameRawAsync('create_workflow', { workspaceId: '42' });
    const parsed = parseToolResult(result);

    expect(parsed.workflowObjectId).toBe('999');
    expect(parsed.workflowDraftId).toBe('111');
    expect(parsed.message).toContain('42');
  });

  it('should call the mutation with workspace_id and versionOverride dev', async () => {
    mocks.setResponseOnce(mockResponse);

    await callToolByNameRawAsync('create_workflow', { workspaceId: '42' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('createWorkflow'),
      expect.objectContaining({ workspace_id: '42' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should pass title when provided', async () => {
    mocks.setResponseOnce(mockResponse);

    await callToolByNameRawAsync('create_workflow', { workspaceId: '42', title: 'My Workflow' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: 'My Workflow' }),
      expect.anything(),
    );
  });

  it('should pass privacy_kind when provided', async () => {
    mocks.setResponseOnce(mockResponse);

    await callToolByNameRawAsync('create_workflow', { workspaceId: '42', privacyKind: 'PRIVATE' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ privacy_kind: 'PRIVATE' }),
      expect.anything(),
    );
  });

  it('should accept SHAREABLE as a valid privacyKind', async () => {
    mocks.setResponseOnce(mockResponse);

    await callToolByNameRawAsync('create_workflow', { workspaceId: '42', privacyKind: 'SHAREABLE' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ privacy_kind: 'SHAREABLE' }),
      expect.anything(),
    );
  });

  it('should pass description when provided', async () => {
    mocks.setResponseOnce(mockResponse);

    await callToolByNameRawAsync('create_workflow', { workspaceId: '42', description: 'My description' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ description: 'My description' }),
      expect.anything(),
    );
  });

  it('should pass folder_id when provided', async () => {
    mocks.setResponseOnce(mockResponse);

    await callToolByNameRawAsync('create_workflow', { workspaceId: '42', folderId: '77' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ folder_id: '77' }),
      expect.anything(),
    );
  });

  it('should pass owner_ids when provided', async () => {
    mocks.setResponseOnce(mockResponse);

    await callToolByNameRawAsync('create_workflow', { workspaceId: '42', ownerIds: ['1', '2'] });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ owner_ids: ['1', '2'] }),
      expect.anything(),
    );
  });

  it('should not include optional fields when not provided', async () => {
    mocks.setResponseOnce(mockResponse);

    await callToolByNameRawAsync('create_workflow', { workspaceId: '42' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.objectContaining({ title: expect.anything() }),
      expect.anything(),
    );
  });

  it('should reject invalid privacyKind values', async () => {
    const result = await callToolByNameRawAsync('create_workflow', {
      workspaceId: '42',
      privacyKind: 'private',
    });

    expect(result.content[0].text).toContain('Invalid enum value');
  });

  it('should reject whitespace-only workspaceId', async () => {
    const result = await callToolByNameRawAsync('create_workflow', { workspaceId: '   ' });

    expect(result.content[0].text).toContain('workspaceId must be a non-empty string');
  });

  it('should propagate GraphQL errors with operation context', async () => {
    mocks.setError('Not authorized');

    const result = await callToolByNameRawAsync('create_workflow', { workspaceId: '42' });

    expect(result.content[0].text).toContain('Failed to create Workflow Builder workflow');
  });
});
