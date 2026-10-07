import { z } from 'zod';
import { createMockApiClient } from '../test-utils/mock-api-client';
import { CreateUpdatesTool, createUpdatesToolSchema } from './create-updates-tool';
import { CONCURRENCY_LIMIT, MAX_UPDATES_PER_CALL } from './constants';

describe('Create Updates Tool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  const createResponse = (id: string, itemId: string) => ({
    create_update: {
      id,
      item_id: itemId,
      item: { name: `Item ${itemId}`, url: `https://monday.com/boards/1/pulses/${itemId}` },
    },
  });

  it('creates every update and returns per-entry results in input order', async () => {
    mocks.setResponses([createResponse('11', '1'), createResponse('22', '2')]);
    const tool = new CreateUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({
      updates: [
        { itemId: 1, body: 'First' },
        { itemId: 2, body: 'Second', mentionsList: '[{"id": "7", "type": "User"}]' },
      ],
    });

    const c = result.content as any;
    expect(c.summary).toEqual({ total: 2, created: 2, failed: 0 });
    expect(c.is_partial_success).toBe(false);
    expect(c.results).toEqual([
      expect.objectContaining({ index: 0, update_id: '11', item_id: 1 }),
      expect.objectContaining({ index: 1, update_id: '22', item_id: 2 }),
    ]);
    expect(c).not.toHaveProperty('errors');
    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('mutation createUpdate'),
      expect.objectContaining({ itemId: '2', body: 'Second', mentionsList: [{ id: '7', type: 'User' }] }),
    );
  });

  it('passes parentId through so entries can be replies', async () => {
    mocks.setResponse(createResponse('11', '1'));
    const tool = new CreateUpdatesTool(mocks.mockApiClient);

    await tool.execute({ updates: [{ itemId: 1, body: 'Reply', parentId: 99 }] });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('mutation createUpdate'),
      expect.objectContaining({ itemId: '1', parentId: '99' }),
    );
  });

  it('reports a partial success with the raw error and code of each failed entry', async () => {
    const err = Object.assign(new Error('GraphQL Error'), {
      response: {
        errors: [{ message: 'Item exceeded number of allowed updates', extensions: { code: 'MAX_UPDATES_REACHED' } }],
        status: 200,
      },
    });
    mocks.getMockRequest().mockResolvedValueOnce(createResponse('11', '1')).mockRejectedValueOnce(err);
    const tool = new CreateUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({
      updates: [
        { itemId: 1, body: 'ok' },
        { itemId: 2, body: 'fails' },
      ],
    });

    const c = result.content as any;
    expect(c.summary).toEqual({ total: 2, created: 1, failed: 1 });
    expect(c.is_partial_success).toBe(true);
    expect(c.results[1]).toMatchObject({
      index: 1,
      error: expect.stringContaining('Item exceeded number of allowed updates'),
    });
    expect(c.errors).toEqual([expect.objectContaining({ code: 'MAX_UPDATES_REACHED', path: ['results', 1] })]);
  });

  it('fails only the entry with an invalid mentionsList', async () => {
    mocks.setResponse(createResponse('11', '1'));
    const tool = new CreateUpdatesTool(mocks.mockApiClient);

    const result = await tool.execute({
      updates: [
        { itemId: 1, body: 'ok' },
        { itemId: 2, body: 'bad', mentionsList: 'not json' },
      ],
    });

    const c = result.content as any;
    expect(c.summary).toEqual({ total: 2, created: 1, failed: 1 });
    expect(c.results[1].error).toMatch(/Invalid mentionsList JSON format/);
    expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
  });

  it('stops firing new updates once a 429 is observed and marks queued updates as skipped', async () => {
    mocks
      .getMockRequest()
      .mockRejectedValue(
        Object.assign(new Error('GraphQL Error'), {
          response: { errors: [{ message: 'Rate limit exceeded' }], status: 429 },
        }),
      );
    const tool = new CreateUpdatesTool(mocks.mockApiClient);
    const total = CONCURRENCY_LIMIT + 5;

    const result = await tool.execute({
      updates: Array.from({ length: total }, (_, i) => ({ itemId: i + 1, body: 'x' })),
    });

    const c = result.content as any;
    expect(c.results).toHaveLength(total);
    expect(mocks.getMockRequest().mock.calls.length).toBeLessThanOrEqual(CONCURRENCY_LIMIT);
    expect(c.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'RATE_LIMIT_SKIPPED' })]));
  });

  it('rejects an empty or oversized batch', () => {
    const schema = z.object(createUpdatesToolSchema);
    expect(schema.safeParse({ updates: [] }).success).toBe(false);
    expect(
      schema.safeParse({
        updates: Array.from({ length: MAX_UPDATES_PER_CALL + 1 }, (_, i) => ({ itemId: i, body: 'x' })),
      }).success,
    ).toBe(false);
  });

  it('has the expected name and type', () => {
    const tool = new CreateUpdatesTool(mocks.mockApiClient);
    expect(tool.name).toBe('create_updates');
    expect(tool.type).toBe('write');
  });
});
