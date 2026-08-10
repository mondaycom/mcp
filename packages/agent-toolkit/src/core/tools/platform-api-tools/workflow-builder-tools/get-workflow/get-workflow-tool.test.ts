import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';

describe('GetWorkflowTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockWorkflow = {
    id: '100',
    title: 'My Workflow',
    description: 'A sample workflow',
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    steps: [{ node_id: '1', block_reference_id: '10', title: 'First step' }],
  };

  const expectedWorkflow = {
    id: '100',
    title: 'My Workflow',
    description: 'A sample workflow',
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    steps: [{ node_id: '1', block_reference_id: '10', title: 'First step' }],
  };

  it('should return workflows mapped to the read model', async () => {
    mocks.setResponseOnce({ workflows: [mockWorkflow] });

    const result = await callToolByNameRawAsync('get_workflow', { workflowIds: ['100'] });
    const parsed = parseToolResult(result);

    expect(parsed.workflows).toEqual([expectedWorkflow]);
    expect(parsed.message).toContain('1');
  });

  it('should call workflows query with ids and versionOverride dev', async () => {
    mocks.setResponseOnce({ workflows: [] });

    await callToolByNameRawAsync('get_workflow', { workflowIds: ['100', '200'] });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('workflows'),
      { ids: ['100', '200'] },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should default workflows to an empty array when the query returns null', async () => {
    mocks.setResponseOnce({ workflows: null });

    const result = await callToolByNameRawAsync('get_workflow', { workflowIds: ['100'] });
    const parsed = parseToolResult(result);

    expect(parsed.workflows).toEqual([]);
    expect(parsed.message).toContain('0');
  });

  it('should coerce nullable fields to safe defaults', async () => {
    mocks.setResponseOnce({
      workflows: [{ id: '100', title: null, description: null, active: null, created_at: null, updated_at: null, steps: null }],
    });

    const result = await callToolByNameRawAsync('get_workflow', { workflowIds: ['100'] });
    const parsed = parseToolResult(result);

    expect(parsed.workflows).toEqual([
      { id: '100', title: null, description: null, active: false, created_at: null, updated_at: null, steps: [] },
    ]);
  });

  it('should reject an empty workflowIds array', async () => {
    const result = await callToolByNameRawAsync('get_workflow', { workflowIds: [] });

    expect(result.content[0].text).toContain('Provide at least one workflow ID');
  });

  it('should reject whitespace-only workflow IDs', async () => {
    const result = await callToolByNameRawAsync('get_workflow', { workflowIds: ['   '] });

    expect(result.content[0].text).toContain('workflowId must be a non-empty string');
  });

  it('should propagate GraphQL errors with operation context', async () => {
    mocks.setError('Not authorized');

    const result = await callToolByNameRawAsync('get_workflow', { workflowIds: ['100'] });

    expect(result.content[0].text).toContain('Failed to get workflow');
  });
});
