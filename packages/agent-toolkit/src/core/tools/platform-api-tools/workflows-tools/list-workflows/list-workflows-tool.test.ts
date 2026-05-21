import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';

describe('ListWorkflowsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockWorkflow = {
    id: '101',
    user_id: 42,
    is_active: true,
    title: 'Status notifier',
    description: 'Notify the team when a status changes',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    workflow_host_data: { id: '1234567890', type: 'BOARD' },
    workflow_blocks: [],
    workflow_variables: {},
    importance: null,
    notice_message: null,
    template_reference_id: null,
  };

  it('should return live workflows for the board', async () => {
    mocks.setResponseOnce({ get_live_workflows: [mockWorkflow] });

    const result = await callToolByNameRawAsync('list_workflows', { boardId: '1234567890' });
    const parsed = parseToolResult(result);

    expect(parsed.workflows).toEqual([mockWorkflow]);
    expect(parsed.message).toContain('1');
    expect(parsed.message).toContain('1234567890');
  });

  it('should query get_live_workflows with hostInstanceId and hostType', async () => {
    mocks.setResponseOnce({ get_live_workflows: [] });

    await callToolByNameRawAsync('list_workflows', { boardId: '1234567890' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('get_live_workflows'),
      { hostInstanceId: '1234567890', hostType: 'BOARD', pagination: { limit: 100 } },
      expect.objectContaining({ versionOverride: '2026-10' }),
    );
  });

  it('should return pagination cursor when results fill the page', async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => ({ ...mockWorkflow, id: String(i + 1) }));
    mocks.setResponseOnce({ get_live_workflows: fullPage });

    const result = await callToolByNameRawAsync('list_workflows', { boardId: '1234567890' });
    const parsed = parseToolResult(result);

    expect(parsed.pagination).toEqual({ nextCursor: '100', hasMore: true });
  });

  it('should pass cursor and limit when provided', async () => {
    mocks.setResponseOnce({ get_live_workflows: [] });

    await callToolByNameRawAsync('list_workflows', { boardId: '1234567890', cursor: '50', limit: 50 });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('get_live_workflows'),
      { hostInstanceId: '1234567890', hostType: 'BOARD', pagination: { limit: 50, lastId: 50 } },
      expect.objectContaining({ versionOverride: '2026-10' }),
    );
  });

  it('should default workflows to an empty array when get_live_workflows is null', async () => {
    mocks.setResponseOnce({ get_live_workflows: null });

    const result = await callToolByNameRawAsync('list_workflows', { boardId: '1234567890' });
    const parsed = parseToolResult(result);

    expect(parsed.workflows).toEqual([]);
    expect(parsed.message).toContain('0');
  });

  it('should propagate GraphQL errors with operation context', async () => {
    mocks.setError('Not authorized');

    const result = await callToolByNameRawAsync('list_workflows', { boardId: '1234567890' });

    expect(result.content[0].text).toContain('Failed to list live workflows');
  });

  it('should reject whitespace-only boardId', async () => {
    const result = await callToolByNameRawAsync('list_workflows', { boardId: '   ' });

    expect(result.content[0].text).toContain('boardId must be a non-empty string');
  });
});
