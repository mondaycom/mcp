import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameAsync, callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';
import { GetDocVersionHistoryTool } from './get-doc-version-history-tool';

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

const mockDiffBlocks = [
  { id: 'b1', type: 'text', summary: 'Added paragraph', changes: { added: true, deleted: false, changed: false } },
];

const mockDiffResponse = {
  doc_version_diff: {
    doc_id: DOC_ID,
    blocks: mockDiffBlocks,
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

  describe('Version history (no diff)', () => {
    it('should return restoring points for a doc', async () => {
      mocks.setResponse(mockHistoryResponse);

      const result = await callToolByNameAsync(TOOL_NAME, { doc_id: DOC_ID });

      expect(result.doc_id).toBe(DOC_ID);
      expect(result.restoring_points).toHaveLength(2);
      expect(result.restoring_points[0].date).toBe('2026-03-18T10:00:00Z');
      expect(result.restoring_points[0].user_ids).toEqual(['1001', '1002']);
    });

    it('should include publish type on restoring points', async () => {
      mocks.setResponse(mockHistoryResponse);

      const result = await callToolByNameAsync(TOOL_NAME, { doc_id: DOC_ID });

      expect(result.restoring_points[1].type).toBe('publish');
    });

    it('should pass since/until to the API', async () => {
      mocks.setResponse(mockHistoryResponse);

      await callToolByNameAsync(TOOL_NAME, {
        doc_id: DOC_ID,
        since: '2026-03-15T00:00:00Z',
        until: '2026-03-18T23:59:59Z',
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetDocVersionHistory'),
        expect.objectContaining({
          docId: DOC_ID,
          since: '2026-03-15T00:00:00Z',
          until: '2026-03-18T23:59:59Z',
        }),
      );
    });

    it('should use default time range when since/until not provided', async () => {
      mocks.setResponse(mockHistoryResponse);

      await callToolByNameAsync(TOOL_NAME, { doc_id: DOC_ID });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetDocVersionHistory'),
        expect.objectContaining({ docId: DOC_ID }),
      );
    });
  });

  describe('Empty results', () => {
    it('should return no history message when no restoring points found', async () => {
      mocks.setResponse({ doc_version_history: { doc_id: DOC_ID, restoring_points: [] } });

      const result = await callToolByNameRawAsync(TOOL_NAME, { doc_id: DOC_ID });

      expect(result.content[0].text).toContain('No version history found');
      expect(result.content[0].text).toContain(DOC_ID);
    });
  });

  describe('With diffs (include_diff: true)', () => {
    it('should fetch diffs for consecutive restoring points', async () => {
      mocks.mockRequest
        .mockResolvedValueOnce(mockHistoryResponse)
        .mockResolvedValueOnce(mockDiffResponse);

      const result = await callToolByNameAsync(TOOL_NAME, { doc_id: DOC_ID, include_diff: true });

      expect(result.restoring_points[0].diff).toEqual(mockDiffBlocks);
    });

    it('should not attach diff to last restoring point', async () => {
      mocks.mockRequest
        .mockResolvedValueOnce(mockHistoryResponse)
        .mockResolvedValueOnce(mockDiffResponse);

      const result = await callToolByNameAsync(TOOL_NAME, { doc_id: DOC_ID, include_diff: true });

      const lastPoint = result.restoring_points[result.restoring_points.length - 1];
      expect(lastPoint.diff).toBeUndefined();
    });

    it('should call GetDocVersionDiff with correct dates', async () => {
      mocks.mockRequest
        .mockResolvedValueOnce(mockHistoryResponse)
        .mockResolvedValueOnce(mockDiffResponse);

      await callToolByNameAsync(TOOL_NAME, { doc_id: DOC_ID, include_diff: true });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetDocVersionDiff'),
        expect.objectContaining({
          docId: DOC_ID,
          date: '2026-03-18T10:00:00Z',
          prevDate: '2026-03-17T09:00:00Z',
        }),
      );
    });
  });

  describe('Error handling', () => {
    it('should return error content on API errors', async () => {
      mocks.setError('Network error');

      const result = await callToolByNameRawAsync(TOOL_NAME, { doc_id: DOC_ID });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });
  });

  describe('Schema validation', () => {
    it('should have correct tool metadata', () => {
      const tool = new GetDocVersionHistoryTool(mocks.mockApiClient, 'fake_token');

      expect(tool.name).toBe('get_doc_version_history');
      expect(tool.type).toBe('read');
      expect(tool.annotations.title).toBe('Get Document Version History');
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.annotations.destructiveHint).toBe(false);
      expect(tool.annotations.idempotentHint).toBe(true);
    });

    it('should have correct input schema', () => {
      const tool = new GetDocVersionHistoryTool(mocks.mockApiClient, 'fake_token');
      const schema = tool.getInputSchema();

      expect(schema.doc_id).toBeDefined();
      expect(schema.since).toBeDefined();
      expect(schema.until).toBeDefined();
      expect(schema.include_diff).toBeDefined();
    });

    it('should have correct description', () => {
      const tool = new GetDocVersionHistoryTool(mocks.mockApiClient, 'fake_token');
      const description = tool.getDescription();

      expect(description).toContain('version history');
      expect(description).toContain('doc_id');
      expect(description).toContain('include_diff');
    });
  });
});
