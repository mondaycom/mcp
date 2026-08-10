import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';

describe('ListWorkflowsTool', () => {
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

  it('should return live workflows mapped to the read model', async () => {
    mocks.setResponseOnce({
      live_workflows_page: { data: [mockWorkflow], page_info: { has_next_page: false, end_cursor: null } },
    });

    const result = await callToolByNameRawAsync('list_workflows', {});
    const parsed = parseToolResult(result);

    expect(parsed.workflows).toEqual([expectedWorkflow]);
    expect(parsed.message).toContain('1');
  });

  it('should call live_workflows_page with versionOverride dev', async () => {
    mocks.setResponseOnce({
      live_workflows_page: { data: [], page_info: { has_next_page: false, end_cursor: null } },
    });

    await callToolByNameRawAsync('list_workflows', {});

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('live_workflows_page'),
      { pagination: {} },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should forward limit and cursor into pagination', async () => {
    mocks.setResponseOnce({
      live_workflows_page: { data: [], page_info: { has_next_page: false, end_cursor: null } },
    });

    await callToolByNameRawAsync('list_workflows', { limit: 25, cursor: '99' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      { pagination: { limit: 25, last_id: '99' } },
      expect.anything(),
    );
  });

  it('should surface pagination metadata from page_info', async () => {
    mocks.setResponseOnce({
      live_workflows_page: { data: [mockWorkflow], page_info: { has_next_page: true, end_cursor: '100' } },
    });

    const result = await callToolByNameRawAsync('list_workflows', {});
    const parsed = parseToolResult(result);

    expect(parsed.pagination).toEqual({ nextCursor: '100', hasMore: true });
  });

  it('should default workflows to an empty array when page data is missing', async () => {
    mocks.setResponseOnce({ live_workflows_page: null });

    const result = await callToolByNameRawAsync('list_workflows', {});
    const parsed = parseToolResult(result);

    expect(parsed.workflows).toEqual([]);
    expect(parsed.pagination).toEqual({ nextCursor: null, hasMore: false });
  });

  it('should reject a limit above the maximum', async () => {
    const result = await callToolByNameRawAsync('list_workflows', { limit: 500 });

    expect(result.content[0].text).toContain('less than or equal to 100');
  });

  it('should propagate GraphQL errors with operation context', async () => {
    mocks.setError('Not authorized');

    const result = await callToolByNameRawAsync('list_workflows', {});

    expect(result.content[0].text).toContain('Failed to list live workflows');
  });
});
