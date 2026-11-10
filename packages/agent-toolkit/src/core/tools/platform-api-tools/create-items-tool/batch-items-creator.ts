import { ApiClient } from '@mondaydotcomorg/api';
import { MondayApiToolContext } from '../base-monday-api-tool';
import { resolveMondayFetch } from '../ai-agent.utils';
import { unwrapDoubleEncodedColumnValues } from '../column-values.utils';
import { fetchAccountSlug } from '../utils/account-slug.utils';
import { adaptItemsForBatch } from './batch-workarounds';
import {
  BatchCandidateItem,
  BatchCreateItem,
  BatchCreateRequest,
  BatchCreateResponse,
  GraphqlFallback,
  PerItemResult,
} from './batch-items-creator.types';
import {
  BATCH_CREATE_ITEMS_FLAG,
  BATCH_CREATE_ITEMS_PATH,
  BATCH_CREATE_ITEMS_SERVICE_NAME,
  BATCH_CREATE_ITEMS_TIMEOUT_MS,
  BATCH_ENDPOINT_UNAVAILABLE_STATUSES,
} from './constants';

type BatchCompatibility = { groupId: string; items: BatchCreateItem[] } | { fallbackReason: string };

type BatchCallResult =
  | { kind: 'completed'; body: BatchCreateResponse }
  | { kind: 'failed'; status: number; serverMessage?: string; retryInSeconds?: number }
  | { kind: 'unknown_outcome' }
  | { kind: 'unavailable'; status: number };

type BatchOutcome = { results: PerItemResult[]; invalidIndexes: number[] };

export type BatchItemsCreatorOptions = {
  mondayApi: ApiClient;
  context?: MondayApiToolContext;
  metadata: Record<string, unknown>;
};

export function isBatchCreateFlagEnabled(context: MondayApiToolContext | undefined): boolean {
  return context?.deps?.flagChecker?.(BATCH_CREATE_ITEMS_FLAG) ?? false;
}

export function checkBatchCompatibility(items: BatchCandidateItem[]): BatchCompatibility {
  if (items.some((item) => item.parentItemId !== undefined)) {
    return { fallbackReason: 'subitems' };
  }
  if (items.some((item) => item.duplicateFromItemId !== undefined)) {
    return { fallbackReason: 'duplicates' };
  }
  if (items.some((item) => item.createLabelsIfMissing === true)) {
    return { fallbackReason: 'create_labels_if_missing' };
  }
  const groupId = items[0]?.groupId;
  if (!items.every((item) => item.groupId === groupId)) {
    return { fallbackReason: 'mixed_groups' };
  }
  const parsedItems = parseItems(items);
  if (!parsedItems) {
    return { fallbackReason: 'invalid_column_values_json' };
  }
  return { groupId: groupId ?? '', items: parsedItems };
}

export class BatchItemsCreator {
  constructor(private readonly options: BatchItemsCreatorOptions) {}

  isEnabled(items: BatchCandidateItem[]): boolean {
    if (!isBatchCreateFlagEnabled(this.options.context)) {
      return false;
    }
    const compatibility = checkBatchCompatibility(items);
    if ('fallbackReason' in compatibility) {
      this.recordMetadata({ batch_fallback_reason: compatibility.fallbackReason });
      return false;
    }
    return true;
  }

  async create(items: BatchCandidateItem[], boardId: number, fallback: GraphqlFallback): Promise<PerItemResult[]> {
    const allIndexes = items.map((_, index) => index);
    const compatibility = checkBatchCompatibility(items);
    if ('fallbackReason' in compatibility) {
      return this.fallBackEntirely(allIndexes, fallback, { batch_fallback_reason: compatibility.fallbackReason });
    }

    const adaptation = await adaptItemsForBatch(this.options.mondayApi, boardId, compatibility.items);
    if (!adaptation) {
      return this.fallBackEntirely(allIndexes, fallback, { batch_fallback_reason: 'column_lookup_failed' });
    }

    let outcome: BatchOutcome = { results: [], invalidIndexes: [] };
    let batchDurationMs = 0;
    if (adaptation.batchItems.length) {
      const request: BatchCreateRequest = { boardId, groupId: compatibility.groupId, items: adaptation.batchItems };
      const startedAt = Date.now();
      const accountSlug = fetchAccountSlug(this.options.mondayApi).catch(() => null);
      const callResult = await this.sendBatchRequest(request);
      batchDurationMs = Date.now() - startedAt;
      if (callResult.kind === 'unavailable') {
        return this.fallBackEntirely(allIndexes, fallback, {
          batch_fallback_reason: 'endpoint_unavailable',
          batch_endpoint_status: callResult.status,
        });
      }
      outcome = buildBatchOutcome(callResult, request, adaptation.batchIndexes, await accountSlug);
    }

    const graphqlIndexes = [...adaptation.graphqlIndexes, ...outcome.invalidIndexes].sort((a, b) => a - b);
    const graphqlResults = graphqlIndexes.length ? await fallback(graphqlIndexes) : [];

    this.recordMetadata({
      create_path: getCreatePath(adaptation.batchItems.length, graphqlIndexes.length),
      batch_items_count: adaptation.batchItems.length,
      batch_duration_ms: batchDurationMs,
      batch_column_lookup: adaptation.columnLookup,
      graphql_items_count: graphqlIndexes.length,
      batch_untranslated_reasons: adaptation.graphqlReasons,
      batch_invalid_retried_count: outcome.invalidIndexes.length,
      batch_invalid_types: countInvalidTypes(outcome),
    });

    return mergeResults(items.length, outcome.results, graphqlResults);
  }

  private async sendBatchRequest(request: BatchCreateRequest): Promise<BatchCallResult> {
    const mondayFetch = resolveMondayFetch(this.options.context);
    let response: Response;
    try {
      response = await mondayFetch({
        serviceName: BATCH_CREATE_ITEMS_SERVICE_NAME,
        path: BATCH_CREATE_ITEMS_PATH,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(BATCH_CREATE_ITEMS_TIMEOUT_MS),
      });
    } catch {
      return { kind: 'unknown_outcome' };
    }

    if (BATCH_ENDPOINT_UNAVAILABLE_STATUSES.includes(response.status)) {
      return { kind: 'unavailable', status: response.status };
    }

    if (!response.ok) {
      return {
        kind: 'failed',
        status: response.status,
        serverMessage: response.status < 500 ? await readErrorMessage(response) : undefined,
        retryInSeconds: parseRetryAfterSeconds(response.headers.get('Retry-After')),
      };
    }

    try {
      return { kind: 'completed', body: (await response.json()) as BatchCreateResponse };
    } catch {
      return { kind: 'unknown_outcome' };
    }
  }

  private async fallBackEntirely(
    indexes: number[],
    fallback: GraphqlFallback,
    metadata: Record<string, unknown>,
  ): Promise<PerItemResult[]> {
    this.recordMetadata(metadata);
    return fallback(indexes);
  }

  private recordMetadata(metadata: Record<string, unknown>): void {
    Object.assign(this.options.metadata, metadata);
  }
}

function buildBatchOutcome(
  callResult: Exclude<BatchCallResult, { kind: 'unavailable' }>,
  request: BatchCreateRequest,
  indexes: number[],
  accountSlug: string | null,
): BatchOutcome {
  switch (callResult.kind) {
    case 'completed':
      return mapBatchResponse(callResult.body, request, indexes, accountSlug);
    case 'failed':
      return { results: createHttpErrorResults(callResult, indexes), invalidIndexes: [] };
    case 'unknown_outcome':
      return { results: createUnknownOutcomeResults(indexes), invalidIndexes: [] };
  }
}

function mapBatchResponse(
  response: BatchCreateResponse,
  request: BatchCreateRequest,
  indexes: number[],
  accountSlug: string | null,
): BatchOutcome {
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
      ...(accountSlug
        ? { item_url: `https://${accountSlug}.monday.com/boards/${request.boardId}/pulses/${itemId}` }
        : {}),
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

function createHttpErrorResults(
  callResult: Extract<BatchCallResult, { kind: 'failed' }>,
  indexes: number[],
): PerItemResult[] {
  const { status, serverMessage, retryInSeconds } = callResult;
  const message = `Batch create items request failed with HTTP ${status}${serverMessage ? `: ${serverMessage}` : ''}`;
  return indexes.map((index) =>
    createBatchErrorResult(index, message, {
      code: `HTTP_${status}`,
      status_code: status,
      ...(retryInSeconds !== undefined ? { retry_in_seconds: retryInSeconds } : {}),
    }),
  );
}

function createUnknownOutcomeResults(indexes: number[]): PerItemResult[] {
  const message =
    'The batch create request did not complete, so some items may have been created. Check the board before retrying.';
  return indexes.map((index) => createBatchErrorResult(index, message, { code: 'BATCH_OUTCOME_UNKNOWN' }));
}

function createBatchErrorResult(index: number, message: string, details: Record<string, unknown>): PerItemResult {
  return {
    index,
    error: message,
    _errorEntry: { ...details, message, path: ['results', index] },
  };
}

function parseItems(items: BatchCandidateItem[]): BatchCreateItem[] | undefined {
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

function getCreatePath(batchItemsCount: number, graphqlItemsCount: number): string {
  if (!graphqlItemsCount) {
    return 'batch';
  }
  return batchItemsCount ? 'batch_with_graphql' : 'graphql';
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

function mergeResults(itemCount: number, ...resultSets: PerItemResult[][]): PerItemResult[] {
  const merged: PerItemResult[] = new Array(itemCount);
  for (const results of resultSets) {
    for (const result of results) {
      merged[result.index] = result;
    }
  }
  return merged;
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
