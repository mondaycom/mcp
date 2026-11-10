import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { buildToolErrorStructuredContent, ToolValidationError } from '../../../../utils';
import { createMockApiClient } from '../test-utils/mock-api-client';
import { CreateItemsTool, createItemsInBoardToolSchema } from './create-items-tool';
import {
  BATCH_CREATE_ITEMS_FLAG,
  BATCH_MAX_ITEMS_PER_CALL,
  CONCURRENCY_LIMIT,
  MAX_ITEMS_PER_CALL,
  PER_PARENT_CONCURRENCY_LIMIT,
} from './constants';

function mockFetchResponse({
  ok = true,
  status = 200,
  body = {},
  retryAfter,
}: {
  ok?: boolean;
  status?: number;
  body?: unknown;
  retryAfter?: string;
} = {}): Response {
  return {
    ok,
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'retry-after' ? (retryAfter ?? null) : null),
    },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

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

  const columnValueError = (message: string, errorData: Record<string, unknown>) =>
    Object.assign(new Error('GraphQL Error'), {
      response: {
        errors: [
          {
            message,
            extensions: {
              code: 'ColumnValueException',
              status_code: 200,
              error_data: errorData,
            },
          },
        ],
        status: 200,
      },
    });

  const fieldLimitError = (itemId: number) =>
    Object.assign(new Error('Item link max locks exceeded'), {
      response: {
        errors: [
          {
            message: 'Item link max locks exceeded',
            extensions: {
              code: 'FIELD_LIMIT_EXCEEDED',
              status_code: 429,
              retry_in_seconds: 10,
              error_data: {
                item_id: itemId,
                column_validation_error_code: 'itemLinkMaxLocksExceeded',
              },
            },
          },
        ],
        status: 429,
      },
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
      expect(c.is_partial_success).toBe(false);
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
      expect(c.is_partial_success).toBe(true);
      expect(result.isError).toBeUndefined();
      expect(c.results).toHaveLength(3);
      expect(c.results[0]).toMatchObject({ index: 0, item_id: '1' });
      expect(c.results[1]).toMatchObject({ index: 1 });
      expect(c.results[1].error).toContain('Invalid column values');
      expect(c.results[2]).toMatchObject({ index: 2, item_id: '3' });
    });
  });

  describe('Batch endpoint', () => {
    const createBatchTool = (
      mondayFetch: jest.Mock,
      flagEnabled = true,
      slugRequest = jest.fn().mockResolvedValue({ me: { account: { slug: 'acme' } } }),
    ) => {
      const flagChecker = jest.fn().mockReturnValue(flagEnabled);
      const apiClient = {
        request: (query: string, variables?: unknown) =>
          query.includes('query getAccountSlug') ? slugRequest(query) : mocks.mockApiClient.request(query, variables),
      } as any;
      const tool = new CreateItemsTool(apiClient, 'signed-token', {
        boardId: 456,
        deps: { flagChecker },
        fetchConfig: { fetch: mondayFetch },
      });
      return { tool, flagChecker, slugRequest };
    };

    it('uses one batch request for compatible regular items when the flag is enabled', async () => {
      const mondayFetch = jest.fn().mockResolvedValue(
        mockFetchResponse({
          body: {
            createdItems: [
              { serialNo: 0, itemId: 11 },
              { serialNo: 1, itemId: 12 },
            ],
            failedItems: [],
            invalidItems: [],
          },
        }),
      );
      const { tool, flagChecker } = createBatchTool(mondayFetch);

      const result = await tool.execute({
        items: [
          { name: 'A', groupId: 'topics', columnValues: '{"text":"a"}' },
          { name: 'B', groupId: 'topics', columnValues: '{"text":"b"}' },
        ],
      });

      expect(flagChecker).toHaveBeenCalledWith(BATCH_CREATE_ITEMS_FLAG);
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      expect(mondayFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceName: 'mdb-data',
          path: '/internal/create-items',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(JSON.parse(mondayFetch.mock.calls[0][0].body)).toEqual({
        boardId: 456,
        groupId: 'topics',
        items: [
          { name: 'A', columnValues: { text: 'a' } },
          { name: 'B', columnValues: { text: 'b' } },
        ],
      });
      expect(result.content).toMatchObject({
        board_id: 456,
        summary: { total: 2, created: 2, failed: 0 },
        results: [
          {
            index: 0,
            item_id: '11',
            item_name: 'A',
            item_url: 'https://acme.monday.com/boards/456/pulses/11',
            board_id: 456,
          },
          {
            index: 1,
            item_id: '12',
            item_name: 'B',
            item_url: 'https://acme.monday.com/boards/456/pulses/12',
            board_id: 456,
          },
        ],
      });
    });

    it('omits item_url when the account slug cannot be read', async () => {
      const mondayFetch = jest
        .fn()
        .mockResolvedValue(mockFetchResponse({ body: { createdItems: [{ serialNo: 0, itemId: 11 }] } }));
      const { tool } = createBatchTool(mondayFetch, true, jest.fn().mockRejectedValue(new Error('no access')));

      const result = await tool.execute({ items: [{ name: 'A', columnValues: '{}' }] });

      const [created] = (result.content as any).results;
      expect(created).toMatchObject({ index: 0, item_id: '11', board_id: 456 });
      expect(created).not.toHaveProperty('item_url');
    });

    it('sends an empty groupId so the server uses the top group when no item sets one', async () => {
      const mondayFetch = jest
        .fn()
        .mockResolvedValue(mockFetchResponse({ body: { createdItems: [{ serialNo: 0, itemId: 11 }] } }));
      const { tool } = createBatchTool(mondayFetch);

      await tool.execute({ items: [{ name: 'A', columnValues: '{}' }] });

      expect(JSON.parse(mondayFetch.mock.calls[0][0].body)).toEqual({
        boardId: 456,
        groupId: '',
        items: [{ name: 'A', columnValues: {} }],
      });
    });

    it.each([
      { name: 'a fetch error', mondayFetch: () => jest.fn().mockRejectedValue(new Error('socket hang up')) },
      {
        name: 'a non-JSON success body',
        mondayFetch: () =>
          jest.fn().mockResolvedValue({
            ...mockFetchResponse(),
            json: async () => {
              throw new SyntaxError('Unexpected token');
            },
          }),
      },
    ])('reports an unknown outcome without falling back after $name', async ({ mondayFetch }) => {
      const fetchMock = mondayFetch();
      const { tool } = createBatchTool(fetchMock);

      const result = await tool.execute({
        items: [
          { name: 'A', columnValues: '{}' },
          { name: 'B', columnValues: '{}' },
        ],
      });

      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect((result.content as any).errors).toEqual([
        expect.objectContaining({ code: 'BATCH_OUTCOME_UNKNOWN', path: ['results', 0] }),
        expect.objectContaining({ code: 'BATCH_OUTCOME_UNKNOWN', path: ['results', 1] }),
      ]);
    });

    it('retries invalid items through GraphQL and keeps failed items as batch errors', async () => {
      mocks.setResponses([itemResponse('21', 'B')]);
      const mondayFetch = jest.fn().mockResolvedValue(
        mockFetchResponse({
          body: {
            createdItems: [{ serialNo: 0, itemId: 11 }],
            invalidItems: [{ serialNo: 1, errors: [{ message: 'Unknown label', type: 'COLUMN_VALUE_INVALID' }] }],
            failedItems: [{ serialNo: 2, reason: 'Temporary failure', code: 'TEMPORARY', retryAfter: 4 }],
          },
        }),
      );
      const { tool } = createBatchTool(mondayFetch);
      const sessionContext = { metadata: {} as Record<string, unknown> };

      const result = await tool.execute(
        {
          items: [
            { name: 'A', columnValues: '{}' },
            { name: 'B', columnValues: '{"date":"2024-01-01"}' },
            { name: 'C', columnValues: '{}' },
          ],
        },
        sessionContext,
      );

      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
      expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('mutation createItem'), {
        boardId: '456',
        itemName: 'B',
        columnValues: '{"date":"2024-01-01"}',
      });
      expect(result.isError).toBeUndefined();
      expect(result.content).toMatchObject({
        summary: { total: 3, created: 2, failed: 1 },
        is_partial_success: true,
        results: [
          { index: 0, item_id: '11' },
          { index: 1, item_id: '21' },
          { index: 2, error: 'Temporary failure' },
        ],
        errors: [{ code: 'TEMPORARY', retry_in_seconds: 4, message: 'Temporary failure', path: ['results', 2] }],
      });
      expect(sessionContext.metadata).toMatchObject({
        create_path: 'batch_with_graphql',
        batch_items_count: 3,
        graphql_items_count: 1,
        batch_invalid_retried_count: 1,
        batch_invalid_types: { COLUMN_VALUE_INVALID: 1 },
        batch_untranslated_reasons: {},
        batch_column_lookup: false,
      });
    });

    it('reports the GraphQL error when a retried invalid item also fails there', async () => {
      mocks.getMockRequest().mockRejectedValueOnce(columnValueError('Invalid date', {}));
      const mondayFetch = jest.fn().mockResolvedValue(
        mockFetchResponse({
          body: {
            createdItems: [{ serialNo: 0, itemId: 11 }],
            invalidItems: [{ serialNo: 1, errors: [{ message: 'Bad date', type: 'COLUMN_VALUE_INVALID' }] }],
          },
        }),
      );
      const { tool } = createBatchTool(mondayFetch);

      const result = await tool.execute({
        items: [
          { name: 'A', columnValues: '{}' },
          { name: 'B', columnValues: '{"date":"bad"}' },
        ],
      });

      expect(result.content).toMatchObject({
        summary: { total: 2, created: 1, failed: 1 },
        errors: [{ code: 'ColumnValueException', message: 'Invalid date', path: ['results', 1] }],
      });
    });

    it('translates label and linked-item formats before sending them to the batch endpoint', async () => {
      mocks.setResponses([
        {
          boards: [
            {
              columns: [
                {
                  id: 'status',
                  type: 'status',
                  settings: {
                    labels: [
                      { id: 0, label: 'Working on it', is_deactivated: false },
                      { id: 1, label: 'Done', is_deactivated: false },
                    ],
                  },
                },
                {
                  id: 'dropdown',
                  type: 'dropdown',
                  settings: {
                    labels: [
                      { id: 3, label: 'A', is_deactivated: false },
                      { id: 4, label: 'B', is_deactivated: false },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ]);
      const mondayFetch = jest
        .fn()
        .mockResolvedValue(mockFetchResponse({ body: { createdItems: [{ serialNo: 0, itemId: 11 }] } }));
      const { tool } = createBatchTool(mondayFetch);
      const sessionContext = { metadata: {} as Record<string, unknown> };

      await tool.execute(
        {
          items: [
            {
              name: 'A',
              columnValues: JSON.stringify({
                text: 'a',
                status: { label: 'Done' },
                dropdown: { labels: ['B', 'A'] },
                connect: { item_ids: [7, '8'] },
              }),
            },
          ],
        },
        sessionContext,
      );

      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
      expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('query getBatchCreateColumns'), {
        boardId: '456',
        columnIds: ['status', 'dropdown'],
      });
      expect(JSON.parse(mondayFetch.mock.calls[0][0].body).items).toEqual([
        {
          name: 'A',
          columnValues: {
            text: 'a',
            status: { index: 1 },
            dropdown: { ids: [4, 3] },
            connect: { linkedPulseIds: [{ linkedPulseId: 7 }, { linkedPulseId: 8 }] },
          },
        },
      ]);
      expect(sessionContext.metadata).toMatchObject({
        create_path: 'batch',
        batch_items_count: 1,
        graphql_items_count: 0,
        batch_column_lookup: true,
      });
    });

    it('sends items with labels the board does not have straight to GraphQL', async () => {
      mocks.setResponses([
        {
          boards: [
            {
              columns: [
                {
                  id: 'status',
                  type: 'status',
                  settings: {
                    labels: [
                      { id: 1, label: 'Done', is_deactivated: false },
                      { id: 2, label: 'Stuck', is_deactivated: true },
                    ],
                  },
                },
              ],
            },
          ],
        },
        itemResponse('22', 'B'),
      ]);
      const mondayFetch = jest
        .fn()
        .mockResolvedValue(mockFetchResponse({ body: { createdItems: [{ serialNo: 0, itemId: 11 }] } }));
      const { tool } = createBatchTool(mondayFetch);
      const sessionContext = { metadata: {} as Record<string, unknown> };

      const result = await tool.execute(
        {
          items: [
            { name: 'A', columnValues: '{"status":{"label":"Done"}}' },
            { name: 'B', columnValues: '{"status":{"label":"Stuck"}}' },
          ],
        },
        sessionContext,
      );

      expect(JSON.parse(mondayFetch.mock.calls[0][0].body).items).toEqual([
        { name: 'A', columnValues: { status: { index: 1 } } },
      ]);
      expect(mocks.getMockRequest()).toHaveBeenLastCalledWith(expect.stringContaining('mutation createItem'), {
        boardId: '456',
        itemName: 'B',
        columnValues: '{"status":{"label":"Stuck"}}',
      });
      expect(result.content).toMatchObject({
        summary: { total: 2, created: 2, failed: 0 },
        results: [
          { index: 0, item_id: '11' },
          { index: 1, item_id: '22' },
        ],
      });
      expect(sessionContext.metadata).toMatchObject({
        create_path: 'batch_with_graphql',
        batch_items_count: 1,
        graphql_items_count: 1,
        batch_untranslated_reasons: { status_label_not_found: 1 },
      });
    });

    it('skips the batch request when no item can be translated', async () => {
      mocks.setResponses([{ boards: [{ columns: [] }] }, itemResponse('1', 'A')]);
      const mondayFetch = jest.fn();
      const { tool } = createBatchTool(mondayFetch);
      const sessionContext = { metadata: {} as Record<string, unknown> };

      await tool.execute({ items: [{ name: 'A', columnValues: '{"status":{"label":"Done"}}' }] }, sessionContext);

      expect(mondayFetch).not.toHaveBeenCalled();
      expect(sessionContext.metadata).toMatchObject({
        create_path: 'graphql',
        batch_items_count: 0,
        graphql_items_count: 1,
        batch_column_lookup: true,
        batch_untranslated_reasons: { unsupported_label_value: 1 },
      });
    });

    it('falls back to GraphQL for the whole call when the column lookup fails', async () => {
      mocks.getMockRequest().mockRejectedValueOnce(new Error('lookup failed'));
      mocks.setResponses([itemResponse('1', 'A')]);
      const mondayFetch = jest.fn();
      const { tool } = createBatchTool(mondayFetch);
      const sessionContext = { metadata: {} as Record<string, unknown> };

      const result = await tool.execute(
        { items: [{ name: 'A', columnValues: '{"status":{"label":"Done"}}' }] },
        sessionContext,
      );

      expect(mondayFetch).not.toHaveBeenCalled();
      expect(result.content).toMatchObject({ summary: { total: 1, created: 1, failed: 0 } });
      expect(sessionContext.metadata).toMatchObject({
        create_path: 'graphql',
        batch_fallback_reason: 'column_lookup_failed',
      });
    });

    it.each([
      {
        name: 'the flag is disabled',
        flagEnabled: false,
        items: [
          { name: 'A', groupId: 'topics', columnValues: '{}' },
          { name: 'B', groupId: 'topics', columnValues: '{}' },
        ],
        metadata: { items_count: 2, create_path: 'graphql' },
      },
      {
        name: 'items use different groups',
        flagEnabled: true,
        items: [
          { name: 'A', groupId: 'one', columnValues: '{}' },
          { name: 'B', groupId: 'two', columnValues: '{}' },
        ],
        metadata: { items_count: 2, create_path: 'graphql', batch_fallback_reason: 'mixed_groups' },
      },
      {
        name: 'items are subitems',
        flagEnabled: true,
        items: [
          { name: 'A', parentItemId: 901, columnValues: '{}' },
          { name: 'B', parentItemId: 901, columnValues: '{}' },
        ],
        metadata: { items_count: 2, create_path: 'graphql', batch_fallback_reason: 'subitems' },
      },
      {
        name: 'an item creates labels',
        flagEnabled: true,
        items: [
          { name: 'A', groupId: 'topics', columnValues: '{}', createLabelsIfMissing: true },
          { name: 'B', groupId: 'topics', columnValues: '{}' },
        ],
        metadata: { items_count: 2, create_path: 'graphql', batch_fallback_reason: 'create_labels_if_missing' },
      },
    ])('keeps the GraphQL path when $name', async ({ flagEnabled, items, metadata }) => {
      mocks.setResponses([itemResponse('1', 'A'), itemResponse('2', 'B')]);
      const mondayFetch = jest.fn();
      const { tool } = createBatchTool(mondayFetch, flagEnabled);
      const sessionContext = { metadata: {} as Record<string, unknown> };

      await tool.execute({ items }, sessionContext);

      expect(mondayFetch).not.toHaveBeenCalled();
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);
      expect(sessionContext.metadata).toEqual(metadata);
    });

    it.each([401, 403, 404])('falls back to GraphQL when the endpoint answers %s', async (status) => {
      mocks.setResponses([itemResponse('1', 'A'), itemResponse('2', 'B')]);
      const mondayFetch = jest.fn().mockResolvedValue(mockFetchResponse({ ok: false, status }));
      const { tool } = createBatchTool(mondayFetch);
      const sessionContext: { metadata?: Record<string, unknown> } = {};

      const result = await tool.execute(
        {
          items: [
            { name: 'A', groupId: 'topics', columnValues: '{}' },
            { name: 'B', groupId: 'topics', columnValues: '{}' },
          ],
        },
        sessionContext,
      );

      expect(mondayFetch).toHaveBeenCalledTimes(1);
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);
      expect(result.content).toMatchObject({ summary: { total: 2, created: 2, failed: 0 } });
      expect(sessionContext.metadata).toMatchObject({
        create_path: 'graphql',
        batch_fallback_reason: 'endpoint_unavailable',
        batch_endpoint_status: status,
      });
    });

    it('returns Retry-After details without retrying a rejected batch', async () => {
      const mondayFetch = jest
        .fn()
        .mockResolvedValue(
          mockFetchResponse({ ok: false, status: 429, body: { message: 'Rate limit exceeded' }, retryAfter: '3' }),
        );
      const { tool } = createBatchTool(mondayFetch);

      const result = await tool.execute({
        items: [
          { name: 'A', groupId: 'topics', columnValues: '{}' },
          { name: 'B', groupId: 'topics', columnValues: '{}' },
        ],
      });

      expect(result.isError).toBe(true);
      expect(mondayFetch).toHaveBeenCalledTimes(1);
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      expect((result.content as any).errors).toEqual([
        expect.objectContaining({
          code: 'HTTP_429',
          status_code: 429,
          retry_in_seconds: 3,
          message: 'Batch create items request failed with HTTP 429: Rate limit exceeded',
        }),
        expect.objectContaining({ code: 'HTTP_429', status_code: 429, retry_in_seconds: 3 }),
      ]);
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

  describe('Subitem concurrency', () => {
    it('caps each parent independently while allowing different parents to run together', async () => {
      const activeByParent = new Map<string, number>();
      const peakByParent = new Map<string, number>();
      let active = 0;
      let peak = 0;

      mocks
        .getMockRequest()
        .mockImplementation(async (_query: unknown, variables: { parentItemId: string; itemName: string }) => {
          const parentActive = (activeByParent.get(variables.parentItemId) ?? 0) + 1;
          activeByParent.set(variables.parentItemId, parentActive);
          peakByParent.set(
            variables.parentItemId,
            Math.max(peakByParent.get(variables.parentItemId) ?? 0, parentActive),
          );
          active++;
          peak = Math.max(peak, active);

          await new Promise((resolve) => setTimeout(resolve, 5));

          active--;
          activeByParent.set(variables.parentItemId, parentActive - 1);
          return subitemResponse(variables.itemName, variables.itemName, variables.parentItemId);
        });

      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const items = Array.from({ length: 20 }, (_, index) => ({
        name: `subitem-${index}`,
        parentItemId: index < 10 ? 901 : 902,
        columnValues: '{}',
      }));

      const result = await tool.execute({ items });

      expect(peakByParent.get('901')).toBe(PER_PARENT_CONCURRENCY_LIMIT);
      expect(peakByParent.get('902')).toBe(PER_PARENT_CONCURRENCY_LIMIT);
      expect(peak).toBe(PER_PARENT_CONCURRENCY_LIMIT * 2);
      expect(result.content).toMatchObject({
        summary: { total: 20, created: 20, failed: 0 },
      });
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

      expect(result.isError).toBe(true);
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

    it('carries the code of a per-item ToolValidationError into errors[]', async () => {
      mocks.setResponse(itemResponse('1', 'A'));
      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const result = await tool.execute({
        items: [
          { name: 'A', groupId: 'topics', columnValues: '{}' },
          { name: 'B', parentItemId: 1, duplicateFromItemId: 2, columnValues: '{}' },
        ],
      });
      const c = result.content as any;

      expect(c.errors).toEqual([
        {
          code: 'INVALID_ARGUMENTS_COMBINATION',
          message:
            'Cannot specify both parentItemId and duplicateFromItemId. Please provide only one of these parameters.',
          path: ['results', 1],
        },
      ]);
    });

    it('adds retry guidance for the current parent subitems lock without changing error details', async () => {
      mocks.setError(columnValueError("failed to acquire lock on '901|subitems__1'", {}));

      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const result = await tool.execute({
        items: [{ name: 'A', parentItemId: 901, columnValues: '{}' }],
      });
      const content = result.content as {
        results: Array<{ error: string }>;
        errors: Array<Record<string, unknown>>;
      };

      expect(content.results[0].error).toContain(
        'An item-link update hit a temporary concurrency limit. Wait a few seconds, then retry only the failed items in one create_items call.',
      );
      expect(content.errors).toEqual([
        {
          code: 'ColumnValueException',
          status_code: 200,
          error_data: {},
          message: "failed to acquire lock on '901|subitems__1'",
          path: ['results', 0],
        },
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

  describe('Rate limit abort', () => {
    const rateLimit429 = () => {
      const err = new Error('GraphQL Error');
      (err as any).response = {
        errors: [{ message: 'Rate limit exceeded' }],
        status: 429,
      };
      return err;
    };

    it('stops firing new items once a 429 is observed and marks the queued items as skipped', async () => {
      mocks.getMockRequest().mockRejectedValue(rateLimit429());

      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const total = CONCURRENCY_LIMIT + 5;
      const items = Array.from({ length: total }, (_, i) => ({
        name: `item ${i}`,
        groupId: 'topics',
        columnValues: '{}',
      }));

      const result = await tool.execute({ items });
      const c = result.content as any;

      expect(c.results).toHaveLength(total);
      expect(mocks.getMockRequest().mock.calls.length).toBeLessThanOrEqual(CONCURRENCY_LIMIT);

      const skipped = c.results.filter((r: any) => typeof r.error === 'string' && r.error.includes('Skipped'));
      expect(skipped.length).toBeGreaterThan(0);
      expect(c.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'RATE_LIMIT_SKIPPED' })]));
    });

    it('handles FIELD_LIMIT_EXCEEDED through the standard 429 circuit and preserves retry data', async () => {
      mocks.getMockRequest().mockRejectedValue(fieldLimitError(901));

      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const total = PER_PARENT_CONCURRENCY_LIMIT + 1;
      const items = Array.from({ length: total }, (_, index) => ({
        name: `subitem-${index}`,
        parentItemId: 901,
        columnValues: '{}',
      }));

      const result = await tool.execute({ items });
      const content = result.content as {
        errors: Array<Record<string, unknown>>;
        results: Array<{ error: string }>;
      };

      expect(result.isError).toBe(true);
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(PER_PARENT_CONCURRENCY_LIMIT);
      expect(content.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'FIELD_LIMIT_EXCEEDED',
            status_code: 429,
            retry_in_seconds: 10,
            error_data: {
              item_id: 901,
              column_validation_error_code: 'itemLinkMaxLocksExceeded',
            },
          }),
          {
            code: 'RATE_LIMIT_SKIPPED',
            message: 'Skipped: a previous item hit a rate limit; this item was not attempted',
            path: ['results', PER_PARENT_CONCURRENCY_LIMIT],
          },
        ]),
      );
      expect(content.results[PER_PARENT_CONCURRENCY_LIMIT].error).toBe(
        'Skipped: a previous item hit a rate limit; this item was not attempted',
      );
    });

    it('mid-batch 429 causes queued tail items to be skipped while in-flight items still return their real results', async () => {
      const deferreds: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];
      const mockRequest = mocks.getMockRequest();
      mockRequest.mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            deferreds.push({ resolve, reject });
          }),
      );

      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const total = CONCURRENCY_LIMIT + 5;
      const items = Array.from({ length: total }, (_, i) => ({
        name: `item-${i}`,
        groupId: 'topics',
        columnValues: '{}',
      }));

      const resultPromise = tool.execute({ items });

      await new Promise((r) => setTimeout(r, 0));
      expect(deferreds.length).toBe(CONCURRENCY_LIMIT);

      const failedIndex = 5;
      deferreds[failedIndex].reject(rateLimit429());

      await new Promise((r) => setTimeout(r, 0));
      expect(deferreds.length).toBe(CONCURRENCY_LIMIT);

      for (let i = 0; i < CONCURRENCY_LIMIT; i++) {
        if (i === failedIndex) {
          continue;
        }
        deferreds[i].resolve({
          create_item: {
            id: `id-${i}`,
            name: `item-${i}`,
            url: `https://monday.com/boards/456/pulses/id-${i}`,
          },
        });
      }

      const result = await resultPromise;
      const c = result.content as any;

      expect(c.results).toHaveLength(total);
      const failedCount = c.results.filter((r: any) => r.error !== undefined).length;
      expect(failedCount).toBe(total - (CONCURRENCY_LIMIT - 1));

      for (let i = 0; i < CONCURRENCY_LIMIT; i++) {
        if (i === failedIndex) {
          continue;
        }
        expect(c.results[i]).toMatchObject({ index: i, item_id: `id-${i}` });
        expect(c.results[i].error).toBeUndefined();
      }

      expect(c.results[failedIndex]).toMatchObject({ index: failedIndex });
      expect(c.results[failedIndex].error).toContain('Rate limit');

      for (let i = CONCURRENCY_LIMIT; i < total; i++) {
        expect(c.results[i]).toMatchObject({ index: i });
        expect(c.results[i].error).toContain('Skipped');
      }

      expect(mockRequest.mock.calls.length).toBe(CONCURRENCY_LIMIT);
    });

    it('does not trip on non-rate-limit errors (status != 429)', async () => {
      const err = new Error('GraphQL Error');
      (err as any).response = {
        errors: [{ message: 'Invalid column values', extensions: { code: 'ColumnValueException' } }],
        status: 200,
      };
      mocks.getMockRequest().mockRejectedValueOnce(err);
      mocks.getMockRequest().mockResolvedValueOnce(itemResponse('2', 'B'));

      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const result = await tool.execute({
        items: [
          { name: 'A', groupId: 'topics', columnValues: '{}' },
          { name: 'B', groupId: 'topics', columnValues: '{}' },
        ],
      });

      const c = result.content as any;
      expect(c.results[1]).toMatchObject({ index: 1, item_id: '2' });
    });
  });

  describe('Observability metadata', () => {
    it('records items_count on sessionContext metadata', async () => {
      mocks.setResponses([itemResponse('1', 'A'), itemResponse('2', 'B'), itemResponse('3', 'C')]);
      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const sessionContext = { metadata: {} as Record<string, unknown> };

      await tool.execute(
        {
          items: [
            { name: 'A', groupId: 'topics', columnValues: '{}' },
            { name: 'B', groupId: 'topics', columnValues: '{}' },
            { name: 'C', groupId: 'topics', columnValues: '{}' },
          ],
        },
        sessionContext,
      );

      expect(sessionContext.metadata).toEqual({ items_count: 3, create_path: 'graphql' });
    });

    it('records items_count even when some items fail', async () => {
      mocks.getMockRequest().mockResolvedValueOnce(itemResponse('1', 'A'));
      const graphqlError = new Error('GraphQL Error');
      (graphqlError as any).response = {
        errors: [{ message: 'Invalid column values', extensions: { code: 'ColumnValueException' } }],
      };
      mocks.getMockRequest().mockRejectedValueOnce(graphqlError);

      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });
      const sessionContext = { metadata: {} as Record<string, unknown> };

      await tool.execute(
        {
          items: [
            { name: 'A', groupId: 'topics', columnValues: '{}' },
            { name: 'B', groupId: 'topics', columnValues: '{}' },
          ],
        },
        sessionContext,
      );

      expect(sessionContext.metadata).toEqual({ items_count: 2, create_path: 'graphql' });
    });
  });

  describe('Handler validation', () => {
    it('rejects items without a name before any API request', async () => {
      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });

      const error = await tool
        .execute({ items: [{ name: 'A', columnValues: '{}' }, { columnValues: '{}' }, { columnValues: '{}' }] })
        .catch((e) => e);

      expect(error).toBeInstanceOf(ToolValidationError);
      expect(error.message).toBe('2 of 3 items are missing the required name field');
      expect(buildToolErrorStructuredContent(error, { toolName: 'create_items' }).errors).toEqual([
        { code: 'MISSING_REQUIRED_PARAMETER', message: 'Item name is required', path: ['results', 1] },
        { code: 'MISSING_REQUIRED_PARAMETER', message: 'Item name is required', path: ['results', 2] },
      ]);
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });
  });

  describe('Description', () => {
    it('explains how to batch subitems by parent', () => {
      const tool = new CreateItemsTool(mocks.mockApiClient, { boardId: 456 });

      expect(tool.getDescription()).toContain(
        `Batch each parent's subitems into groups of up to ${MAX_ITEMS_PER_CALL}. Wait for one batch to finish before starting the next batch for that parent.`,
      );
    });
  });

  describe('Batch limit', () => {
    const buildItems = (count: number) =>
      Array.from({ length: count }, (_, i) => ({ name: `Item ${i}`, columnValues: '{}' }));

    it(`raises the limit to ${BATCH_MAX_ITEMS_PER_CALL} when the flag checker enables the batch endpoint`, () => {
      const tool = new CreateItemsTool(mocks.mockApiClient, { deps: { flagChecker: jest.fn().mockReturnValue(true) } });
      const schema = z.object(tool.getInputSchema());

      expect(tool.getDescription()).toContain(`Create up to ${BATCH_MAX_ITEMS_PER_CALL} new items`);
      expect(schema.safeParse({ boardId: 1, items: buildItems(BATCH_MAX_ITEMS_PER_CALL) }).success).toBe(true);
      expect(schema.safeParse({ boardId: 1, items: buildItems(BATCH_MAX_ITEMS_PER_CALL + 1) }).success).toBe(false);
    });

    it.each([
      { name: 'the flag is off', context: { deps: { flagChecker: jest.fn().mockReturnValue(false) } } },
      { name: 'no flag checker is passed', context: { fetchConfig: { fetch: jest.fn() } } },
    ])(`keeps the limit at ${MAX_ITEMS_PER_CALL} when $name`, ({ context }) => {
      const tool = new CreateItemsTool(mocks.mockApiClient, 'signed-token', context);
      const schema = z.object(tool.getInputSchema());

      expect(tool.getDescription()).toContain(`Create up to ${MAX_ITEMS_PER_CALL} new items`);
      expect(schema.safeParse({ boardId: 1, items: buildItems(MAX_ITEMS_PER_CALL + 1) }).success).toBe(false);
    });
  });

  describe('Schema validation', () => {
    const schema = z.object(createItemsInBoardToolSchema);

    it('defaults columnValues to "{}" when omitted', () => {
      const result = schema.safeParse({ boardId: 456, items: [{ name: 'A' }] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items[0].columnValues).toBe('{}');
      }
    });

    it('emits item rows without required fields, so Copilot Studio sends the call (#499)', () => {
      const jsonSchema = zodToJsonSchema(schema as any) as any;
      const row = jsonSchema.properties.items.items;

      expect(row.required).toBeUndefined();
      expect(row.properties.columnValues.default).toBe('{}');
      expect(jsonSchema.required).toEqual(['boardId', 'items']);
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
