import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { CreateItemTool } from '../create-item-tool/create-item-tool';
import { runWithRateLimitCircuit } from '../../../../utils';
import { MAX_ITEMS_PER_CALL, CONCURRENCY_LIMIT, RATE_LIMIT_SKIPPED_CODE } from './constants';

type PerItemResult =
  | { index: number; error: string; _errorEntry: Record<string, unknown>; [k: string]: unknown }
  | { index: number; [k: string]: unknown };

export const createItemsToolSchema = {
  items: z
    .array(
      z.object({
        name: z
          .string()
          .min(1, 'Item name cannot be empty')
          .max(255, 'Item name must be 255 characters or fewer')
          .describe('The name of the item to be created. 1-255 characters.'),
        columnValues: z
          .string()
          .describe(
            'A JSON string of column values for this item, keyed by column id. Same shape as create_item.columnValues (status/dropdown use { "label": "..." } or { "labels": [...] }, date uses { "date": "YYYY-MM-DD" }, text/number/email/phone are plain strings). Example: "{\\"status_col\\":{\\"label\\":\\"Done\\"}}". Pass "{}" if no column values should be set. If unfamiliar with the board columns/labels, call get_board_info first.',
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

  getDescription(): string {
    return (
      `Create up to ${MAX_ITEMS_PER_CALL} new items in a single call. Each item is fully independent - it chooses its own groupId, parentItemId (for subitems), duplicateFromItemId (for bulk templating from an existing item), and createLabelsIfMissing. A single call can therefore span multiple groups, mix regular items with subitems under different parents, and mix fresh creates with duplicates of existing items. Each item returns its own item_id and item_url on success, or a raw error message on failure. ` +
      "[REQUIRED PRECONDITION]: Before using this tool, if new columns were added to the board or if you are not familiar with the board's structure (column IDs, column types, status labels, etc.), first use get_board_info to understand the board metadata. This is essential for constructing proper column values and knowing which columns are available."
    );
  }

  getInputSchema(): CreateItemsToolInput {
    if (this.context?.boardId) {
      return createItemsToolSchema;
    }
    return createItemsInBoardToolSchema;
  }

  protected async executeInternal(input: ToolInputType<CreateItemsToolInput>): Promise<ToolOutputType<never>> {
    const boardId = this.context?.boardId ?? (input as ToolInputType<typeof createItemsInBoardToolSchema>).boardId;
    this.sessionContext.metadata ??= {};
    this.sessionContext.metadata.items_count = input.items.length;
    const singleTool = new CreateItemTool(this.mondayApi, { boardId });
    const skipMessage = 'Skipped: a previous item hit the minute rate limit; this item was not attempted';

    const tasks = input.items.map((item, index) => async (): Promise<PerItemResult> => {
      const result = await singleTool.execute({
        name: item.name,
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

    const errors = raw
      .filter(r => 'error' in r)
      .map((r) => r._errorEntry);

    const results = raw.map(({ _errorEntry, ...rest }) => rest);
    const failed = errors.length;
    const summary = { total: raw.length, created: raw.length - failed, failed };

    const content: Record<string, unknown> = { board_id: boardId, summary, results };

    if (errors.length) {
      content.errors = errors;
    }

    return { content };
  }
}

function extractErrorEntry(error: unknown, index: number): Record<string, unknown> {
  const gqlEntry = (
    error as {
      response?: {
        errors?: Array<{ message?: string; extensions?: Record<string, unknown> }>;
      };
    }
  )?.response?.errors?.[0];
  const rawMessage = error instanceof Error ? error.message : String(error);
  return {
    ...(gqlEntry?.extensions ?? {}),
    message: gqlEntry?.message ?? rawMessage,
    path: ['results', index],
  };
}
