import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';

describe('ListWorkflowsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockAutomation = {
    id: '101',
    user_id: '42',
    active: true,
    title: 'Status notifier',
    description: 'Notify the team when a status changes',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    workflow_host_data: { boardId: '1234567890', type: 'BOARD' },
    workflow_blocks: [],
    workflow_variables: {},
    importance: null,
    notice_message: null,
    template_reference_id: null,
  };

  it('should return the board automations as workflows for the board', async () => {
    mocks.setResponseOnce({ board_automations: { items: [mockAutomation] } });

    const result = await callToolByNameRawAsync('list_workflows', { boardId: '1234567890' });
    const parsed = parseToolResult(result);

    expect(parsed.workflows).toEqual([mockAutomation]);
    expect(parsed.message).toContain('1');
    expect(parsed.message).toContain('1234567890');
  });

  it('should query board_automations with boardIds', async () => {
    mocks.setResponseOnce({ board_automations: { items: [] } });

    await callToolByNameRawAsync('list_workflows', { boardId: '1234567890' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('board_automations'),
      { boardIds: ['1234567890'] },
      expect.objectContaining({ versionOverride: '2026-10' }),
    );
  });

  it('should default workflows to an empty array when board_automations is null', async () => {
    mocks.setResponseOnce({ board_automations: null });

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
