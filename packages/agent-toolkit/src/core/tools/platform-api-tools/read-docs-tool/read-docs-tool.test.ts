import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameAsync, callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';
import { ReadDocsTool } from './read-docs-tool';

const TOOL_NAME = 'read_docs';
const DOC_ID = 'doc_123';

// --- shared mocks ---

const mockDoc = {
  id: DOC_ID,
  object_id: 'obj_456',
  name: 'Test Doc',
  doc_kind: 'private',
  created_at: '2026-03-01T00:00:00Z',
  created_by: { name: 'Alice' },
  url: 'https://monday.com/doc/123',
  relative_url: '/doc/123',
  workspace: { name: 'My Workspace' },
  workspace_id: 'ws_1',
  doc_folder_id: null,
  settings: null,
};

const mockMarkdownResponse = {
  export_markdown_from_doc: { success: true, markdown: '# Hello World' },
};

const mockDocsResponse = { docs: [mockDoc] };
const mockEmptyDocsResponse = { docs: [] };

const mockRestoringPoints = [
  { date: '2026-03-18T10:00:00Z', user_ids: ['1001', '1002'], type: null },
  { date: '2026-03-17T09:00:00Z', user_ids: ['1001'], type: 'publish' },
];

const mockHistoryResponse = {
  doc_version_history: { doc_id: DOC_ID, restoring_points: mockRestoringPoints },
};

const mockDiffBlocks = [
  { id: 'b1', type: 'text', summary: 'Added paragraph', changes: { added: true, deleted: false, changed: false } },
];

const mockDiffResponse = {
  doc_version_diff: { doc_id: DOC_ID, blocks: mockDiffBlocks },
};

describe('ReadDocsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── content mode ───────────────────────────────────────────────────────────

  describe('content mode (default)', () => {
    it('should return documents with markdown content', async () => {
      mocks.mockRequest.mockResolvedValueOnce(mockDocsResponse).mockResolvedValueOnce(mockMarkdownResponse);

      const result = await callToolByNameAsync(TOOL_NAME, { type: 'ids', ids: [DOC_ID] });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(DOC_ID);
      expect(result.data[0].blocks_as_markdown).toBe('# Hello World');
    });

    it('should return documents when mode is explicitly "content"', async () => {
      mocks.mockRequest.mockResolvedValueOnce(mockDocsResponse).mockResolvedValueOnce(mockMarkdownResponse);

      const result = await callToolByNameAsync(TOOL_NAME, { mode: 'content', type: 'ids', ids: [DOC_ID] });

      expect(result.data).toHaveLength(1);
    });

    it('should include pagination metadata', async () => {
      mocks.mockRequest.mockResolvedValueOnce(mockDocsResponse).mockResolvedValueOnce(mockMarkdownResponse);

      const result = await callToolByNameAsync(TOOL_NAME, { type: 'ids', ids: [DOC_ID] });

      expect(result.pagination).toBeDefined();
      expect(result.pagination.current_page).toBe(1);
    });

    it('should return error when type or ids are missing in content mode', async () => {
      const result = await callToolByNameRawAsync(TOOL_NAME, { mode: 'content' });

      expect(result.content[0].text).toContain('type and ids are required');
    });

    it('should fall back to object_ids when ids returns no results', async () => {
      mocks.mockRequest
        .mockResolvedValueOnce(mockEmptyDocsResponse)
        .mockResolvedValueOnce(mockDocsResponse)
        .mockResolvedValueOnce(mockMarkdownResponse);

      const result = await callToolByNameAsync(TOOL_NAME, { type: 'ids', ids: [DOC_ID] });

      expect(result.data).toHaveLength(1);
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(3);
    });

    it('should return no documents message when nothing found', async () => {
      mocks.mockRequest.mockResolvedValueOnce(mockEmptyDocsResponse).mockResolvedValueOnce(mockEmptyDocsResponse);

      const result = await callToolByNameRawAsync(TOOL_NAME, { type: 'ids', ids: ['nonexistent'] });

      expect(result.content[0].text).toContain('No documents found');
    });

    it('should return error content on API errors', async () => {
      mocks.setError('Network error');

      const result = await callToolByNameRawAsync(TOOL_NAME, { type: 'ids', ids: [DOC_ID] });

      expect(result.content[0].text).toContain('Error reading documents');
      expect(result.content[0].text).toContain('Network error');
    });
  });

  // ─── version_history mode ───────────────────────────────────────────────────

  describe('version_history mode', () => {
    it('should return restoring points for a doc', async () => {
      mocks.setResponse(mockHistoryResponse);

      const result = await callToolByNameAsync(TOOL_NAME, { mode: 'version_history', ids: [DOC_ID] });

      expect(result.doc_id).toBe(DOC_ID);
      expect(result.restoring_points).toHaveLength(2);
      expect(result.restoring_points[0].date).toBe('2026-03-18T10:00:00Z');
      expect(result.restoring_points[0].user_ids).toEqual(['1001', '1002']);
    });

    it('should include publish type on restoring points', async () => {
      mocks.setResponse(mockHistoryResponse);

      const result = await callToolByNameAsync(TOOL_NAME, { mode: 'version_history', ids: [DOC_ID] });

      expect(result.restoring_points[1].type).toBe('publish');
    });

    it('should return error when doc_id is missing in version_history mode', async () => {
      const result = await callToolByNameRawAsync(TOOL_NAME, { mode: 'version_history' });

      expect(result.content[0].text).toContain('ids is required');
    });

    it('should return no history message when no restoring points found', async () => {
      mocks.setResponse({ doc_version_history: { doc_id: DOC_ID, restoring_points: [] } });

      const result = await callToolByNameRawAsync(TOOL_NAME, { mode: 'version_history', ids: [DOC_ID] });

      expect(result.content[0].text).toContain('No version history found');
      expect(result.content[0].text).toContain(DOC_ID);
    });

    it('should pass since/until to the API', async () => {
      mocks.setResponse(mockHistoryResponse);

      await callToolByNameAsync(TOOL_NAME, {
        mode: 'version_history',
        ids: [DOC_ID],
        since: '2026-03-15T00:00:00Z',
        until: '2026-03-18T23:59:59Z',
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetDocVersionHistory'),
        expect.objectContaining({ docId: DOC_ID, since: '2026-03-15T00:00:00Z', until: '2026-03-18T23:59:59Z' }),
      );
    });

    it('should pass undefined since/until when not provided', async () => {
      mocks.setResponse(mockHistoryResponse);

      await callToolByNameAsync(TOOL_NAME, { mode: 'version_history', ids: [DOC_ID] });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetDocVersionHistory'),
        expect.objectContaining({ docId: DOC_ID, since: undefined, until: undefined }),
      );
    });

    it('should limit restoring points when version_history_limit is set', async () => {
      mocks.setResponse(mockHistoryResponse); // has 2 restoring points

      const result = await callToolByNameAsync(TOOL_NAME, {
        mode: 'version_history',
        ids: [DOC_ID],
        version_history_limit: 1,
      });

      expect(result.restoring_points).toHaveLength(1);
      expect(result.restoring_points[0].date).toBe('2026-03-18T10:00:00Z'); // newest first
    });

    it('should fetch diffs for consecutive restoring points', async () => {
      mocks.mockRequest.mockResolvedValueOnce(mockHistoryResponse).mockResolvedValueOnce(mockDiffResponse);

      const result = await callToolByNameAsync(TOOL_NAME, {
        mode: 'version_history',
        ids: [DOC_ID],
        include_diff: true,
      });

      expect(result.restoring_points[0].diff).toEqual(mockDiffBlocks);
    });

    it('should not attach diff to last restoring point', async () => {
      mocks.mockRequest.mockResolvedValueOnce(mockHistoryResponse).mockResolvedValueOnce(mockDiffResponse);

      const result = await callToolByNameAsync(TOOL_NAME, {
        mode: 'version_history',
        ids: [DOC_ID],
        include_diff: true,
      });

      const lastPoint = result.restoring_points[result.restoring_points.length - 1];
      expect(lastPoint.diff).toBeUndefined();
    });

    it('should cap diffs at 10 and set truncated flag', async () => {
      const manyPoints = Array.from({ length: 12 }, (_, i) => ({
        date: `2026-03-18T${String(i).padStart(2, '0')}:00:00Z`,
        user_ids: ['1001'],
        type: null,
      }));
      mocks.mockRequest.mockResolvedValueOnce({
        doc_version_history: { doc_id: DOC_ID, restoring_points: manyPoints },
      });
      for (let i = 0; i < 9; i++) mocks.mockRequest.mockResolvedValueOnce(mockDiffResponse);

      const result = await callToolByNameAsync(TOOL_NAME, {
        mode: 'version_history',
        ids: [DOC_ID],
        include_diff: true,
      });

      expect(result.restoring_points).toHaveLength(10);
      expect(result.truncated).toBe(true);
      expect(result.total_count).toBe(12);
    });

    it('should return history with partial diffs when a single diff request fails', async () => {
      mocks.mockRequest
        .mockResolvedValueOnce(mockHistoryResponse)
        .mockRejectedValueOnce(new Error('Diff fetch failed'));

      const result = await callToolByNameAsync(TOOL_NAME, {
        mode: 'version_history',
        ids: [DOC_ID],
        include_diff: true,
      });

      expect(result.restoring_points).toHaveLength(2);
      expect(result.restoring_points[0].diff).toBeUndefined();
    });

    it('should skip diff for a restoring point with null date', async () => {
      const pointsWithNullDate = [
        { date: null, user_ids: ['1001'], type: null },
        { date: '2026-03-17T09:00:00Z', user_ids: ['1001'], type: null },
      ];
      mocks.mockRequest.mockResolvedValueOnce({
        doc_version_history: { doc_id: DOC_ID, restoring_points: pointsWithNullDate },
      });

      const result = await callToolByNameAsync(TOOL_NAME, {
        mode: 'version_history',
        ids: [DOC_ID],
        include_diff: true,
      });

      expect(result.restoring_points[0].diff).toBeUndefined();
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
    });

    it('should return error content on API errors', async () => {
      mocks.setError('Network error');

      const result = await callToolByNameRawAsync(TOOL_NAME, { mode: 'version_history', ids: [DOC_ID] });

      expect(result.content[0].text).toContain('Error fetching version history');
      expect(result.content[0].text).toContain('Network error');
    });
  });

  // ─── include_comments ──────────────────────────────────────────────────────

  describe('include_comments', () => {
    const mockCommentsResponse = {
      boards: [
        {
          items_page: {
            items: [
              {
                id: 'item_1',
                name: 'Doc Section 1',
                updates: [
                  {
                    id: 'update_1',
                    text_body: 'Great section!',
                    body: '<p>Great section!</p>',
                    created_at: '2026-03-25T10:00:00Z',
                    creator: { id: '1', name: 'Alice' },
                    replies: [
                      {
                        id: 'reply_1',
                        text_body: 'Thanks!',
                        body: '<p>Thanks!</p>',
                        created_at: '2026-03-25T11:00:00Z',
                        creator: { id: '2', name: 'Bob' },
                      },
                    ],
                  },
                ],
              },
              {
                id: 'item_2',
                name: 'Doc Section 2',
                updates: [],
              },
            ],
          },
        },
      ],
    };

    it('should include comments when include_comments is true', async () => {
      mocks.mockRequest
        .mockResolvedValueOnce(mockDocsResponse)
        .mockResolvedValueOnce(mockMarkdownResponse)
        .mockResolvedValueOnce(mockCommentsResponse);

      const result = await callToolByNameAsync(TOOL_NAME, {
        type: 'ids',
        ids: [DOC_ID],
        include_comments: true,
      });

      expect(result.data[0].comments).toBeDefined();
      expect(result.data[0].comments).toHaveLength(1);
      expect(result.data[0].comments[0].id).toBe('update_1');
      expect(result.data[0].comments[0].text_body).toBe('Great section!');
      expect(result.data[0].comments[0].item_id).toBe('item_1');
      expect(result.data[0].comments[0].item_name).toBe('Doc Section 1');
      expect(result.data[0].comments[0].creator).toEqual({ id: '1', name: 'Alice' });
    });

    it('should include replies in comments', async () => {
      mocks.mockRequest
        .mockResolvedValueOnce(mockDocsResponse)
        .mockResolvedValueOnce(mockMarkdownResponse)
        .mockResolvedValueOnce(mockCommentsResponse);

      const result = await callToolByNameAsync(TOOL_NAME, {
        type: 'ids',
        ids: [DOC_ID],
        include_comments: true,
      });

      const replies = result.data[0].comments[0].replies;
      expect(replies).toHaveLength(1);
      expect(replies[0].id).toBe('reply_1');
      expect(replies[0].text_body).toBe('Thanks!');
      expect(replies[0].creator).toEqual({ id: '2', name: 'Bob' });
    });

    it('should not include comments when include_comments is false', async () => {
      mocks.mockRequest.mockResolvedValueOnce(mockDocsResponse).mockResolvedValueOnce(mockMarkdownResponse);

      const result = await callToolByNameAsync(TOOL_NAME, {
        type: 'ids',
        ids: [DOC_ID],
        include_comments: false,
      });

      expect(result.data[0].comments).toBeUndefined();
    });

    it('should not include comments by default', async () => {
      mocks.mockRequest.mockResolvedValueOnce(mockDocsResponse).mockResolvedValueOnce(mockMarkdownResponse);

      const result = await callToolByNameAsync(TOOL_NAME, {
        type: 'ids',
        ids: [DOC_ID],
      });

      expect(result.data[0].comments).toBeUndefined();
    });

    it('should pass comments_limit to the GraphQL query', async () => {
      mocks.mockRequest
        .mockResolvedValueOnce(mockDocsResponse)
        .mockResolvedValueOnce(mockMarkdownResponse)
        .mockResolvedValueOnce(mockCommentsResponse);

      await callToolByNameAsync(TOOL_NAME, {
        type: 'ids',
        ids: [DOC_ID],
        include_comments: true,
        comments_limit: 10,
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('GetDocComments'),
        expect.objectContaining({ boardId: 'obj_456', updatesLimit: 10 }),
      );
    });

    it('should skip items with no updates', async () => {
      mocks.mockRequest
        .mockResolvedValueOnce(mockDocsResponse)
        .mockResolvedValueOnce(mockMarkdownResponse)
        .mockResolvedValueOnce(mockCommentsResponse);

      const result = await callToolByNameAsync(TOOL_NAME, {
        type: 'ids',
        ids: [DOC_ID],
        include_comments: true,
      });

      // item_2 has empty updates, should not produce any comments
      expect(result.data[0].comments).toHaveLength(1);
    });

    it('should handle comment fetch errors gracefully', async () => {
      mocks.mockRequest
        .mockResolvedValueOnce(mockDocsResponse)
        .mockResolvedValueOnce(mockMarkdownResponse)
        .mockRejectedValueOnce(new Error('Comments API error'));

      const result = await callToolByNameAsync(TOOL_NAME, {
        type: 'ids',
        ids: [DOC_ID],
        include_comments: true,
      });

      expect(result.data[0].comments).toContain('Error fetching comments');
    });
  });

  // ─── schema validation ──────────────────────────────────────────────────────

  describe('schema validation', () => {
    it('should have correct tool metadata', () => {
      const tool = new ReadDocsTool(mocks.mockApiClient);

      expect(tool.name).toBe('read_docs');
      expect(tool.type).toBe('read');
      expect(tool.annotations.title).toBe('Read Documents');
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.annotations.destructiveHint).toBe(false);
      expect(tool.annotations.idempotentHint).toBe(true);
    });

    it('should have correct input schema', () => {
      const tool = new ReadDocsTool(mocks.mockApiClient);
      const schema = tool.getInputSchema();

      expect(schema.mode).toBeDefined();
      expect(schema.type).toBeDefined();
      expect(schema.ids).toBeDefined();
      expect(schema.version_history_limit).toBeDefined();
      expect(schema.since).toBeDefined();
      expect(schema.until).toBeDefined();
      expect(schema.include_diff).toBeDefined();
      expect(schema.include_comments).toBeDefined();
      expect(schema.comments_limit).toBeDefined();
    });

    it('should have correct description', () => {
      const tool = new ReadDocsTool(mocks.mockApiClient);
      const description = tool.getDescription();

      expect(description).toContain('content');
      expect(description).toContain('version_history');
      expect(description).toContain('object_id');
      expect(description).toContain('include_diff');
      expect(description).toContain('include_comments');
    });
  });
});
