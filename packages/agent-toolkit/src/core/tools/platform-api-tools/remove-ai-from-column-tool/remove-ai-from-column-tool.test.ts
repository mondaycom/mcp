import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../test-utils/mock-api-client';

describe('RemoveAiFromColumnTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  it('should remove AI from column successfully', async () => {
    mocks.setResponseOnce({ remove_ai_from_column: { column_id: 'col1', success: true } });

    const result = await callToolByNameRawAsync('remove_ai_from_column', {
      board_id: 123,
      column_id: 'col1',
    });
    const parsed = parseToolResult(result);

    expect(parsed.message).toContain('AI removed from column successfully');
    expect(parsed.column_id).toBe('col1');
    expect(parsed.success).toBe(true);
  });

  it('should pass versionOverride dev and correct variables', async () => {
    mocks.setResponseOnce({ remove_ai_from_column: { column_id: 'col1', success: true } });

    await callToolByNameRawAsync('remove_ai_from_column', {
      board_id: 456,
      column_id: 'col1',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('RemoveAiFromColumn'),
      { boardId: '456', columnId: 'col1' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should propagate GraphQL errors with context', async () => {
    mocks.setError('Not authorized');

    const result = await callToolByNameRawAsync('remove_ai_from_column', {
      board_id: 123,
      column_id: 'col1',
    });

    expect(result.content[0].text).toContain('remove AI from column');
  });

  it('should reject when board_id is missing', async () => {
    const result = await callToolByNameRawAsync('remove_ai_from_column', {
      column_id: 'col1',
    });

    expect(result.content[0].text).toContain('board_id');
  });

  it('should reject when column_id is missing', async () => {
    const result = await callToolByNameRawAsync('remove_ai_from_column', {
      board_id: 123,
    });

    expect(result.content[0].text).toContain('column_id');
  });
});
