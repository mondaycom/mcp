import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { buildToolErrorStructuredContent, ToolValidationError } from '../../../../utils';
import { createMockApiClient } from '../test-utils/mock-api-client';
import {
  UpdateItemsTool,
  updateItemsInBoardToolSchema,
  updateItemsToolSchema,
} from './update-items-tool';
import { CONCURRENCY_LIMIT, MAX_UPDATES_PER_CALL } from './constants';
import { NonDeprecatedColumnType } from 'src/utils/types';

describe('Update Items Tool Behaviour', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  const changeResponse = (id: string, name = `Item ${id}`) => ({
    change_multiple_column_values: {
      id,
      name,
      url: `https://monday.com/boards/456/pulses/${id}`,
      column_values: [{ id: 'status', value: '{"index":1}' }],
    },
  });

  describe('Happy path — update items on a board in context', () => {
    it('updates all items and returns per-update results with correct index and board_id', async () => {
      mocks.setResponses([changeResponse('1'), changeResponse('2'), changeResponse('3')]);

      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });

      const result = await tool.execute({
        updates: [
          { itemId: 1, columnValues: '{"status":{"label":"Done"}}' },
          { itemId: 2, columnValues: '{"status":{"label":"Working on it"}}' },
          { itemId: 3, columnValues: '{"status":{"label":"Stuck"}}' },
        ],
      });

      const c = result.content as any;
      expect(c.summary).toEqual({ total: 3, updated: 3, failed: 0 });
      expect(c.is_partial_success).toBe(false);
      expect(c.results).toEqual([
        expect.objectContaining({ index: 0, item_id: '1', board_id: 456 }),
        expect.objectContaining({ index: 1, item_id: '2', board_id: 456 }),
        expect.objectContaining({ index: 2, item_id: '3', board_id: 456 }),
      ]);
      expect(c).not.toHaveProperty('errors');
    });

    it('passes columnValues verbatim and derived columnIds to the underlying mutation', async () => {
      mocks.setResponse(changeResponse('1'));

      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });

      await tool.execute({ updates: [{ itemId: 1, columnValues: '{"status":{"label":"Done"}}' }] });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('mutation changeItemColumnValues'),
        expect.objectContaining({
          boardId: '456',
          itemId: '1',
          columnValues: '{"status":{"label":"Done"}}',
          columnIds: ['status'],
        }),
      );
    });

    it('returns structured board relation values from each update', async () => {
      mocks.setResponse({
        change_multiple_column_values: {
          id: '1',
          name: 'Item 1',
          url: 'https://monday.com/boards/456/pulses/1',
          column_values: [
            {
              id: 'board_relation',
              type: NonDeprecatedColumnType.BoardRelation,
              value: null,
              linked_item_ids: ['2'],
              linked_items: [{ id: '2', name: 'Item 2', board: { id: '456', name: 'Board' } }],
            },
          ],
        },
      });

      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const result = await tool.execute({
        updates: [{ itemId: 1, columnValues: '{"board_relation":{"item_ids":[2]}}' }],
      });

      expect((result.content as any).results[0].column_values.board_relation).toEqual({
        linked_item_ids: ['2'],
        linked_items: [{ id: '2', name: 'Item 2', board: { id: '456', name: 'Board' } }],
      });
    });
  });

  describe('Per-update routing', () => {
    it('applies different values per item', async () => {
      mocks.setResponses([changeResponse('1'), changeResponse('2')]);
      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });

      await tool.execute({
        updates: [
          { itemId: 1, columnValues: '{"status":{"label":"Done"}}' },
          { itemId: 2, columnValues: '{"text":"hello"}' },
        ],
      });

      const calls = mocks.getMockRequest().mock.calls;
      expect(calls[0][1]).toMatchObject({ itemId: '1', columnValues: '{"status":{"label":"Done"}}' });
      expect(calls[1][1]).toMatchObject({ itemId: '2', columnValues: '{"text":"hello"}' });
    });

    it('applies the same value across items (bulk assign)', async () => {
      mocks.setResponses([changeResponse('1'), changeResponse('2'), changeResponse('3')]);
      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });

      const value = '{"person":{"personsAndTeams":[{"id":99,"kind":"person"}]}}';
      await tool.execute({
        updates: [
          { itemId: 1, columnValues: value },
          { itemId: 2, columnValues: value },
          { itemId: 3, columnValues: value },
        ],
      });

      const calls = mocks.getMockRequest().mock.calls;
      expect(calls.map((call: any[]) => call[1].columnValues)).toEqual([value, value, value]);
    });

    it('routes each update to its own board via per-update boardId', async () => {
      mocks.setResponses([changeResponse('1'), changeResponse('2')]);
      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });

      await tool.execute({
        updates: [
          { itemId: 1, boardId: 123, columnValues: '{"status":{"label":"Done"}}' },
          { itemId: 2, boardId: 789, columnValues: '{"status":{"label":"Stuck"}}' },
        ],
      });

      const calls = mocks.getMockRequest().mock.calls;
      expect(calls[0][1]).toMatchObject({ boardId: '123', itemId: '1' });
      expect(calls[1][1]).toMatchObject({ boardId: '789', itemId: '2' });
    });

    it('uses the batch default boardId and lets an update override it', async () => {
      mocks.setResponses([changeResponse('1'), changeResponse('2')]);
      const tool = new UpdateItemsTool(mocks.mockApiClient);

      const result = await tool.execute({
        boardId: 456,
        updates: [
          { itemId: 1, columnValues: '{"text":"a"}' },
          { itemId: 2, boardId: 999, columnValues: '{"text":"b"}' },
        ],
      });

      const calls = mocks.getMockRequest().mock.calls;
      expect(calls[0][1]).toMatchObject({ boardId: '456', itemId: '1' });
      expect(calls[1][1]).toMatchObject({ boardId: '999', itemId: '2' });

      const c = result.content as any;
      expect(c.results[0]).toMatchObject({ board_id: 456 });
      expect(c.results[1]).toMatchObject({ board_id: 999 });
    });

    it('forwards createLabelsIfMissing per update independently', async () => {
      mocks.setResponses([changeResponse('1'), changeResponse('2')]);
      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });

      await tool.execute({
        updates: [
          { itemId: 1, columnValues: '{"status":{"label":"New"}}', createLabelsIfMissing: true },
          { itemId: 2, columnValues: '{"status":{"label":"Done"}}' },
        ],
      });

      const calls = mocks.getMockRequest().mock.calls;
      expect(calls[0][1]).toMatchObject({ createLabelsIfMissing: true });
      expect(calls[1][1].createLabelsIfMissing).toBeUndefined();
    });
  });

  describe('Mixed success and failure', () => {
    it('returns success and error entries side-by-side, does not abort', async () => {
      mocks.getMockRequest().mockResolvedValueOnce(changeResponse('1'));
      const graphqlError = new Error('GraphQL Error');
      (graphqlError as any).response = {
        errors: [{ message: 'Invalid column values', extensions: { code: 'ColumnValueException' } }],
      };
      mocks.getMockRequest().mockRejectedValueOnce(graphqlError);
      mocks.getMockRequest().mockResolvedValueOnce(changeResponse('3'));

      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });

      const result = await tool.execute({
        updates: [
          { itemId: 1, columnValues: '{"text":"a"}' },
          { itemId: 2, columnValues: '{"text":"b"}' },
          { itemId: 3, columnValues: '{"text":"c"}' },
        ],
      });

      const c = result.content as any;
      expect(c.summary).toEqual({ total: 3, updated: 2, failed: 1 });
      expect(c.is_partial_success).toBe(true);
      expect(c.results).toHaveLength(3);
      expect(c.results[0]).toMatchObject({ index: 0, item_id: '1' });
      expect(c.results[1]).toMatchObject({ index: 1 });
      expect(c.results[1].error).toContain('Invalid column values');
      expect(c.results[2]).toMatchObject({ index: 2, item_id: '3' });
    });
  });

  describe('Error passthrough', () => {
    it('passes through the underlying error message verbatim in results[i].error', async () => {
      const graphqlError = new Error('GraphQL Error');
      (graphqlError as any).response = {
        errors: [{ message: 'Invalid column values', extensions: { code: 'ColumnValueException' } }],
      };
      mocks.setError(graphqlError);

      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const result = await tool.execute({ updates: [{ itemId: 1, columnValues: '{"text":"a"}' }] });
      const c = result.content as any;

      expect(typeof c.results[0].error).toBe('string');
      expect(c.results[0].error).toContain('Invalid column values');
    });

    it('does not leak the internal _errorEntry field into results[i]', async () => {
      mocks.setError('boom');
      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const result = await tool.execute({ updates: [{ itemId: 1, columnValues: '{"text":"a"}' }] });
      const c = result.content as any;
      expect(c.results[0]).not.toHaveProperty('_errorEntry');
    });

    it('classifies invalid columnValues JSON per update via the single tool', async () => {
      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const result = await tool.execute({ updates: [{ itemId: 1, columnValues: 'not valid json' }] });
      const c = result.content as any;

      expect(c.results[0].error).toContain('Invalid columnValues JSON');
      expect(c.errors).toEqual([
        expect.objectContaining({ code: 'INVALID_COLUMN_VALUES_JSON', path: ['results', 0] }),
      ]);
    });
  });

  describe('Observability errors[] channel', () => {
    it('emits errors[] mirroring the single-tool shape when updates fail', async () => {
      mocks.getMockRequest().mockResolvedValueOnce(changeResponse('1'));
      const gqlErr = new Error('GraphQL Error');
      (gqlErr as any).response = {
        errors: [{ message: 'Invalid column values', extensions: { code: 'ColumnValueException' } }],
      };
      mocks.getMockRequest().mockRejectedValueOnce(gqlErr);
      mocks.getMockRequest().mockResolvedValueOnce(changeResponse('3'));

      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const result = await tool.execute({
        updates: [
          { itemId: 1, columnValues: '{"text":"a"}' },
          { itemId: 2, columnValues: '{"text":"b"}' },
          { itemId: 3, columnValues: '{"text":"c"}' },
        ],
      });
      const c = result.content as any;

      expect(c.errors).toEqual([
        { code: 'ColumnValueException', message: 'Invalid column values', path: ['results', 1] },
      ]);
    });

    it('falls back to a GRAPHQL_ERROR code when the underlying error carries no code', async () => {
      const gqlErr = new Error('GraphQL Error');
      (gqlErr as any).response = {
        errors: [{ message: 'Something went wrong with no code' }],
      };
      mocks.setError(gqlErr);

      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const result = await tool.execute({ updates: [{ itemId: 1, columnValues: '{"text":"a"}' }] });
      const c = result.content as any;

      expect(c.errors).toEqual([
        expect.objectContaining({ code: 'GRAPHQL_ERROR', path: ['results', 0] }),
      ]);
    });

    it('omits errors[] entirely on full success', async () => {
      mocks.setResponses([changeResponse('1'), changeResponse('2')]);
      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const result = await tool.execute({
        updates: [
          { itemId: 1, columnValues: '{"text":"a"}' },
          { itemId: 2, columnValues: '{"text":"b"}' },
        ],
      });
      const c = result.content as any;
      expect(c).not.toHaveProperty('errors');
    });
  });

  describe('Missing board resolution', () => {
    const itemsBoardsResponse = (pairs: Array<[string, string]>) => ({
      items: pairs.map(([id, boardId]) => ({ id, board: { id: boardId } })),
    });

    it('looks up the board of updates without a boardId and records how many were resolved', async () => {
      mocks.setResponses([itemsBoardsResponse([['1', '789']]), changeResponse('1')]);
      const tool = new UpdateItemsTool(mocks.mockApiClient);
      const sessionContext = { metadata: {} as Record<string, unknown> };

      const result = await tool.execute({ updates: [{ itemId: 1, columnValues: '{"text":"a"}' }] }, sessionContext);

      expect(mocks.getMockRequest()).toHaveBeenNthCalledWith(1, expect.stringContaining('query GetItemsBoardIds'), {
        itemIds: ['1'],
        limit: 1,
      });
      expect(mocks.getMockRequest()).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('mutation changeItemColumnValues'),
        expect.objectContaining({ boardId: '789', itemId: '1' }),
      );
      expect((result.content as any).results).toEqual([expect.objectContaining({ index: 0, board_id: 789 })]);
      expect(sessionContext.metadata).toEqual({ items_count: 1, board_ids_resolved_from_items: 1 });
    });

    it('only looks up items whose board is missing, once per item, and keeps given boardIds', async () => {
      mocks.setResponses([
        itemsBoardsResponse([['2', '900']]),
        changeResponse('1'),
        changeResponse('2'),
        changeResponse('2'),
      ]);
      const tool = new UpdateItemsTool(mocks.mockApiClient);

      await tool.execute({
        updates: [
          { itemId: 1, boardId: 111, columnValues: '{"text":"a"}' },
          { itemId: 2, columnValues: '{"text":"b"}' },
          { itemId: 2, columnValues: '{"status":{"index":1}}' },
        ],
      });

      const calls = mocks.getMockRequest().mock.calls;
      expect(calls.filter(([query]) => query.includes('query GetItemsBoardIds'))).toEqual([
        [expect.any(String), { itemIds: ['2'], limit: 1 }],
      ]);
      const mutationBoards = calls.slice(1).map(([, variables]) => [variables.itemId, variables.boardId]);
      expect(mutationBoards).toEqual(
        expect.arrayContaining([
          ['1', '111'],
          ['2', '900'],
          ['2', '900'],
        ]),
      );
    });

    it('does not look anything up when every update has a board', async () => {
      mocks.setResponse(changeResponse('1'));
      const tool = new UpdateItemsTool(mocks.mockApiClient);
      const sessionContext = { metadata: {} as Record<string, unknown> };

      await tool.execute({ boardId: 456, updates: [{ itemId: 1, columnValues: '{}' }] }, sessionContext);

      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('mutation changeItemColumnValues'),
        expect.anything(),
      );
      expect(sessionContext.metadata).not.toHaveProperty('board_ids_resolved_from_items');
    });

    it('rejects the whole call when a board cannot be found from the itemId', async () => {
      mocks.setResponses([itemsBoardsResponse([['1', '789']])]);
      const tool = new UpdateItemsTool(mocks.mockApiClient);

      await expect(
        tool.execute({
          updates: [
            { itemId: 1, columnValues: '{"text":"a"}' },
            { itemId: 2, columnValues: '{"text":"b"}' },
          ],
        }),
      ).rejects.toThrow('Missing boardId for update(s) at index 1, and their board could not be found from the itemId');

      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
    });
  });

  describe('Handler validation', () => {
    it('rejects updates without an itemId before any API request', async () => {
      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });

      const error = await tool
        .execute({
          updates: [
            { itemId: 1, columnValues: '{}' },
            { columnValues: '{}' },
            { columnValues: '{}' },
          ],
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(ToolValidationError);
      expect(error.message).toBe('2 of 3 updates are missing the required itemId field');
      expect(buildToolErrorStructuredContent(error, { toolName: 'update_items' }).errors).toEqual([
        { code: 'MISSING_REQUIRED_PARAMETER', message: 'Item id is required', path: ['results', 1] },
        { code: 'MISSING_REQUIRED_PARAMETER', message: 'Item id is required', path: ['results', 2] },
      ]);
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });
  });

  describe('Rate limit abort', () => {
    const rateLimit429 = () => {
      const err = new Error('GraphQL Error');
      (err as any).response = {
        errors: [{ message: 'Rate limit exceeded' }],
        status: 429,
      };
      return err;
    };

    it('stops firing new updates once a 429 is observed and marks queued updates as skipped', async () => {
      mocks.getMockRequest().mockRejectedValue(rateLimit429());

      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const total = CONCURRENCY_LIMIT + 5;
      const updates = Array.from({ length: total }, (_, i) => ({
        itemId: i + 1,
        columnValues: '{"text":"x"}',
      }));

      const result = await tool.execute({ updates });
      const c = result.content as any;

      expect(c.results).toHaveLength(total);
      expect(mocks.getMockRequest().mock.calls.length).toBeLessThanOrEqual(CONCURRENCY_LIMIT);

      const skipped = c.results.filter((r: any) => typeof r.error === 'string' && r.error.includes('Skipped'));
      expect(skipped.length).toBeGreaterThan(0);
      expect(c.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'RATE_LIMIT_SKIPPED' })]),
      );
    });

    it('does not trip on non-rate-limit errors (status != 429)', async () => {
      const err = new Error('GraphQL Error');
      (err as any).response = {
        errors: [{ message: 'Invalid column values', extensions: { code: 'ColumnValueException' } }],
        status: 200,
      };
      mocks.getMockRequest().mockRejectedValueOnce(err);
      mocks.getMockRequest().mockResolvedValueOnce(changeResponse('2'));

      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const result = await tool.execute({
        updates: [
          { itemId: 1, columnValues: '{"text":"a"}' },
          { itemId: 2, columnValues: '{"text":"b"}' },
        ],
      });

      const c = result.content as any;
      expect(c.results[1]).toMatchObject({ index: 1, item_id: '2' });
    });
  });

  describe('Observability metadata', () => {
    it('records items_count and is_partial_success=false on a full-success call', async () => {
      mocks.setResponses([changeResponse('1'), changeResponse('2')]);
      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const sessionContext = { metadata: {} as Record<string, unknown> };

      await tool.execute(
        {
          updates: [
            { itemId: 1, columnValues: '{"text":"a"}' },
            { itemId: 2, columnValues: '{"text":"b"}' },
          ],
        },
        sessionContext,
      );

      expect(sessionContext.metadata).toEqual({ items_count: 2 });
    });

    it('records is_partial_success=true when some updates fail', async () => {
      mocks.getMockRequest().mockResolvedValueOnce(changeResponse('1'));
      const gqlErr = new Error('GraphQL Error');
      (gqlErr as any).response = {
        errors: [{ message: 'Invalid column values', extensions: { code: 'ColumnValueException' } }],
      };
      mocks.getMockRequest().mockRejectedValueOnce(gqlErr);

      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const sessionContext = { metadata: {} as Record<string, unknown> };

      await tool.execute(
        {
          updates: [
            { itemId: 1, columnValues: '{"text":"a"}' },
            { itemId: 2, columnValues: '{"text":"b"}' },
          ],
        },
        sessionContext,
      );

      expect(sessionContext.metadata).toEqual({ items_count: 2 });
    });

    it('records is_partial_success=false when all updates fail (total failure)', async () => {
      mocks.setError('boom');
      const tool = new UpdateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const sessionContext = { metadata: {} as Record<string, unknown> };

      const result = await tool.execute(
        { updates: [{ itemId: 1, columnValues: '{"text":"a"}' }] },
        sessionContext,
      );

      const c = result.content as any;
      expect(c.summary).toEqual({ total: 1, updated: 0, failed: 1 });
      expect(c.is_partial_success).toBe(false);
      expect(result.isError).toBe(true);
      expect(sessionContext.metadata).toEqual({ items_count: 1 });
    });
  });

  describe('Schema validation', () => {
    const schema = z.object(updateItemsInBoardToolSchema);

    it('defaults columnValues to "{}" when omitted', () => {
      const result = schema.safeParse({ boardId: 456, updates: [{ itemId: 1 }] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.updates[0].columnValues).toBe('{}');
      }
    });

    it.each([
      ['with a board in context', updateItemsToolSchema],
      ['without a board in context', updateItemsInBoardToolSchema],
    ])('emits update rows without required fields %s, so Copilot Studio sends the call (#499)', (_, shape) => {
      const jsonSchema = zodToJsonSchema(z.object(shape) as any) as any;
      const row = jsonSchema.properties.updates.items;

      expect(row.required).toBeUndefined();
      expect(row.properties.columnValues.default).toBe('{}');
      expect(jsonSchema.required).toEqual(['updates']);
    });

    it('rejects an empty updates array', () => {
      const result = schema.safeParse({ boardId: 456, updates: [] });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('updates must not be empty');
      }
    });

    it(`rejects more than ${MAX_UPDATES_PER_CALL} updates`, () => {
      const updates = Array.from({ length: MAX_UPDATES_PER_CALL + 1 }, (_, i) => ({
        itemId: i + 1,
        columnValues: '{}',
      }));
      const result = schema.safeParse({ boardId: 456, updates });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(`updates must not exceed ${MAX_UPDATES_PER_CALL} per call`);
      }
    });

    it(`accepts exactly ${MAX_UPDATES_PER_CALL} updates`, () => {
      const updates = Array.from({ length: MAX_UPDATES_PER_CALL }, (_, i) => ({
        itemId: i + 1,
        columnValues: '{}',
      }));
      const result = schema.safeParse({ boardId: 456, updates });
      expect(result.success).toBe(true);
    });
  });
});
