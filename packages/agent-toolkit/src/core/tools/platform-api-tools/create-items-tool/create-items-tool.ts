import { ApiClient } from '@mondaydotcomorg/api';
import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations, MondayApiToolContext } from '../base-monday-api-tool';
import { CreateItemTool } from '../create-item-tool/create-item-tool';
import { COLUMN_VALUES_FORMAT_GUIDE, unwrapDoubleEncodedColumnValues } from '../column-values.utils';
import { resolveMondayFetch } from '../ai-agent.utils';
import { runWithRateLimitCircuit, ToolValidationError, MISSING_REQUIRED_PARAMETER_CODE } from '../../../../utils';
import {
  BATCH_CREATE_ITEMS_FLAG,
  BATCH_CREATE_ITEMS_PATH,
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
  groupId?: string;
  parentPulseId?: number;
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

type BatchCreateResponse = {
  createdItems?: BatchCreatedItem[];
  failedItems?: BatchFailedItem[];
  invalidItems?: BatchInvalidItem[];
};

export const createItemsToolSchema = {
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
            'The id of the group to add this item to. Ignored when parentItemId is set (subitems inherit their parent group). Not supported when duplicateFromItemId is a subitem. If neither is set, the board default group is used.',
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
    .max(MAX_ITEMS_PER_CALL, `items must not exceed ${MAX_ITEMS_PER_CALL} per call`)
    .describe(
      `The items to create, up to ${MAX_ITEMS_PER_CALL} per call. Each item returns its own item_id and item_url on success, or a raw error message on failure. Each item independently chooses its groupId, parentItemId, and createLabelsIfMissing.`,
    ),
};

export const createItemsInBoardToolSchema = {
  boardId: z.number().describe('The id of the board to which the new items will be added'),
  ...createItemsToolSchema,
};

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
    return (
      `Create up to ${MAX_ITEMS_PER_CALL} new items in a single call. Each item is fully independent - it chooses its own groupId, parentItemId (for subitems), duplicateFromItemId (for bulk templating from an existing item), and createLabelsIfMissing. A single call can therefore span multiple groups, mix regular items with subitems under different parents, and mix fresh creates with duplicates of existing items. Each item returns its own item_id and item_url on success, or a raw error message on failure. ` +
      `Batch each parent's subitems into groups of up to ${MAX_ITEMS_PER_CALL}. Wait for one batch to finish before starting the next batch for that parent. ` +
      "[REQUIRED PRECONDITION]: Before using this tool, if new columns were added to the board or if you are not familiar with the board's structure (column IDs, column types, status labels, etc.), first use get_board_info with filters.columns.only to get column metadata without fetching views. This is essential for constructing proper column values and knowing which columns are available."
    );
  }

  getInputSchema(): CreateItemsToolInput {
    if (this.context?.boardId) {
      return createItemsToolSchema;
    }
    return createItemsInBoardToolSchema;
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

    const batchRequest = this.getBatchRequest(input, boardId);
    const batchResults = batchRequest ? await this.executeBatchRequest(input, batchRequest) : undefined;
    const raw = batchResults ?? (await this.executeWithSingleItemCalls(input, boardId));

    return buildCreateItemsResult(raw, boardId);
  }

  private getBatchRequest(input: ToolInputType<CreateItemsToolInput>, boardId: number): BatchCreateRequest | undefined {
    if (!this.isBatchCreateEnabled()) {
      return undefined;
    }

    if (input.items.some((item) => item.duplicateFromItemId !== undefined || item.createLabelsIfMissing === true)) {
      return undefined;
    }

    const parentItemId = input.items[0].parentItemId;
    const isSubitemBatch =
      parentItemId !== undefined && input.items.every((item) => item.parentItemId === parentItemId);
    const isRegularItemBatch = input.items.every((item) => item.parentItemId === undefined);

    if (!isSubitemBatch && !isRegularItemBatch) {
      return undefined;
    }

    const groupId = input.items[0].groupId;
    if (isRegularItemBatch && !input.items.every((item) => item.groupId === groupId)) {
      return undefined;
    }

    const items = parseBatchItems(input.items);
    if (!items) {
      return undefined;
    }

    return {
      boardId,
      ...(isRegularItemBatch && groupId !== undefined ? { groupId } : {}),
      ...(isSubitemBatch ? { parentPulseId: parentItemId } : {}),
      items,
    };
  }

  private isBatchCreateEnabled(): boolean {
    const hasAuthentication = this.apiToken !== undefined || this.context?.fetchConfig?.fetch !== undefined;
    return hasAuthentication && (this.context?.deps?.flagChecker?.(BATCH_CREATE_ITEMS_FLAG) ?? false);
  }

  private async executeBatchRequest(
    input: ToolInputType<CreateItemsToolInput>,
    request: BatchCreateRequest,
  ): Promise<PerItemResult[] | undefined> {
    const apiToken = typeof this.apiToken === 'function' ? this.apiToken() : this.apiToken;
    const mondayFetch = resolveMondayFetch(this.context);
    const response = await mondayFetch({
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

    if (response.status === 403) {
      return undefined;
    }

    if (!response.ok) {
      const responseBody = await response.text().catch(() => '');
      const retryAfter = response.headers.get('Retry-After') ?? undefined;
      const message = `Batch create items request failed with HTTP ${response.status}${
        responseBody ? `: ${responseBody}` : ''
      }`;
      return input.items.map((_, index) =>
        createBatchErrorResult(index, message, {
          code: `HTTP_${response.status}`,
          status_code: response.status,
          ...(retryAfter ? { retry_after: retryAfter } : {}),
        }),
      );
    }

    const responseBody = (await response.json()) as BatchCreateResponse;
    return mapBatchResponse(input, request.boardId, responseBody);
  }

  private async executeWithSingleItemCalls(
    input: ToolInputType<CreateItemsToolInput>,
    boardId: number,
  ): Promise<PerItemResult[]> {
    const singleTool = new CreateItemTool(this.mondayApi, { boardId });
    const skipMessage = 'Skipped: a previous item hit a rate limit; this item was not attempted';

    const tasks = input.items.map((item, index) => async (): Promise<PerItemResult> => {
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
        getGroup: (index) => input.items[index].parentItemId,
        limitPerGroup: PER_PARENT_CONCURRENCY_LIMIT,
      },
      onSkipped: (index) => ({
        index,
        error: skipMessage,
        _errorEntry: { code: RATE_LIMIT_SKIPPED_CODE, message: skipMessage, path: ['results', index] },
      }),
      onError: (error, index) => ({
        index,
        error: formatPerItemErrorMessage(error, input.items[index].parentItemId),
        _errorEntry: extractErrorEntry(error, index),
      }),
    });

    return raw;
  }
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

function mapBatchResponse(
  input: ToolInputType<CreateItemsToolInput>,
  boardId: number,
  response: BatchCreateResponse,
): PerItemResult[] {
  const results: Array<PerItemResult | undefined> = new Array(input.items.length);

  for (const item of response.createdItems ?? []) {
    if (!isValidSerialNo(item.serialNo, input.items.length)) {
      continue;
    }
    const sourceItem = input.items[item.serialNo];
    const itemId = String(item.itemId);
    const isSubitem = sourceItem.parentItemId !== undefined;
    results[item.serialNo] = {
      index: item.serialNo,
      message: isSubitem
        ? `Subitem ${itemId} created under ${sourceItem.parentItemId}`
        : `Item ${itemId} successfully created`,
      item_id: itemId,
      item_name: sourceItem.name,
      item_url: `https://monday.com/boards/${boardId}/pulses/${itemId}`,
      ...(!isSubitem ? { board_id: boardId } : {}),
    };
  }

  for (const item of response.invalidItems ?? []) {
    if (!isValidSerialNo(item.serialNo, input.items.length)) {
      continue;
    }
    const messages = (item.errors ?? []).flatMap((error) => (error.message ? [error.message] : []));
    const message = messages.join('; ') || 'Invalid item';
    const code = item.errors?.find((error) => error.type)?.type;
    results[item.serialNo] = createBatchErrorResult(item.serialNo, message, code ? { code } : {});
  }

  for (const item of response.failedItems ?? []) {
    if (!isValidSerialNo(item.serialNo, input.items.length)) {
      continue;
    }
    const message = item.reason || 'Item creation failed';
    results[item.serialNo] = createBatchErrorResult(item.serialNo, message, {
      ...(item.code ? { code: item.code } : {}),
      ...(item.retryAfter !== undefined ? { retry_after: item.retryAfter } : {}),
    });
  }

  return results.map(
    (result, index) =>
      result ??
      createBatchErrorResult(index, 'Batch create items response did not include a result for this item', {
        code: 'MISSING_BATCH_RESULT',
      }),
  );
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
