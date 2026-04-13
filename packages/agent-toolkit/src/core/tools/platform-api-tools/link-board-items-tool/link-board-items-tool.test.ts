import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameAsync, callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';

const TOOL_NAME = 'link_board_items';

const sourceWithItem = (id: string, extra: Record<string, unknown> = {}) => ({
  boardId: 111,
  linkColumnId: 'link_col',
  itemIds: [id],
  ...extra,
});

const sourceItemOnly = (id: string, extra: Record<string, unknown> = {}) => ({
  boardId: 111,
  itemIds: [id],
  ...extra,
});

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
        source: { boardId: 111, itemIds: [1] },
        target: { boardId: 222 },
      });
      expect(result.content[0].text).toContain('Exactly one of source.linkColumnId or target.linkColumnId must be provided.');
    });

    it('throws when both link column IDs are provided', async () => {
      const result = await callToolByNameRawAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col', itemIds: [1] },
        target: { boardId: 222, linkColumnId: 'link_col' },
      });
      expect(result.content[0].text).toContain('Exactly one of source.linkColumnId or target.linkColumnId must be provided.');
    });

    it('throws when exact mode has matchColumnIds on only one side', async () => {
      const result = await callToolByNameRawAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col', matchColumnIds: ['category_col'], itemIds: [1] },
        target: { boardId: 222 },
      });
      expect(result.content[0].text).toContain(
        'In exact mode, source.matchColumnIds and target.matchColumnIds must both be empty (item names) or both contain exactly one column id.',
      );
    });

    it('throws when exact mode has more than one matchColumnIds entry on a side', async () => {
      const result = await callToolByNameRawAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col', matchColumnIds: ['a', 'b'], itemIds: [1] },
        target: { boardId: 222, matchColumnIds: ['c'] },
      });
      expect(result.content[0].text).toContain('at most one entry in matchColumnIds');
    });
  });

  describe('name matching (empty matchColumnIds)', () => {
    it('matches by exact name equality (case-insensitive) and writes to source items', async () => {
      const sourceResponse = makeItemsPageResponse([{ id: 's1', name: 'Acme Corp', linkedItemIds: [] }]);
      const targetResponse = makeItemsPageResponse([
        { id: 't1', name: 'acme corp' },
        { id: 't2', name: 'GLOBEX' },
      ]);

      mocks.setResponses([sourceResponse, targetResponse, {}]);

      const result = await callToolByNameAsync(TOOL_NAME, {
        source: sourceWithItem('s1'),
        target: { boardId: 222 },
        dryRun: false,
      });

      expect(result.linkSide).toBe('source');
      expect(result.linked).toHaveLength(1);
      expect(result.linked[0].sourceItemId).toBe('s1');
      expect(result.linked[0].targetItemId).toBe('t1');
      expect(result.unmatched).toHaveLength(0);
    });

    it('returns unmatched when names do not match exactly', async () => {
      const sourceResponse = makeItemsPageResponse([{ id: 's1', name: 'Acme Corp Ltd' }]);
      const targetResponse = makeItemsPageResponse([{ id: 't1', name: 'Acme Corp' }]);

      mocks.setResponses([sourceResponse, targetResponse]);

      const result = await callToolByNameAsync(TOOL_NAME, {
        source: sourceWithItem('s1'),
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
        source: sourceWithItem('s1', { matchColumnIds: ['vendor_col'] }),
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
        source: sourceWithItem('s1', { matchColumnIds: ['vendor_col'] }),
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
        source: sourceWithItem('s1'),
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
        source: sourceWithItem('s1'),
        target: { boardId: 222 },
        dryRun: false,
      });
      expect(result.content[0].text).toMatch(/"Acme" \(id: t1\).*"Acme" \(id: t2\)/);
    });

    it('does not write any items when ambiguity is detected', async () => {
      const sourceResponse = makeItemsPageResponse([{ id: 's1', name: 'Acme' }]);
      const targetResponse = makeItemsPageResponse([
        { id: 't1', name: 'Acme' },
        { id: 't2', name: 'Acme' },
        { id: 't3', name: 'Globex' },
      ]);

      mocks.setResponses([sourceResponse, targetResponse]);

      const result = await callToolByNameRawAsync(TOOL_NAME, {
        source: sourceWithItem('s1'),
        target: { boardId: 222 },
        dryRun: false,
      });
      expect(result.content[0].text).toContain('Ambiguous matches found');

      // Only source + target fetch calls, no write call
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);
    });
  });

  describe('page limit enforcement', () => {
    it('throws when target board has more items than the page limit allows', async () => {
      let targetCalls = 0;
      mocks.mockRequest.mockImplementation((_q: unknown, vars: { boardId: string }) => {
        if (vars.boardId === '111') {
          return Promise.resolve(makeItemsPageResponse([{ id: 's0', name: 'S', linkedItemIds: [] }]));
        }
        if (vars.boardId === '222') {
          targetCalls += 1;
          if (targetCalls <= 10) {
            return Promise.resolve(
              makeItemsPageResponse(
                Array.from({ length: 200 }, (_, i) => ({
                  id: `t${targetCalls}-${i}`,
                  name: `T${targetCalls}-${i}`,
                })),
                `c${targetCalls}`,
              ),
            );
          }
        }
        return Promise.reject(new Error('unexpected mock request'));
      });

      const result = await callToolByNameRawAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col', itemIds: ['s0'] },
        target: { boardId: 222 },
        dryRun: false,
      });
      expect(result.content[0].text).toContain('more than');
    });
  });

  describe('target-side link column', () => {
    it('writes one match and merges the source id with existing linked ids on the target', async () => {
      const sourceResponse = makeItemsPageResponse([{ id: 's1', name: 'Invoice A' }]);
      const targetResponse = makeItemsPageResponse([
        { id: 't1', name: 'Invoice A', linkedItemIds: ['existing_id'] },
      ]);

      mocks.setResponses([sourceResponse, targetResponse, {}]);

      const result = await callToolByNameAsync(TOOL_NAME, {
        source: sourceItemOnly('s1'),
        target: { boardId: 222, linkColumnId: 'link_col' },
        dryRun: false,
      });

      expect(result.linkSide).toBe('target');
      expect(result.linked).toHaveLength(1);
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(3); // source + target fetch + 1 batch write
    });
  });

  describe('dry run', () => {
    it('returns matches without writing when dryRun is true', async () => {
      const sourceResponse = makeItemsPageResponse([{ id: 's1', name: 'Acme Corp', linkedItemIds: [] }]);
      const targetResponse = makeItemsPageResponse([{ id: 't1', name: 'Acme Corp' }]);

      mocks.setResponses([sourceResponse, targetResponse]);

      const result = await callToolByNameAsync(TOOL_NAME, {
        source: sourceWithItem('s1'),
        target: { boardId: 222 },
        dryRun: true,
      });

      expect(result.dryRun).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2); // no write call
    });
  });

  describe('itemIds', () => {
    it('sends ItemsQuery.ids on the first items fetch for that board', async () => {
      const sourceResponse = makeItemsPageResponse([{ id: 's1', name: 'Acme', linkedItemIds: [] }]);
      const targetResponse = makeItemsPageResponse([{ id: 't1', name: 'Acme' }]);

      mocks.setResponses([sourceResponse, targetResponse, {}]);

      await callToolByNameAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col', itemIds: ['s1'] },
        target: { boardId: 222, itemIds: ['t1'] },
        dryRun: false,
      });

      const [, sourceVars] = mocks.mockRequest.mock.calls[0];
      expect(sourceVars).toMatchObject({
        boardId: '111',
        queryParams: { ids: ['s1'] },
      });

      const [, targetVars] = mocks.mockRequest.mock.calls[1];
      expect(targetVars).toMatchObject({
        boardId: '222',
        queryParams: { ids: ['t1'] },
      });
    });

    it('rejects more than 100 target item ids (Zod)', async () => {
      const result = await callToolByNameRawAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col', itemIds: [1] },
        target: { boardId: 222, itemIds: Array.from({ length: 101 }, (_, i) => i) },
      });
      expect(result.content[0].text).toMatch(/Invalid arguments/i);
    });

    it('rejects more than one source item id', async () => {
      const result = await callToolByNameRawAsync(TOOL_NAME, {
        source: { boardId: 111, linkColumnId: 'link_col', itemIds: [1, 2] },
        target: { boardId: 222 },
      });
      expect(result.content[0].text).toContain('Exactly one id is required in source.itemIds.');
    });

    it('combines itemIds with filters in query_params', async () => {
      const sourceResponse = makeItemsPageResponse([{ id: 's1', name: 'Acme', linkedItemIds: [] }]);
      const targetResponse = makeItemsPageResponse([{ id: 't1', name: 'Acme' }]);
      mocks.setResponses([sourceResponse, targetResponse, {}]);

      await callToolByNameAsync(TOOL_NAME, {
        source: {
          boardId: 111,
          linkColumnId: 'link_col',
          itemIds: ['s1'],
          filters: [{ columnId: 'status', compareValue: 'Done', operator: 'any_of' }],
        },
        target: { boardId: 222 },
        dryRun: false,
      });

      const [, sourceVars] = mocks.mockRequest.mock.calls[0];
      expect(sourceVars.queryParams.ids).toEqual(['s1']);
      expect(sourceVars.queryParams.rules).toHaveLength(1);
      expect(sourceVars.queryParams.rules[0].column_id).toBe('status');
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
          itemIds: ['s2'],
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
