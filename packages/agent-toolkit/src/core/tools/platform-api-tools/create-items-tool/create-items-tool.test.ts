import { z } from 'zod';
import { createMockApiClient } from '../test-utils/mock-api-client';
import { CreateItemsTool, createItemsInBoardToolSchema } from './create-items-tool';
import { MAX_ITEMS_PER_CALL } from './constants';

describe('Create Items Tool Behaviour', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  const itemResponse = (id: string, name: string) => ({
    create_item: { id, name, url: `https://monday.com/boards/456/pulses/${id}` },
  });

  const subitemResponse = (id: string, name: string, parentId: string) => ({
    create_subitem: { id, name, url: `https://monday.com/boards/456/pulses/${id}`, parent_item: { id: parentId } },
  });

  const duplicateResponse = (id: string, name: string) => ({
    duplicate_item: { id, name, url: `https://monday.com/boards/456/pulses/${id}` },
  });

  const changeColumnValuesResponse = (id: string) => ({
    change_multiple_column_values: { id },
  });

  describe('Happy path — create items on a board', () => {
    it('creates all items and returns per-item results with correct index', async () => {
      mocks.setResponses([itemResponse('1', 'A'), itemResponse('2', 'B'), itemResponse('3', 'C')]);

      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });

      const result = await tool.execute({
        items: [
          { name: 'A', groupId: 'topics', columnValues: '{"text": "a"}' },
          { name: 'B', groupId: 'topics', columnValues: '{"text": "b"}' },
          { name: 'C', groupId: 'topics', columnValues: '{"text": "c"}' },
        ],
      });

      const c = result.content as any;
      expect(c.board_id).toBe(456);
      expect(c.summary).toEqual({ total: 3, created: 3, failed: 0 });
      expect(c.results).toEqual([
        expect.objectContaining({ index: 0, item_id: '1', item_name: 'A', board_id: 456 }),
        expect.objectContaining({ index: 1, item_id: '2', item_name: 'B', board_id: 456 }),
        expect.objectContaining({ index: 2, item_id: '3', item_name: 'C', board_id: 456 }),
      ]);
    });

    it('passes columnValues verbatim to the underlying mutation', async () => {
      mocks.setResponse(itemResponse('1', 'A'));

      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });

      await tool.execute({ items: [{ name: 'A', groupId: 'topics', columnValues: '{}' }] });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('mutation createItem'), {
        boardId: '456',
        itemName: 'A',
        groupId: 'topics',
        columnValues: '{}',
      });
    });

    it('passes no groupId when not provided on the item', async () => {
      mocks.setResponse(itemResponse('1', 'A'));

      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });

      await tool.execute({ items: [{ name: 'A', columnValues: '{}' }] });

      const call = mocks.getMockRequest().mock.calls[0];
      expect(call[1].groupId).toBeUndefined();
    });
  });

  describe('Mixed success and failure', () => {
    it('returns success and error entries side-by-side, does not abort', async () => {
      mocks.getMockRequest().mockResolvedValueOnce(itemResponse('1', 'A'));
      const graphqlError = new Error('GraphQL Error');
      (graphqlError as any).response = {
        errors: [{ message: 'Invalid column values', extensions: { code: 'ColumnValueException' } }],
      };
      mocks.getMockRequest().mockRejectedValueOnce(graphqlError);
      mocks.getMockRequest().mockResolvedValueOnce(itemResponse('3', 'C'));

      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });

      const result = await tool.execute({
        items: [
          { name: 'A', groupId: 'topics', columnValues: '{}' },
          { name: 'B', groupId: 'topics', columnValues: '{}' },
          { name: 'C', groupId: 'topics', columnValues: '{}' },
        ],
      });

      const c = result.content as any;
      expect(c.summary).toEqual({ total: 3, created: 2, failed: 1 });
      expect(c.results).toHaveLength(3);
      expect(c.results[0]).toMatchObject({ index: 0, item_id: '1' });
      expect(c.results[1]).toMatchObject({ index: 1 });
      expect(c.results[1].error).toContain('Invalid column values');
      expect(c.results[2]).toMatchObject({ index: 2, item_id: '3' });
    });
  });

  describe('Per-item routing', () => {
    it('routes each item to its own groupId', async () => {
      mocks.setResponses([itemResponse('1', 'A'), itemResponse('2', 'B')]);
      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });

      await tool.execute({
        items: [
          { name: 'A', groupId: 'group_alpha', columnValues: '{}' },
          { name: 'B', groupId: 'group_beta', columnValues: '{}' },
        ],
      });

      const calls = mocks.getMockRequest().mock.calls;
      expect(calls[0][1]).toMatchObject({ itemName: 'A', groupId: 'group_alpha' });
      expect(calls[1][1]).toMatchObject({ itemName: 'B', groupId: 'group_beta' });
    });

    it('routes each item to its own parentItemId (subitem path)', async () => {
      mocks.setResponses([subitemResponse('11', 'a', '901'), subitemResponse('12', 'b', '902')]);
      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });

      await tool.execute({
        items: [
          { name: 'a', parentItemId: 901, columnValues: '{}' },
          { name: 'b', parentItemId: 902, columnValues: '{}' },
        ],
      });

      const calls = mocks.getMockRequest().mock.calls;
      expect(calls[0][0]).toEqual(expect.stringContaining('mutation createSubitem'));
      expect(calls[0][1]).toMatchObject({ parentItemId: '901', itemName: 'a' });
      expect(calls[1][1]).toMatchObject({ parentItemId: '902', itemName: 'b' });
    });

    it('mixes fresh creates and subitems in one batch based on per-item parentItemId', async () => {
      mocks.setResponses([itemResponse('1', 'A'), subitemResponse('11', 'b', '999')]);
      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });

      await tool.execute({
        items: [
          { name: 'A', groupId: 'topics', columnValues: '{}' },
          { name: 'b', parentItemId: 999, columnValues: '{}' },
        ],
      });

      const calls = mocks.getMockRequest().mock.calls;
      expect(calls[0][0]).toEqual(expect.stringContaining('mutation createItem'));
      expect(calls[1][0]).toEqual(expect.stringContaining('mutation createSubitem'));
    });

    it('forwards createLabelsIfMissing per item independently', async () => {
      mocks.setResponses([itemResponse('1', 'A'), itemResponse('2', 'B')]);
      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });

      await tool.execute({
        items: [
          { name: 'A', groupId: 'topics', columnValues: '{}', createLabelsIfMissing: true },
          { name: 'B', groupId: 'topics', columnValues: '{}' },
        ],
      });

      const calls = mocks.getMockRequest().mock.calls;
      expect(calls[0][1]).toMatchObject({ createLabelsIfMissing: true });
      expect(calls[1][1].createLabelsIfMissing).toBeUndefined();
    });

    it('routes each item to duplicate + patch when duplicateFromItemId is set', async () => {
      mocks.setResponses([
        duplicateResponse('101', 'A copy'),
        duplicateResponse('102', 'B copy'),
        changeColumnValuesResponse('101'),
        changeColumnValuesResponse('102'),
      ]);
      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });

      await tool.execute({
        items: [
          { name: 'A copy', duplicateFromItemId: 42, columnValues: '{"text":"a"}' },
          { name: 'B copy', duplicateFromItemId: 43, columnValues: '{"text":"b"}' },
        ],
      });

      const allCalls = mocks.getMockRequest().mock.calls;
      const dupCalls = allCalls.filter((c: any[]) => String(c[0]).includes('duplicate_item'));
      expect(dupCalls).toHaveLength(2);
      expect(dupCalls.map((c: any[]) => c[1].itemId).sort()).toEqual(['42', '43']);
    });

    it('mixes fresh creates and duplicates in one batch', async () => {
      mocks.setResponses([
        itemResponse('1', 'Fresh'),
        duplicateResponse('101', 'Cloned'),
        changeColumnValuesResponse('101'),
      ]);
      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });

      await tool.execute({
        items: [
          { name: 'Fresh', groupId: 'topics', columnValues: '{}' },
          { name: 'Cloned', duplicateFromItemId: 42, columnValues: '{}' },
        ],
      });

      const allCalls = mocks.getMockRequest().mock.calls;
      expect(allCalls.some((c: any[]) => String(c[0]).includes('mutation createItem'))).toBe(true);
      expect(allCalls.some((c: any[]) => String(c[0]).includes('duplicate_item'))).toBe(true);
    });
  });

  describe('Error passthrough', () => {
    it('passes through the underlying error message verbatim in results[i].error', async () => {
      const graphqlError = new Error('GraphQL Error');
      (graphqlError as any).response = {
        errors: [{ message: 'Invalid column values', extensions: { code: 'ColumnValueException' } }],
      };
      mocks.setError(graphqlError);

      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });

      const result = await tool.execute({ items: [{ name: 'A', groupId: 'topics', columnValues: '{}' }] });
      const c = result.content as any;

      expect(typeof c.results[0].error).toBe('string');
      expect(c.results[0].error).toContain('Invalid column values');
    });

    it('does not leak the internal _errorEntry field into results[i]', async () => {
      mocks.setError('boom');
      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const result = await tool.execute({ items: [{ name: 'A', groupId: 'topics', columnValues: '{}' }] });
      const c = result.content as any;
      expect(c.results[0]).not.toHaveProperty('_errorEntry');
    });
  });

  describe('Observability errors[] channel', () => {
    it('emits errors[] mirroring the single-tool shape when items fail', async () => {
      mocks.getMockRequest().mockResolvedValueOnce(itemResponse('1', 'A'));
      const gqlErr = new Error('GraphQL Error');
      (gqlErr as any).response = {
        errors: [{ message: 'Invalid column values', extensions: { code: 'ColumnValueException' } }],
      };
      mocks.getMockRequest().mockRejectedValueOnce(gqlErr);
      mocks.getMockRequest().mockResolvedValueOnce(itemResponse('3', 'C'));

      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const result = await tool.execute({
        items: [
          { name: 'A', groupId: 'topics', columnValues: '{}' },
          { name: 'B', groupId: 'topics', columnValues: '{}' },
          { name: 'C', groupId: 'topics', columnValues: '{}' },
        ],
      });
      const c = result.content as any;

      expect(c.errors).toEqual([
        { code: 'ColumnValueException', message: 'Invalid column values', path: ['results', 1] },
      ]);
    });

    it('omits errors[] entirely on full success', async () => {
      mocks.setResponses([itemResponse('1', 'A'), itemResponse('2', 'B')]);
      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const result = await tool.execute({
        items: [
          { name: 'A', groupId: 'topics', columnValues: '{}' },
          { name: 'B', groupId: 'topics', columnValues: '{}' },
        ],
      });
      const c = result.content as any;
      expect(c).not.toHaveProperty('errors');
    });
  });

  describe('Schema validation', () => {
    const schema = z.object(createItemsInBoardToolSchema);

    it('rejects an item without columnValues', () => {
      const result = schema.safeParse({ boardId: 456, items: [{ name: 'A' }] });
      expect(result.success).toBe(false);
    });

    it('rejects an empty items array', () => {
      const result = schema.safeParse({ boardId: 456, items: [] });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('items must not be empty');
      }
    });

    it(`rejects more than ${MAX_ITEMS_PER_CALL} items`, () => {
      const items = Array.from({ length: MAX_ITEMS_PER_CALL + 1 }, (_, i) => ({
        name: `item ${i}`,
        columnValues: '{}',
      }));
      const result = schema.safeParse({ boardId: 456, items });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(`items must not exceed ${MAX_ITEMS_PER_CALL} per call`);
      }
    });

    it(`accepts exactly ${MAX_ITEMS_PER_CALL} items`, () => {
      const items = Array.from({ length: MAX_ITEMS_PER_CALL }, (_, i) => ({
        name: `item ${i}`,
        columnValues: '{}',
      }));
      const result = schema.safeParse({ boardId: 456, items });
      expect(result.success).toBe(true);
    });

    it('rejects an item with an empty name', () => {
      const result = schema.safeParse({ boardId: 456, items: [{ name: '', columnValues: '{}' }] });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Item name cannot be empty');
      }
    });

    it('rejects an item name over 255 characters', () => {
      const result = schema.safeParse({
        boardId: 456,
        items: [{ name: 'a'.repeat(256), columnValues: '{}' }],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Item name must be 255 characters or fewer');
      }
    });
  });
});
