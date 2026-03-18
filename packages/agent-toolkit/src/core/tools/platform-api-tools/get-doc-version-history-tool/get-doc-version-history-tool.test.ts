import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';

const TOOL_NAME = 'get_doc_version_history';
const DOC_ID = 'doc_123';

const mockRestoringPoints = [
  { date: '2026-03-18T10:00:00Z', user_ids: ['1001', '1002'], type: null },
  { date: '2026-03-17T09:00:00Z', user_ids: ['1001'], type: 'publish' },
];

const mockHistoryResponse = {
  doc_version_history: {
    doc_id: DOC_ID,
    restoring_points: mockRestoringPoints,
  },
};

const mockDiffResponse = {
  doc_version_diff: {
    doc_id: DOC_ID,
    blocks: [
      { id: 'b1', type: 'text', summary: 'Added paragraph', changes: { added: true, deleted: false, changed: false } },
    ],
  },
};

describe('GetDocVersionHistoryTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return formatted version history for a doc', async () => {
    mocks.setResponse(mockHistoryResponse);

    const result = await callToolByNameRawAsync(TOOL_NAME, { doc_id: DOC_ID });

    expect(result.content[0].text).toContain(DOC_ID);
    expect(result.content[0].text).toContain('2026-03-18T10:00:00Z');
    expect(result.content[0].text).toContain('1001');
  });

  it('should return no history message when no restoring points found', async () => {
    mocks.setResponse({ doc_version_history: { doc_id: DOC_ID, restoring_points: [] } });

    const result = await callToolByNameRawAsync(TOOL_NAME, { doc_id: DOC_ID });

    expect(result.content[0].text).toContain('No version history found');
    expect(result.content[0].text).toContain(DOC_ID);
  });

  it('should include publish label for publish-type restoring points', async () => {
    mocks.setResponse(mockHistoryResponse);

    const result = await callToolByNameRawAsync(TOOL_NAME, { doc_id: DOC_ID });

    expect(result.content[0].text).toContain('[Published]');
  });

  it('should include diff details when include_diff is true', async () => {
    mocks.mockRequest
      .mockResolvedValueOnce(mockHistoryResponse)
      .mockResolvedValueOnce(mockDiffResponse);

    const result = await callToolByNameRawAsync(TOOL_NAME, { doc_id: DOC_ID, include_diff: true });

    expect(result.content[0].text).toContain('Added paragraph');
  });

  it('should use default time range when since/until not provided', async () => {
    mocks.setResponse(mockHistoryResponse);

    const result = await callToolByNameRawAsync(TOOL_NAME, { doc_id: DOC_ID });

    expect(result.content[0].text).toContain(DOC_ID);
    expect(mocks.mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ docId: DOC_ID }),
    );
  });

  it('should handle API errors gracefully', async () => {
    mocks.mockRequest.mockRejectedValue(new Error('Network error'));

    const result = await callToolByNameRawAsync(TOOL_NAME, { doc_id: DOC_ID });

    expect(result.content[0].text).toContain('Error fetching version history');
    expect(result.content[0].text).toContain('Network error');
  });

  it('should include tip about include_diff when not used', async () => {
    mocks.setResponse(mockHistoryResponse);

    const result = await callToolByNameRawAsync(TOOL_NAME, { doc_id: DOC_ID, include_diff: false });

    expect(result.content[0].text).toContain('include_diff: true');
  });
});
