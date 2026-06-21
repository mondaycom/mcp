import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';

describe('ListAutomationsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockBoardAutomation = {
    id: '101',
    user_id: '42',
    active: true,
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

  const expectedWorkflow = {
    id: mockBoardAutomation.id,
    user_id: 42,
    is_active: true,
    title: mockBoardAutomation.title,
    description: mockBoardAutomation.description,
    created_at: mockBoardAutomation.created_at,
    updated_at: mockBoardAutomation.updated_at,
    workflow_host_data: mockBoardAutomation.workflow_host_data,
    workflow_blocks: mockBoardAutomation.workflow_blocks,
    workflow_variables: mockBoardAutomation.workflow_variables,
    importance: mockBoardAutomation.importance,
    notice_message: mockBoardAutomation.notice_message,
    template_reference_id: mockBoardAutomation.template_reference_id,
  };

  it('should return live workflows for the board', async () => {
    mocks.setResponseOnce({ board_automations: { cursor: null, items: [mockBoardAutomation] } });

    const result = await callToolByNameRawAsync('list_automations', { boardId: '1234567890' });
    const parsed = parseToolResult(result);

    expect(parsed.workflows).toEqual([expectedWorkflow]);
    expect(parsed.message).toContain('1');
    expect(parsed.message).toContain('1234567890');
  });

  it('should query board_automations with board_ids', async () => {
    mocks.setResponseOnce({ board_automations: { cursor: null, items: [] } });

    await callToolByNameRawAsync('list_automations', { boardId: '1234567890' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('board_automations'),
      { boardIds: ['1234567890'], limit: 100, includeLegacy: true },
      expect.objectContaining({ versionOverride: '2026-10' }),
    );
    expect(mocks.getMockRequest().mock.calls[0][0]).not.toContain('HostType');
  });

  it('should return pagination cursor from board_automations', async () => {
    mocks.setResponseOnce({ board_automations: { cursor: 'next-page', items: [mockBoardAutomation] } });

    const result = await callToolByNameRawAsync('list_automations', { boardId: '1234567890' });
    const parsed = parseToolResult(result);

    expect(parsed.pagination).toEqual({ nextCursor: 'next-page', hasMore: true });
  });

  it('should pass cursor and limit when provided', async () => {
    mocks.setResponseOnce({ board_automations: { cursor: null, items: [] } });

    await callToolByNameRawAsync('list_automations', { boardId: '1234567890', cursor: '50', limit: 50 });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('board_automations'),
      { boardIds: ['1234567890'], cursor: '50', limit: 50, includeLegacy: false },
      expect.objectContaining({ versionOverride: '2026-10' }),
    );
  });

  it('should default workflows to an empty array when board_automations items are null', async () => {
    mocks.setResponseOnce({ board_automations: { cursor: null, items: null } });

    const result = await callToolByNameRawAsync('list_automations', { boardId: '1234567890' });
    const parsed = parseToolResult(result);

    expect(parsed.workflows).toEqual([]);
    expect(parsed.message).toContain('0');
  });

  it('should include legacy automations on the first page', async () => {
    const legacy = { note: 'older automations', automations: [{ id: 1 }], recipes: { recipes: [] } };
    mocks.setResponseOnce({
      board_automations: { cursor: null, legacy_automations: legacy, items: [mockBoardAutomation] },
    });

    const result = await callToolByNameRawAsync('list_automations', { boardId: '1234567890' });
    const parsed = parseToolResult(result);

    expect(parsed.legacyAutomations).toEqual(legacy);
  });

  it('should request legacy automations only when no cursor is provided', async () => {
    mocks.setResponseOnce({ board_automations: { cursor: null, items: [] } });

    await callToolByNameRawAsync('list_automations', { boardId: '1234567890', cursor: '50' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('board_automations'),
      expect.objectContaining({ includeLegacy: false }),
      expect.anything(),
    );
  });

  it('should omit legacyAutomations from output when none are returned', async () => {
    mocks.setResponseOnce({ board_automations: { cursor: null, items: [mockBoardAutomation] } });

    const result = await callToolByNameRawAsync('list_automations', { boardId: '1234567890' });
    const parsed = parseToolResult(result);

    expect(parsed).not.toHaveProperty('legacyAutomations');
  });

  it('should propagate GraphQL errors with operation context', async () => {
    mocks.setError('Not authorized');

    const result = await callToolByNameRawAsync('list_automations', { boardId: '1234567890' });

    expect(result.content[0].text).toContain('Failed to list live workflows');
  });

  it('should reject whitespace-only boardId', async () => {
    const result = await callToolByNameRawAsync('list_automations', { boardId: '   ' });

    expect(result.content[0].text).toContain('boardId must be a non-empty string');
  });
});
