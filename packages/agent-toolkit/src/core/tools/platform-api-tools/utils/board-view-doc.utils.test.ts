import { createMockApiClient } from '../test-utils/mock-api-client';
import { fetchBoardViewDocs, resolveBoardViewDoc, noDocsFoundMessage } from './board-view-doc.utils';

describe('board-view-doc.utils', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
  });

  describe('fetchBoardViewDocs', () => {
    it('sends the resolved board_id/view_id and the version override, and filters out null docs', async () => {
      mocks.setResponse({ board_view_docs: [{ id: 'doc_1', object_id: 'obj_1', name: 'Doc 1' }, null] });

      const docs = await fetchBoardViewDocs(mocks.mockApiClient, 'board_1', 'view_1');

      expect(docs).toEqual([{ id: 'doc_1', object_id: 'obj_1', name: 'Doc 1' }]);
      const [, variables, options] = mocks.getMockRequest().mock.calls[0];
      expect(variables).toMatchObject({ boardId: 'board_1', viewId: 'view_1', includeBlocks: false });
      expect(options).toEqual({ versionOverride: '2027-01' });
    });

    it('returns an empty array when the board has no doc views', async () => {
      mocks.setResponse({ board_view_docs: [] });

      const docs = await fetchBoardViewDocs(mocks.mockApiClient, 'board_1');

      expect(docs).toEqual([]);
    });

    it('returns an empty array when board_view_docs is null', async () => {
      mocks.setResponse({ board_view_docs: null });

      const docs = await fetchBoardViewDocs(mocks.mockApiClient, 'board_1');

      expect(docs).toEqual([]);
    });
  });

  describe('resolveBoardViewDoc', () => {
    it('resolves successfully when the board has exactly one doc view', async () => {
      mocks.setResponse({ board_view_docs: [{ id: 'doc_1', object_id: 'obj_1', name: 'Doc 1' }] });

      const result = await resolveBoardViewDoc(mocks.mockApiClient, 'board_1', 'view_1');

      expect(result).toEqual({ ok: true, doc: { id: 'doc_1', object_id: 'obj_1', name: 'Doc 1' } });
    });

    it('returns an error when the board has no doc views', async () => {
      mocks.setResponse({ board_view_docs: [] });

      const result = await resolveBoardViewDoc(mocks.mockApiClient, 'board_1');

      expect(result).toEqual({ ok: false, error: noDocsFoundMessage('board_1') });
    });

    it('returns an error when a specific view has no doc', async () => {
      mocks.setResponse({ board_view_docs: [] });

      const result = await resolveBoardViewDoc(mocks.mockApiClient, 'board_1', 'view_1');

      expect(result).toEqual({ ok: false, error: noDocsFoundMessage('board_1', 'view_1') });
    });

    it('returns an actionable error listing every doc when the board has more than one doc view', async () => {
      mocks.setResponse({
        board_view_docs: [
          { id: 'doc_1', object_id: 'obj_1', name: 'Doc 1' },
          { id: 'doc_2', object_id: 'obj_2', name: 'Doc 2' },
        ],
      });

      const result = await resolveBoardViewDoc(mocks.mockApiClient, 'board_1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Doc 1, Doc 2');
        expect(result.error).toContain('view_id');
        expect(result.error).toContain('board_1');
      }
    });

    it('wraps API/network failures with context instead of throwing', async () => {
      mocks.setError('request timed out');

      const result = await resolveBoardViewDoc(mocks.mockApiClient, 'board_1', 'view_1');

      expect(result).toEqual({
        ok: false,
        error: 'Failed to resolve the doc of board board_1 view view_1: request timed out',
      });
    });

    it('wraps a non-Error rejection with "Unknown error"', async () => {
      mocks.getMockRequest().mockRejectedValue('not an Error instance');

      const result = await resolveBoardViewDoc(mocks.mockApiClient, 'board_1');

      expect(result).toEqual({
        ok: false,
        error: 'Failed to resolve the doc of board board_1: Unknown error',
      });
    });
  });

  describe('noDocsFoundMessage', () => {
    it('mentions the view when a view_id is given', () => {
      expect(noDocsFoundMessage('board_1', 'view_1')).toContain('view view_1 on board board_1');
    });

    it('says the board has no doc views when no view_id is given', () => {
      expect(noDocsFoundMessage('board_1')).toBe('Board board_1 has no doc views.');
    });
  });
});
