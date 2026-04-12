import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameAsync, callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';

const TOOL_NAME = 'link_board_items';

const makeItemsPageResponse = (
  items: Array<{ id: string; name: string; columnValues?: Record<string, any>; linkedItemIds?: string[] }>,
  cursor?: string,
) => ({
  boards: [
    {
      id: '1',
      name: 'Test Board',
      items_page: {
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          column_values: [
            ...Object.entries(item.columnValues ?? {}).map(([id, val]) => ({
              id,
              type: 'text',
              text: val,
              value: JSON.stringify(val) as string | null,
              linked_item_ids: undefined as string[] | undefined,
            })),
            ...(item.linkedItemIds !== undefined
              ? [{ id: 'link_col', type: 'board_relation', text: '', value: null, linked_item_ids: item.linkedItemIds }]
              : []),
          ],
        })),
        cursor: cursor ?? null,
      },
    },
  ],
});

describe('LinkBoardItemsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  describe('validation', () => {
    it('throws when neither link column ID is provided', async () => {
      const result = await callToolByNameRawAsync(TOOL_NAME, {
        source: { boardId: 111 },
        target: { boardId: 222 },
      });
      expect(result.content[0].text).toContain('Exactly one of source.linkColumnId or target.linkColumnId must be provided.');
    });

    it('throws when both link column IDs are provided', async () => {
      const result = await callToolByNameRawAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col' },
        target: { boardId: 222, linkColumnId: 'link_col' },
      });
      expect(result.content[0].text).toContain('Exactly one of source.linkColumnId or target.linkColumnId must be provided.');
    });

    it('throws when exact mode has matchColumnIds on only one side', async () => {
      const result = await callToolByNameRawAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col', matchColumnIds: ['category_col'] },
        target: { boardId: 222 },
      });
      expect(result.content[0].text).toContain(
        'In exact mode, source.matchColumnIds and target.matchColumnIds must both be empty (item names) or both contain exactly one column id.',
      );
    });

    it('throws when exact mode has more than one matchColumnIds entry on a side', async () => {
      const result = await callToolByNameRawAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col', matchColumnIds: ['a', 'b'] },
        target: { boardId: 222, matchColumnIds: ['c'] },
      });
      expect(result.content[0].text).toContain('at most one entry in matchColumnIds');
    });
  });

  describe('name matching (empty matchColumnIds)', () => {
    it('matches by exact name equality (case-insensitive) and writes to source items', async () => {
      const sourceResponse = makeItemsPageResponse([
        { id: 's1', name: 'Acme Corp', linkedItemIds: [] },
        { id: 's2', name: 'Globex', linkedItemIds: [] },
      ]);
      const targetResponse = makeItemsPageResponse([
        { id: 't1', name: 'acme corp' },
        { id: 't2', name: 'GLOBEX' },
      ]);

      mocks.setResponses([sourceResponse, targetResponse, {}]);

      const result = await callToolByNameAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col' },
        target: { boardId: 222 },
        dryRun: false,
      });

      expect(result.linkSide).toBe('source');
      expect(result.linked).toHaveLength(2);
      expect(result.linked[0].sourceItemId).toBe('s1');
      expect(result.linked[0].targetItemId).toBe('t1');
      expect(result.unmatched).toHaveLength(0);
    });

    it('returns unmatched when names do not match exactly', async () => {
      const sourceResponse = makeItemsPageResponse([{ id: 's1', name: 'Acme Corp Ltd' }]);
      const targetResponse = makeItemsPageResponse([{ id: 't1', name: 'Acme Corp' }]);

      mocks.setResponses([sourceResponse, targetResponse]);

      const result = await callToolByNameAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col' },
        target: { boardId: 222 },
        dryRun: false,
      });

      expect(result.linked).toHaveLength(0);
      expect(result.unmatched).toHaveLength(1);
    });
  });

  describe('column value matching', () => {
    it('matches by exact column value equality', async () => {
      const sourceResponse = makeItemsPageResponse([
        { id: 's1', name: 'Invoice #001', columnValues: { vendor_col: 'Acme' }, linkedItemIds: [] },
      ]);
      const targetResponse = makeItemsPageResponse([
        { id: 't1', name: 'Acme Corporation', columnValues: { name_col: 'Acme' } },
      ]);

      mocks.setResponses([sourceResponse, targetResponse, {}]);

      const result = await callToolByNameAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col', matchColumnIds: ['vendor_col'] },
        target: { boardId: 222, matchColumnIds: ['name_col'] },
        dryRun: false,
      });

      expect(result.linked).toHaveLength(1);
      expect(result.linked[0].targetItemId).toBe('t1');
    });

    it('does not match when column values differ', async () => {
      const sourceResponse = makeItemsPageResponse([
        { id: 's1', name: 'Invoice #001', columnValues: { vendor_col: 'Acme' } },
      ]);
      const targetResponse = makeItemsPageResponse([
        { id: 't1', name: 'Globex', columnValues: { name_col: 'Globex' } },
      ]);

      mocks.setResponses([sourceResponse, targetResponse]);

      const result = await callToolByNameAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col', matchColumnIds: ['vendor_col'] },
        target: { boardId: 222, matchColumnIds: ['name_col'] },
        dryRun: false,
      });

      expect(result.linked).toHaveLength(0);
      expect(result.unmatched).toHaveLength(1);
    });
  });

  describe('ambiguous matches', () => {
    it('throws when a source item matches more than one target', async () => {
      const sourceResponse = makeItemsPageResponse([{ id: 's1', name: 'Acme' }]);
      const targetResponse = makeItemsPageResponse([
        { id: 't1', name: 'Acme' },
        { id: 't2', name: 'Acme' },
      ]);

      mocks.setResponses([sourceResponse, targetResponse]);

      const result = await callToolByNameRawAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col' },
        target: { boardId: 222 },
        dryRun: false,
      });
      expect(result.content[0].text).toContain('Ambiguous matches found');
    });

    it('includes the names of all conflicting targets in the error message', async () => {
      const sourceResponse = makeItemsPageResponse([{ id: 's1', name: 'Acme' }]);
      const targetResponse = makeItemsPageResponse([
        { id: 't1', name: 'Acme' },
        { id: 't2', name: 'Acme' },
      ]);

      mocks.setResponses([sourceResponse, targetResponse]);

      const result = await callToolByNameRawAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col' },
        target: { boardId: 222 },
        dryRun: false,
      });
      expect(result.content[0].text).toMatch(/"Acme" \(id: t1\).*"Acme" \(id: t2\)/);
    });

    it('does not write any items when ambiguity is detected', async () => {
      const sourceResponse = makeItemsPageResponse([
        { id: 's1', name: 'Acme' },
        { id: 's2', name: 'Globex' },
      ]);
      const targetResponse = makeItemsPageResponse([
        { id: 't1', name: 'Acme' },
        { id: 't2', name: 'Acme' }, // s1 is ambiguous
        { id: 't3', name: 'Globex' },
      ]);

      mocks.setResponses([sourceResponse, targetResponse]);

      const result = await callToolByNameRawAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col' },
        target: { boardId: 222 },
        dryRun: false,
      });
      expect(result.content[0].text).toContain('Ambiguous matches found');

      // Only source + target fetch calls, no write call
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);
    });
  });

  describe('page limit enforcement', () => {
    it('throws when board has more items than the page limit allows', async () => {
      // First page returns a cursor, indicating more items exist
      const page1 = makeItemsPageResponse(
        Array.from({ length: 200 }, (_, i) => ({ id: `s${i}`, name: `Item ${i}` })),
        'cursor_page2',
      );
      // Simulate 10 pages each with a next cursor, then throw should happen before page 11
      const subsequentPages = Array.from({ length: 9 }, (_, pageIndex) =>
        makeItemsPageResponse(
          Array.from({ length: 200 }, (_, i) => ({ id: `s${pageIndex * 200 + 200 + i}`, name: `Item ${pageIndex * 200 + 200 + i}` })),
          pageIndex < 8 ? `cursor_page${pageIndex + 3}` : 'cursor_page11', // last one still has cursor
        ),
      );
      const emptyTarget = makeItemsPageResponse([]);
      // Promise.all(source, target): first two responses are source page1 then target (one empty page).
      mocks.setResponses([page1, emptyTarget, ...subsequentPages]);

      const result = await callToolByNameRawAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col' },
        target: { boardId: 222 },
        dryRun: false,
      });
      expect(result.content[0].text).toContain('more than');
    });
  });

  describe('target-side link column', () => {
    it('groups multiple source matches per target and merges with existing IDs', async () => {
      const sourceResponse = makeItemsPageResponse([
        { id: 's1', name: 'Invoice A' },
        { id: 's2', name: 'Invoice A' },
      ]);
      const targetResponse = makeItemsPageResponse([
        { id: 't1', name: 'Invoice A', linkedItemIds: ['existing_id'] },
      ]);

      mocks.setResponses([sourceResponse, targetResponse, {}]);

      const result = await callToolByNameAsync(TOOL_NAME, {
        source: { boardId: 111 },
        target: { boardId: 222, linkColumnId: 'link_col' },
        dryRun: false,
      });

      expect(result.linkSide).toBe('target');
      expect(result.linked).toHaveLength(2);
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(3); // source + target fetch + 1 batch write
    });
  });

  describe('dry run', () => {
    it('returns matches without writing when dryRun is true', async () => {
      const sourceResponse = makeItemsPageResponse([{ id: 's1', name: 'Acme Corp', linkedItemIds: [] }]);
      const targetResponse = makeItemsPageResponse([{ id: 't1', name: 'Acme Corp' }]);

      mocks.setResponses([sourceResponse, targetResponse]);

      const result = await callToolByNameAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col' },
        target: { boardId: 222 },
        dryRun: true,
      });

      expect(result.dryRun).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2); // no write call
    });
  });

  describe('is_empty filter (skip already-linked)', () => {
    it('only fetches items the API returns after server-side filtering', async () => {
      // API returns only the unlinked item — the is_empty filter is applied server-side
      const sourceResponse = makeItemsPageResponse([
        { id: 's2', name: 'Globex', linkedItemIds: [] },
      ]);
      const targetResponse = makeItemsPageResponse([
        { id: 't2', name: 'Globex' },
      ]);

      mocks.setResponses([sourceResponse, targetResponse, {}]);

      const result = await callToolByNameAsync(TOOL_NAME, {
        source: {
          boardId: 111,
          linkColumnId: 'link_col',
          filters: [{ columnId: 'link_col', compareValue: '', operator: 'is_empty' }],
        },
        target: { boardId: 222 },
        dryRun: false,
      });

      expect(result.linked).toHaveLength(1);
      expect(result.linked[0].sourceItemId).toBe('s2');
    });
  });
});
