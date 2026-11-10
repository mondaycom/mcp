export const MAX_ITEMS_PER_CALL = 20;
export const BATCH_MAX_ITEMS_PER_CALL = 100;
export const CONCURRENCY_LIMIT = 15;
export const PER_PARENT_CONCURRENCY_LIMIT = 5;
export const RATE_LIMIT_SKIPPED_CODE = 'RATE_LIMIT_SKIPPED';
export const BATCH_CREATE_ITEMS_FLAG = 'mcp-create-items-batch-endpoint';
export const BATCH_CREATE_ITEMS_PATH = '/internal/create-items';
export const BATCH_CREATE_ITEMS_SERVICE_NAME = 'mdb-data';
export const BATCH_CREATE_ITEMS_TIMEOUT_MS = 30_000;
export const BATCH_ENDPOINT_UNAVAILABLE_STATUSES: readonly number[] = [401, 403, 404];
export const BATCH_FAILED_ITEM_CODE = 'BATCH_ITEM_FAILED';
export const BATCH_FAILED_ITEM_MESSAGES: Readonly<Record<string, string>> = {
  WAL_THROTTLED:
    'The item was not created because the board is receiving too many writes right now. Retry this item in a few seconds.',
};
export const MISSING_BATCH_RESULT_MESSAGE =
  'The batch response did not include a result for this item, so it may have been created. Check the board before retrying.';
