import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { ChangeItemColumnValuesTool } from '../change-item-column-values-tool';
import { COLUMN_VALUES_FORMAT_GUIDE } from '../column-values.utils';
import {
  runWithRateLimitCircuit,
  ToolValidationError,
  GRAPHQL_ERROR_CODE,
  MISSING_REQUIRED_PARAMETER_CODE,
} from '../../../../utils';
import { MAX_UPDATES_PER_CALL, CONCURRENCY_LIMIT, RATE_LIMIT_SKIPPED_CODE } from './constants';
import { getItemsBoardIds } from './update-items.graphql';
import { GetItemsBoardIdsQuery } from '../../../../monday-graphql/generated/graphql/graphql';

type PerUpdateResult =
  | { index: number; error: string; _errorEntry: Record<string, unknown>; [k: string]: unknown }
  | { index: number; [k: string]: unknown };

const updateSchema = z.object({
  itemId: z
    .number()
    // Optional in the schema only: Copilot Studio never sends calls whose array rows have required fields (#499).
    .optional()
    .describe('Required. The id of the item to update.'),
  columnValues: z
    .string()
    .default('{}')
    .describe(
      `The new column values for this item, keyed by column id. Defaults to "{}" (no column values). To change the item name include a "name" key. ${COLUMN_VALUES_FORMAT_GUIDE}`,
    ),
  boardId: z
    .number()
    .optional()
    .describe(
      'Optional. The id of the board that contains this item. Provide it when this update targets a board other than the batch default or the board in context. When omitted, the batch boardId or the board in context is used, and if there is neither, the board is looked up from the item.',
    ),
  createLabelsIfMissing: z
    .boolean()
    .optional()
    .describe(
      'When true, missing status or dropdown labels referenced in this update columnValues are auto-created on the board instead of erroring with ColumnValueException. Requires permission to change board structure.',
    ),
});

export const updateItemsToolSchema = {
  updates: z
    .array(updateSchema)
    .min(1, 'updates must not be empty')
    .max(MAX_UPDATES_PER_CALL, `updates must not exceed ${MAX_UPDATES_PER_CALL} per call`)
    .describe(
      `The item updates to apply, up to ${MAX_UPDATES_PER_CALL} per call. Each entry updates one item and returns its own result on success or a raw error message on failure. Each entry independently chooses its boardId, columnValues, and createLabelsIfMissing.`,
    ),
};

export const updateItemsInBoardToolSchema = {
  boardId: z
    .number()
    .optional()
    .describe(
      'Optional default board id used for any update that does not set its own boardId. Each update can override it with its own boardId, so a single call can span multiple boards. When neither is set, each item\'s board is looked up from the item.',
    ),
  ...updateItemsToolSchema,
};

export type UpdateItemsToolInput =
  | typeof updateItemsToolSchema
  | typeof updateItemsInBoardToolSchema;

export class UpdateItemsTool extends BaseMondayApiTool<UpdateItemsToolInput> {
  name = 'update_items';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update Multiple Items',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      `Update column values for up to ${MAX_UPDATES_PER_CALL} items in a single call. Each update targets one item by itemId and sets one or more column values on it. Each update is independent - it can target its own board via boardId and set its own column values, so a single call can update many items across multiple boards, apply the same value to many items, or apply different values per item. Each update returns its own item_id and item_url on success or a raw error message on failure. ` +
      'To link board-relation columns, call link_board_items_workflow before using this tool. ' +
      '[REQUIRED PRECONDITION]: Before using this tool, if you are not familiar with the board structure (column IDs, column types, status labels), first use get_board_info with filters.columns.only to get column metadata without fetching views. This is essential for constructing valid column values.'
    );
  }

  getInputSchema(): UpdateItemsToolInput {
    if (this.context?.boardId) {
      return updateItemsToolSchema;
    }
    return updateItemsInBoardToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<UpdateItemsToolInput>,
  ): Promise<ToolOutputType<never>> {
    const missingItemIds = input.updates.flatMap((update, index) =>
      update.itemId === undefined
        ? [extractErrorEntry(new ToolValidationError('Item id is required', MISSING_REQUIRED_PARAMETER_CODE), index)]
        : [],
    );
    if (missingItemIds.length) {
      throw new ToolValidationError(
        `${missingItemIds.length} of ${input.updates.length} updates are missing the required itemId field`,
        MISSING_REQUIRED_PARAMETER_CODE,
        missingItemIds,
      );
    }

    this.sessionContext.metadata ??= {};
    this.sessionContext.metadata.items_count = input.updates.length;

    const defaultBoardId =
      this.context?.boardId ?? (input as ToolInputType<typeof updateItemsInBoardToolSchema>).boardId;

    const resolvedBoardIds: Array<number | undefined> = input.updates.map(
      (update) => update.boardId ?? defaultBoardId,
    );
    const unresolvedItemIds = input.updates
      .filter((_, index) => resolvedBoardIds[index] == null)
      .map((update) => update.itemId as number);
    const boardIdsByItemId =
      unresolvedItemIds.length > 0 ? await this.lookUpBoardIds(unresolvedItemIds) : new Map<number, number>();
    input.updates.forEach((update, index) => {
      resolvedBoardIds[index] ??= boardIdsByItemId.get(update.itemId as number);
    });

    const skipMessage = 'Skipped: a previous update hit the minute rate limit, this update was not attempted';

    const singleTool = new ChangeItemColumnValuesTool(this.mondayApi);
    const tasks = input.updates.map((update, index) => async (): Promise<PerUpdateResult> => {
      const boardId = resolvedBoardIds[index];
      if (boardId == null) {
        throw new ToolValidationError(
          `Could not find the board of item ${update.itemId}. Set boardId on this update.`,
          MISSING_REQUIRED_PARAMETER_CODE,
        );
      }
      const result = await singleTool.execute({
        boardId,
        itemId: update.itemId as number,
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

  private async lookUpBoardIds(itemIds: number[]): Promise<Map<number, number>> {
    const uniqueItemIds = [...new Set(itemIds)];
    const res = await this.mondayApi.request<GetItemsBoardIdsQuery>(getItemsBoardIds, {
      itemIds: uniqueItemIds.map(String),
      limit: uniqueItemIds.length,
    });
    const boardIdsByItemId = new Map<number, number>();
    for (const item of res.items ?? []) {
      if (item?.board?.id) {
        boardIdsByItemId.set(Number(item.id), Number(item.board.id));
      }
    }
    return boardIdsByItemId;
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
