import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import { GetLiveWorkflowsQuery } from 'src/monday-graphql/generated/graphql.dev/graphql';

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
    automation_id: '9001',
    title: 'Status notifier',
    description: 'Notify the team when a status changes',
    importance: null,
    notice_message: null,
    template_reference_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    workflow_variables: {},
    workflow_host_data: { type: 'BOARD', id: '1234567890' },
    workflow_blocks: [],
  } as unknown as GetLiveWorkflowsQuery['get_live_workflows'][0];

  it('should return the live workflows for the board', async () => {
    mocks.setResponseOnce({ get_live_workflows: [mockWorkflow] } as GetLiveWorkflowsQuery);

    const result = await callToolByNameRawAsync('list_workflows', { boardId: '1234567890' });
    const parsed = parseToolResult(result);

    expect(parsed.workflows).toEqual([mockWorkflow]);
    expect(parsed.message).toContain('1');
    expect(parsed.message).toContain('1234567890');
  });

  it('should pass hostInstanceId, hostType BOARD and versionOverride dev', async () => {
    mocks.setResponseOnce({ get_live_workflows: [] } as unknown as GetLiveWorkflowsQuery);

    await callToolByNameRawAsync('list_workflows', { boardId: '1234567890' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('getLiveWorkflows'),
      expect.objectContaining({ hostInstanceId: '1234567890', hostType: 'BOARD' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should pass pagination when limit or lastId provided', async () => {
    mocks.setResponseOnce({ get_live_workflows: [] } as unknown as GetLiveWorkflowsQuery);

    await callToolByNameRawAsync('list_workflows', { boardId: '1234567890', limit: 10, lastId: 50 });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ pagination: { limit: 10, lastId: 50 } }),
      expect.anything(),
    );
  });

  it('should omit pagination when neither limit nor lastId provided', async () => {
    mocks.setResponseOnce({ get_live_workflows: [] } as unknown as GetLiveWorkflowsQuery);

    await callToolByNameRawAsync('list_workflows', { boardId: '1234567890' });

    const call = mocks.getMockRequest().mock.calls[0];
    expect(call[1].pagination).toBeUndefined();
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
