import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { ChangeItemColumnValuesTool } from '../change-item-column-values-tool';
import { runWithRateLimitCircuit, ToolValidationError, GRAPHQL_ERROR_CODE } from '../../../../utils';
import { MAX_UPDATES_PER_CALL, CONCURRENCY_LIMIT, RATE_LIMIT_SKIPPED_CODE } from './constants';

type PerUpdateResult =
  | { index: number; error: string; _errorEntry: Record<string, unknown>; [k: string]: unknown }
  | { index: number; [k: string]: unknown };

const updateSchema = z.object({
  itemId: z.number().describe('The id of the item to update.'),
  columnValues: z
    .string()
    .describe(
      'A JSON object string of the new column values for this item, keyed by column id. Status and dropdown columns use { "label": "..." } (or { "labels": ["..."] } for multi-select dropdown). Date columns use { "date": "YYYY-MM-DD" }. Text, number, email and phone use plain strings. Example: "{\\"text_col\\":\\"hello\\",\\"status_col\\":{\\"label\\":\\"Done\\"}}". To change the item name include a "name" key. If unfamiliar with the board columns or labels, call get_board_info first.',
    ),
  boardId: z
    .number()
    .optional()
    .describe(
      'Optional. The id of the board that contains this item. Provide it when this update targets a board other than the batch default or the board in context. When omitted, the batch boardId or the board in context is used.',
    ),
  createLabelsIfMissing: z
    .boolean()
    .optional()
    .describe(
      'When true, missing status or dropdown labels referenced in this update columnValues are auto-created on the board instead of erroring with ColumnValueException. Requires permission to change board structure.',
    ),
});

export const changeItemsColumnValuesToolSchema = {
  updates: z
    .array(updateSchema)
    .min(1, 'updates must not be empty')
    .max(MAX_UPDATES_PER_CALL, `updates must not exceed ${MAX_UPDATES_PER_CALL} per call`)
    .describe(
      `The item updates to apply, up to ${MAX_UPDATES_PER_CALL} per call. Each entry updates one item and returns its own result on success or a raw error message on failure. Each entry independently chooses its boardId, columnValues, and createLabelsIfMissing.`,
    ),
};

export const changeItemsColumnValuesInBoardToolSchema = {
  boardId: z
    .number()
    .optional()
    .describe(
      'Optional default board id used for any update that does not set its own boardId. Each update can override it with its own boardId, so a single call can span multiple boards.',
    ),
  ...changeItemsColumnValuesToolSchema,
};

export type ChangeItemsColumnValuesToolInput =
  | typeof changeItemsColumnValuesToolSchema
  | typeof changeItemsColumnValuesInBoardToolSchema;

export class ChangeItemsColumnValuesTool extends BaseMondayApiTool<ChangeItemsColumnValuesToolInput> {
  name = 'change_items_column_values';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Change Multiple Items Column Values',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      `Update column values for up to ${MAX_UPDATES_PER_CALL} items in a single call. Each update targets one item by itemId and sets one or more column values on it. Each update is independent - it can target its own board via boardId and set its own column values, so a single call can update many items across multiple boards, apply the same value to many items, or apply different values per item. Each update returns its own item_id and item_url on success or a raw error message on failure. ` +
      'To link board-relation columns, call link_board_items_workflow before using this tool. ' +
      '[REQUIRED PRECONDITION]: Before using this tool, if you are not familiar with the board structure (column IDs, column types, status labels), first use get_board_info to understand the board metadata. This is essential for constructing valid column values.'
    );
  }

  getInputSchema(): ChangeItemsColumnValuesToolInput {
    if (this.context?.boardId) {
      return changeItemsColumnValuesToolSchema;
    }
    return changeItemsColumnValuesInBoardToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<ChangeItemsColumnValuesToolInput>,
  ): Promise<ToolOutputType<never>> {
    this.sessionContext.metadata ??= {};
    this.sessionContext.metadata.items_count = input.updates.length;

    const defaultBoardId =
      this.context?.boardId ?? (input as ToolInputType<typeof changeItemsColumnValuesInBoardToolSchema>).boardId;

    const resolvedBoardIds = input.updates.map((update) => update.boardId ?? defaultBoardId);
    const missingBoardIndexes = resolvedBoardIds
      .map((boardId, index) => (boardId == null ? index : -1))
      .filter((index) => index >= 0);

    if (missingBoardIndexes.length > 0) {
      throw new ToolValidationError(
        `Missing boardId for update(s) at index ${missingBoardIndexes.join(', ')}. Set a boardId on each update or provide a batch-level boardId.`,
        'MISSING_REQUIRED_PARAMETER',
      );
    }

    const skipMessage = 'Skipped: a previous update hit the minute rate limit, this update was not attempted';

    const singleTool = new ChangeItemColumnValuesTool(this.mondayApi);
    const tasks = input.updates.map((update, index) => async (): Promise<PerUpdateResult> => {
      const boardId = resolvedBoardIds[index] as number;
      const result = await singleTool.execute({
        boardId,
        itemId: update.itemId,
        columnValues: update.columnValues,
        createLabelsIfMissing: update.createLabelsIfMissing,
      });
      return { index, board_id: boardId, ...(result.content as Record<string, unknown>) };
    });

    const raw = await runWithRateLimitCircuit(tasks, {
      limit: CONCURRENCY_LIMIT,
      onSkipped: (index) => ({
        index,
        error: skipMessage,
        _errorEntry: { code: RATE_LIMIT_SKIPPED_CODE, message: skipMessage, path: ['results', index] },
      }),
      onError: (error, index) => ({
        index,
        error: error instanceof Error ? error.message : String(error),
        _errorEntry: extractErrorEntry(error, index),
      }),
    });

    const errors = raw.filter((r) => 'error' in r).map((r) => r._errorEntry);
    const results = raw.map(({ _errorEntry, ...rest }) => rest);
    const total = raw.length;
    const failed = errors.length;
    const isPartialSuccess = failed > 0 && failed < total;

    const content: Record<string, unknown> = {
      summary: { total, updated: total - failed, failed },
      is_partial_success: isPartialSuccess,
      results,
    };

    if (errors.length) {
      content.errors = errors;
    }

    return { content };
  }
}

function extractErrorEntry(error: unknown, index: number): Record<string, unknown> {
  if (error instanceof ToolValidationError) {
    return { code: error.code, message: error.message, path: ['results', index] };
  }

  const gqlEntry = (
    error as {
      response?: {
        errors?: Array<{ message?: string; extensions?: Record<string, unknown> }>;
      };
    }
  )?.response?.errors?.[0];
  const rawMessage = error instanceof Error ? error.message : String(error);
  const extensions = gqlEntry?.extensions ?? {};
  return {
    ...extensions,
    code: (extensions.code as string | undefined) ?? GRAPHQL_ERROR_CODE,
    message: gqlEntry?.message ?? rawMessage,
    path: ['results', index],
  };
}
