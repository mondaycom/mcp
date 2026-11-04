import { ApiClient } from '@mondaydotcomorg/api';
import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations, MondayApiToolContext } from '../base-monday-api-tool';
import { CreateItemTool } from '../create-item-tool/create-item-tool';
import { COLUMN_VALUES_FORMAT_GUIDE, unwrapDoubleEncodedColumnValues } from '../column-values.utils';
import { resolveMondayFetch } from '../ai-agent.utils';
import { GetBatchCreateColumnsQuery } from '../../../../monday-graphql/generated/graphql/graphql';
import { getBatchCreateColumns } from './batch-create-columns.graphql';
import { adaptColumnValuesForBatch, BatchColumn, getColumnIdsNeedingLookup } from './batch-workarounds';
import { runWithRateLimitCircuit, ToolValidationError, MISSING_REQUIRED_PARAMETER_CODE } from '../../../../utils';
import {
  BATCH_CREATE_ITEMS_FLAG,
  BATCH_CREATE_ITEMS_PATH,
  BATCH_MAX_ITEMS_PER_CALL,
  BATCH_CREATE_ITEMS_SERVICE_NAME,
  BATCH_CREATE_ITEMS_TIMEOUT_MS,
  MAX_ITEMS_PER_CALL,
  CONCURRENCY_LIMIT,
  PER_PARENT_CONCURRENCY_LIMIT,
  RATE_LIMIT_SKIPPED_CODE,
} from './constants';

type PerItemResult =
  | { index: number; error: string; _errorEntry: Record<string, unknown>; [k: string]: unknown }
  | { index: number; [k: string]: unknown };

type BatchCreateRequest = {
  boardId: number;
  groupId: string;
  items: Array<{ name: string; columnValues: Record<string, unknown> }>;
};

type BatchCreatedItem = {
  serialNo: number;
  itemId: string | number;
};

type BatchInvalidItem = {
  serialNo: number;
  errors?: Array<{ message?: string; type?: string }>;
};

type BatchFailedItem = {
  serialNo: number;
  reason?: string;
  code?: string;
  retryAfter?: number;
};

type BatchOutcome = {
  results: PerItemResult[];
  invalidIndexes: number[];
};

type BatchPlan = { request: BatchCreateRequest } | { fallbackReason: string };

type BatchCreateResponse = {
  createdItems?: BatchCreatedItem[];
  failedItems?: BatchFailedItem[];
  invalidItems?: BatchInvalidItem[];
};

const buildCreateItemsToolSchema = (maxItems: number) => ({
  items: z
    .array(
      z.object({
        name: z
          .string()
          .min(1, 'Item name cannot be empty')
          .max(255, 'Item name must be 255 characters or fewer')
          // Optional in the schema only: Copilot Studio never sends calls whose array rows have required fields (#499).
          .optional()
          .describe('Required. The name of the item to be created. 1-255 characters.'),
        columnValues: z
          .string()
          .default('{}')
          .describe(
            `Column values for this item, keyed by column id. Defaults to "{}" (no column values). ${COLUMN_VALUES_FORMAT_GUIDE}`,
          ),
        groupId: z
          .string()
          .optional()
          .describe(
            'The id of the group to add this item to. Ignored when parentItemId is set (subitems inherit their parent group). If neither is set, the board default group is used.',
          ),
        parentItemId: z
          .number()
          .optional()
          .describe(
            'If provided, this item is created as a subitem of this parent (uses create_subitem mutation) and groupId is ignored. Mutually exclusive with duplicateFromItemId.',
          ),
        duplicateFromItemId: z
          .number()
          .optional()
          .describe(
            'The id of an existing item to duplicate and then patch with this item name and columnValues. Use for bulk templating (e.g., duplicate a template item N times with different overrides). Mutually exclusive with parentItemId.',
          ),
        createLabelsIfMissing: z
          .boolean()
          .optional()
          .describe(
            "When true, missing status/dropdown labels referenced in this item's columnValues will be auto-created on the board instead of erroring with ColumnValueException. Requires permission to change board structure.",
          ),
      }),
    )
    .min(1, 'items must not be empty')
    .max(maxItems, `items must not exceed ${maxItems} per call`)
    .describe(
      `The items to create, up to ${maxItems} per call. Each item returns its own item_id and item_url on success, or a raw error message on failure. Each item independently chooses its groupId, parentItemId, and createLabelsIfMissing.`,
    ),
});

const buildCreateItemsInBoardToolSchema = (maxItems: number) => ({
  boardId: z.number().describe('The id of the board to which the new items will be added'),
  ...buildCreateItemsToolSchema(maxItems),
});

export const createItemsToolSchema = buildCreateItemsToolSchema(MAX_ITEMS_PER_CALL);
export const createItemsInBoardToolSchema = buildCreateItemsInBoardToolSchema(MAX_ITEMS_PER_CALL);
const batchCreateItemsToolSchema = buildCreateItemsToolSchema(BATCH_MAX_ITEMS_PER_CALL);
const batchCreateItemsInBoardToolSchema = buildCreateItemsInBoardToolSchema(BATCH_MAX_ITEMS_PER_CALL);

export type CreateItemsToolInput = typeof createItemsToolSchema | typeof createItemsInBoardToolSchema;

export class CreateItemsTool extends BaseMondayApiTool<CreateItemsToolInput> {
  name = 'create_items';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Multiple Items',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  private readonly apiToken?: string | (() => string);

  constructor(
    mondayApi: ApiClient | (() => ApiClient),
    apiTokenOrContext?: string | (() => string) | MondayApiToolContext,
    context?: MondayApiToolContext,
  ) {
    const hasApiToken = typeof apiTokenOrContext === 'string' || typeof apiTokenOrContext === 'function';
    super(mondayApi, hasApiToken ? context : apiTokenOrContext);
    this.apiToken = hasApiToken ? apiTokenOrContext : undefined;
  }

  getDescription(): string {
    const maxItems = this.getMaxItemsPerCall();
    return (
      `Create up to ${maxItems} new items in a single call. Each item is fully independent - it chooses its own groupId, parentItemId (for subitems), duplicateFromItemId (for bulk templating from an existing item), and createLabelsIfMissing. A single call can therefore span multiple groups, mix regular items with subitems under different parents, and mix fresh creates with duplicates of existing items. Each item returns its own item_id and item_url on success, or a raw error message on failure. ` +
      `Batch each parent's subitems into groups of up to ${maxItems}. Wait for one batch to finish before starting the next batch for that parent. ` +
      "[REQUIRED PRECONDITION]: Before using this tool, if new columns were added to the board or if you are not familiar with the board's structure (column IDs, column types, status labels, etc.), first use get_board_info with filters.columns.only to get column metadata without fetching views. This is essential for constructing proper column values and knowing which columns are available."
    );
  }

  getInputSchema(): CreateItemsToolInput {
    const isBatchCreateEnabled = this.isBatchCreateEnabled();
    if (this.context?.boardId) {
      return isBatchCreateEnabled ? batchCreateItemsToolSchema : createItemsToolSchema;
    }
    return isBatchCreateEnabled ? batchCreateItemsInBoardToolSchema : createItemsInBoardToolSchema;
  }

  private getMaxItemsPerCall(): number {
    return this.isBatchCreateEnabled() ? BATCH_MAX_ITEMS_PER_CALL : MAX_ITEMS_PER_CALL;
  }

  protected async executeInternal(input: ToolInputType<CreateItemsToolInput>): Promise<ToolOutputType<never>> {
    const missingNames = input.items.flatMap((item, index) =>
      item.name === undefined
        ? [extractErrorEntry(new ToolValidationError('Item name is required', MISSING_REQUIRED_PARAMETER_CODE), index)]
        : [],
    );
    if (missingNames.length) {
      throw new ToolValidationError(
        `${missingNames.length} of ${input.items.length} items are missing the required name field`,
        MISSING_REQUIRED_PARAMETER_CODE,
        missingNames,
      );
    }

    const boardId = this.context?.boardId ?? (input as ToolInputType<typeof createItemsInBoardToolSchema>).boardId;
    this.sessionContext.metadata ??= {};
    this.sessionContext.metadata.items_count = input.items.length;

    const raw =
      (await this.executeBatchCreate(input, boardId)) ??
      (await this.executeWithSingleItemCalls(
        input.items.map((item, index) => ({ item, index })),
        boardId,
      ));

    return buildCreateItemsResult(raw, boardId);
  }

  private async executeBatchCreate(
    input: ToolInputType<CreateItemsToolInput>,
    boardId: number,
  ): Promise<PerItemResult[] | undefined> {
    if (!this.isBatchCreateEnabled()) {
      return undefined;
    }
    const plan = getBatchPlan(input, boardId);
    if ('fallbackReason' in plan) {
      this.recordBatchMetadata({ create_path: 'graphql', batch_fallback_reason: plan.fallbackReason });
      return undefined;
    }
    return this.createWithBatchWorkarounds(input, plan.request);
  }

  private async createWithBatchWorkarounds(
    input: ToolInputType<CreateItemsToolInput>,
    request: BatchCreateRequest,
  ): Promise<PerItemResult[] | undefined> {
    const lookupColumnIds = getColumnIdsNeedingLookup(request.items);
    const columns = await this.fetchBatchColumns(request.boardId, lookupColumnIds);
    if (!columns) {
      this.recordBatchMetadata({ create_path: 'graphql', batch_fallback_reason: 'column_lookup_failed' });
      return undefined;
    }

    const batchItems: BatchCreateRequest['items'] = [];
    const batchIndexes: number[] = [];
    const untranslatedIndexes: number[] = [];
    const untranslatedReasons: Record<string, number> = {};
    request.items.forEach((item, index) => {
      const adapted = adaptColumnValuesForBatch(item.columnValues, columns);
      if ('fallbackReason' in adapted) {
        untranslatedIndexes.push(index);
        untranslatedReasons[adapted.fallbackReason] = (untranslatedReasons[adapted.fallbackReason] ?? 0) + 1;
        return;
      }
      batchItems.push({ ...item, columnValues: adapted.columnValues });
      batchIndexes.push(index);
    });

    let batchOutcome: BatchOutcome = { results: [], invalidIndexes: [] };
    let batchDurationMs = 0;
    if (batchItems.length) {
      const startedAt = Date.now();
      const outcome = await this.executeBatchRequest({ ...request, items: batchItems }, batchIndexes);
      batchDurationMs = Date.now() - startedAt;
      if (!outcome) {
        this.recordBatchMetadata({ create_path: 'graphql', batch_fallback_reason: 'endpoint_forbidden' });
        return undefined;
      }
      batchOutcome = outcome;
    }

    const graphqlIndexes = [...untranslatedIndexes, ...batchOutcome.invalidIndexes].sort((a, b) => a - b);
    const graphqlResults = graphqlIndexes.length
      ? await this.executeWithSingleItemCalls(
          graphqlIndexes.map((index) => ({ item: input.items[index], index })),
          request.boardId,
        )
      : [];

    this.recordBatchMetadata({
      create_path: graphqlIndexes.length ? (batchItems.length ? 'batch_with_graphql' : 'graphql') : 'batch',
      batch_items_count: batchItems.length,
      batch_duration_ms: batchDurationMs,
      batch_column_lookup: lookupColumnIds.length > 0,
      graphql_items_count: graphqlIndexes.length,
      batch_untranslated_reasons: untranslatedReasons,
      batch_invalid_retried_count: batchOutcome.invalidIndexes.length,
      batch_invalid_types: countInvalidTypes(batchOutcome),
    });

    return mergeResults(input.items.length, batchOutcome.results, graphqlResults);
  }

  private async fetchBatchColumns(boardId: number, columnIds: string[]): Promise<Map<string, BatchColumn> | undefined> {
    if (!columnIds.length) {
      return new Map();
    }
    try {
      const response = await this.mondayApi.request<GetBatchCreateColumnsQuery>(getBatchCreateColumns, {
        boardId: String(boardId),
        columnIds,
      });
      const columns = (response.boards?.[0]?.columns ?? []).flatMap((column) =>
        column ? [{ id: column.id, type: String(column.type), settings: column.settings }] : [],
      );
      return new Map(columns.map((column) => [column.id, column]));
    } catch {
      return undefined;
    }
  }

  private recordBatchMetadata(metadata: Record<string, unknown>): void {
    Object.assign((this.sessionContext.metadata ??= {}), metadata);
  }

  private isBatchCreateEnabled(): boolean {
    const hasAuthentication = this.apiToken !== undefined || this.context?.fetchConfig?.fetch !== undefined;
    return hasAuthentication && (this.context?.deps?.flagChecker?.(BATCH_CREATE_ITEMS_FLAG) ?? false);
  }

  private async executeBatchRequest(request: BatchCreateRequest, indexes: number[]): Promise<BatchOutcome | undefined> {
    const apiToken = typeof this.apiToken === 'function' ? this.apiToken() : this.apiToken;
    const mondayFetch = resolveMondayFetch(this.context);
    let response: Response;
    try {
      response = await mondayFetch({
        serviceName: BATCH_CREATE_ITEMS_SERVICE_NAME,
        path: BATCH_CREATE_ITEMS_PATH,
        method: 'POST',
        headers: {
          ...(this.context?.fetchConfig?.fetch || !apiToken ? {} : { Authorization: apiToken }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(BATCH_CREATE_ITEMS_TIMEOUT_MS),
      });
    } catch {
      return { results: createUnknownOutcomeResults(indexes), invalidIndexes: [] };
    }

    if (response.status === 403) {
      return undefined;
    }

    if (!response.ok) {
      const serverMessage = response.status < 500 ? await readErrorMessage(response) : undefined;
      const retryInSeconds = parseRetryAfterSeconds(response.headers.get('Retry-After'));
      const message = `Batch create items request failed with HTTP ${response.status}${
        serverMessage ? `: ${serverMessage}` : ''
      }`;
      const results = indexes.map((index) =>
        createBatchErrorResult(index, message, {
          code: `HTTP_${response.status}`,
          status_code: response.status,
          ...(retryInSeconds !== undefined ? { retry_in_seconds: retryInSeconds } : {}),
        }),
      );
      return { results, invalidIndexes: [] };
    }

    let responseBody: BatchCreateResponse;
    try {
      responseBody = (await response.json()) as BatchCreateResponse;
    } catch {
      return { results: createUnknownOutcomeResults(indexes), invalidIndexes: [] };
    }
    return mapBatchResponse(request, indexes, responseBody);
  }

  private async executeWithSingleItemCalls(
    entries: Array<{ item: ToolInputType<CreateItemsToolInput>['items'][number]; index: number }>,
    boardId: number,
  ): Promise<PerItemResult[]> {
    const singleTool = new CreateItemTool(this.mondayApi, { boardId });
    const skipMessage = 'Skipped: a previous item hit a rate limit; this item was not attempted';

    const tasks = entries.map(({ item, index }) => async (): Promise<PerItemResult> => {
      const result = await singleTool.execute({
        name: item.name as string,
        columnValues: item.columnValues,
        groupId: item.groupId,
        parentItemId: item.parentItemId,
        duplicateFromItemId: item.duplicateFromItemId,
        createLabelsIfMissing: item.createLabelsIfMissing,
      });
      return { index, ...(result.content as Record<string, unknown>) };
    });

    const raw = await runWithRateLimitCircuit(tasks, {
      limit: CONCURRENCY_LIMIT,
      concurrencyGroups: {
        getGroup: (position) => entries[position].item.parentItemId,
        limitPerGroup: PER_PARENT_CONCURRENCY_LIMIT,
      },
      onSkipped: (position) => {
        const index = entries[position].index;
        return {
          index,
          error: skipMessage,
          _errorEntry: { code: RATE_LIMIT_SKIPPED_CODE, message: skipMessage, path: ['results', index] },
        };
      },
      onError: (error, position) => {
        const { item, index } = entries[position];
        return {
          index,
          error: formatPerItemErrorMessage(error, item.parentItemId),
          _errorEntry: extractErrorEntry(error, index),
        };
      },
    });

    return raw;
  }
}

function getBatchPlan(input: ToolInputType<CreateItemsToolInput>, boardId: number): BatchPlan {
  if (input.items.some((item) => item.parentItemId !== undefined)) {
    return { fallbackReason: 'subitems' };
  }
  if (input.items.some((item) => item.duplicateFromItemId !== undefined)) {
    return { fallbackReason: 'duplicates' };
  }
  if (input.items.some((item) => item.createLabelsIfMissing === true)) {
    return { fallbackReason: 'create_labels_if_missing' };
  }
  const groupId = input.items[0].groupId;
  if (!input.items.every((item) => item.groupId === groupId)) {
    return { fallbackReason: 'mixed_groups' };
  }
  const items = parseBatchItems(input.items);
  if (!items) {
    return { fallbackReason: 'invalid_column_values_json' };
  }
  return { request: { boardId, groupId: groupId ?? '', items } };
}

function mergeResults(itemCount: number, ...resultSets: PerItemResult[][]): PerItemResult[] {
  const merged: PerItemResult[] = new Array(itemCount);
  for (const results of resultSets) {
    for (const result of results) {
      merged[result.index] = result;
    }
  }
  return merged;
}

function countInvalidTypes(outcome: BatchOutcome): Record<string, number> {
  const invalidIndexes = new Set(outcome.invalidIndexes);
  const counts: Record<string, number> = {};
  for (const result of outcome.results) {
    if (!invalidIndexes.has(result.index)) {
      continue;
    }
    const code = (result as { _errorEntry?: { code?: unknown } })._errorEntry?.code;
    const type = typeof code === 'string' ? code : 'unknown';
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return counts;
}

function parseBatchItems(items: ToolInputType<CreateItemsToolInput>['items']): BatchCreateRequest['items'] | undefined {
  try {
    return items.map((item) => {
      const parsed = JSON.parse(unwrapDoubleEncodedColumnValues(item.columnValues));
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid column values');
      }
      return { name: item.name as string, columnValues: parsed as Record<string, unknown> };
    });
  } catch {
    return undefined;
  }
}

function mapBatchResponse(request: BatchCreateRequest, indexes: number[], response: BatchCreateResponse): BatchOutcome {
  const results: Array<PerItemResult | undefined> = new Array(indexes.length);
  const invalidSerialNos = new Set<number>();

  for (const item of response.createdItems ?? []) {
    if (!isValidSerialNo(item.serialNo, indexes.length)) {
      continue;
    }
    const itemId = String(item.itemId);
    results[item.serialNo] = {
      index: indexes[item.serialNo],
      message: `Item ${itemId} successfully created`,
      item_id: itemId,
      item_name: request.items[item.serialNo].name,
      item_url: `https://monday.com/boards/${request.boardId}/pulses/${itemId}`,
      board_id: request.boardId,
    };
  }

  for (const item of response.invalidItems ?? []) {
    if (!isValidSerialNo(item.serialNo, indexes.length)) {
      continue;
    }
    const messages = (item.errors ?? []).flatMap((error) => (error.message ? [error.message] : []));
    const message = messages.join('; ') || 'Invalid item';
    const code = item.errors?.find((error) => error.type)?.type;
    results[item.serialNo] = createBatchErrorResult(indexes[item.serialNo], message, code ? { code } : {});
    invalidSerialNos.add(item.serialNo);
  }

  for (const item of response.failedItems ?? []) {
    if (!isValidSerialNo(item.serialNo, indexes.length)) {
      continue;
    }
    const message = item.reason || 'Item creation failed';
    results[item.serialNo] = createBatchErrorResult(indexes[item.serialNo], message, {
      ...(item.code ? { code: item.code } : {}),
      ...(item.retryAfter !== undefined ? { retry_in_seconds: item.retryAfter } : {}),
    });
    invalidSerialNos.delete(item.serialNo);
  }

  return {
    results: results.map(
      (result, serialNo) =>
        result ??
        createBatchErrorResult(
          indexes[serialNo],
          'Batch create items response did not include a result for this item',
          {
            code: 'MISSING_BATCH_RESULT',
          },
        ),
    ),
    invalidIndexes: [...invalidSerialNos].map((serialNo) => indexes[serialNo]),
  };
}

function createUnknownOutcomeResults(indexes: number[]): PerItemResult[] {
  const message =
    'The batch create request did not complete, so some items may have been created. Check the board before retrying.';
  return indexes.map((index) => createBatchErrorResult(index, message, { code: 'BATCH_OUTCOME_UNKNOWN' }));
}

async function readErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body?.message === 'string' && body.message ? body.message : undefined;
  } catch {
    return undefined;
  }
}

function parseRetryAfterSeconds(header: string | null): number | undefined {
  if (!header) {
    return undefined;
  }
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds;
  }
  const date = Date.parse(header);
  if (Number.isNaN(date)) {
    return undefined;
  }
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

function isValidSerialNo(serialNo: number, itemCount: number): boolean {
  return Number.isInteger(serialNo) && serialNo >= 0 && serialNo < itemCount;
}

function createBatchErrorResult(index: number, message: string, details: Record<string, unknown>): PerItemResult {
  return {
    index,
    error: message,
    _errorEntry: { ...details, message, path: ['results', index] },
  };
}

function buildCreateItemsResult(raw: PerItemResult[], boardId: number): ToolOutputType<never> {
  const errors = raw.filter((result) => 'error' in result).map((result) => result._errorEntry);
  const results = raw.map(({ _errorEntry, ...rest }) => rest);
  const total = raw.length;
  const failed = errors.length;
  const content: Record<string, unknown> = {
    board_id: boardId,
    summary: { total, created: total - failed, failed },
    is_partial_success: failed > 0 && failed < total,
    results,
  };

  if (errors.length) {
    content.errors = errors;
  }

  return { content, ...(failed === total ? { isError: true } : {}) };
}

type GraphQLErrorEntry = {
  message?: string;
  extensions?: Record<string, unknown>;
};

function getGraphQLErrorEntry(error: unknown): GraphQLErrorEntry | undefined {
  return (
    error as {
      response?: {
        errors?: GraphQLErrorEntry[];
      };
    }
  )?.response?.errors?.[0];
}

function formatPerItemErrorMessage(error: unknown, parentItemId?: number): string {
  const message = error instanceof Error ? error.message : String(error);
  if (parentItemId === undefined || !isParentSubitemRedlockError(error, parentItemId)) {
    return message;
  }

  return `${message}\nAn item-link update hit a temporary concurrency limit. Wait a few seconds, then retry only the failed items in one create_items call.`;
}

function isParentSubitemRedlockError(error: unknown, parentItemId: number): boolean {
  const gqlEntry = getGraphQLErrorEntry(error);
  const expectedPrefix = `failed to acquire lock on '${parentItemId}|subitems__`;
  return (
    gqlEntry?.extensions?.code === 'ColumnValueException' &&
    gqlEntry.message?.toLowerCase().startsWith(expectedPrefix.toLowerCase()) === true
  );
}

function extractErrorEntry(error: unknown, index: number): Record<string, unknown> {
  const gqlEntry = getGraphQLErrorEntry(error);
  const rawMessage = error instanceof Error ? error.message : String(error);
  return {
    ...(error instanceof ToolValidationError ? { code: error.code } : {}),
    ...(gqlEntry?.extensions ?? {}),
    message: gqlEntry?.message ?? rawMessage,
    path: ['results', index],
  };
}
