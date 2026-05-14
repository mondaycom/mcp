import { z } from 'zod';
import {
  ChangeItemColumnValuesMutation,
  ChangeItemColumnValuesMutationVariables,
} from 'src/monday-graphql/generated/graphql/graphql';
import { changeItemColumnValues } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

const batchItemSchema = z.object({
  itemId: z.number().describe('The ID of the item to update'),
  columnValues: z
    .string()
    .describe(
      'A JSON string of column values to set: {"column_id": "value", ...}. For status use {"label":"Done"}, for date use {"date":"2023-05-25"}.',
    ),
  createLabelsIfMissing: z
    .boolean()
    .optional()
    .describe('If true, create missing Status/Dropdown labels. Requires board structure permissions.'),
});

export const changeItemColumnValuesBatchToolSchema = {
  boardId: z.number().describe('The ID of the board containing the items to update'),
  items: z
    .array(batchItemSchema)
    .min(1)
    .max(50)
    .describe('Array of items to update. Each item needs an itemId and columnValues. Max 50 items per batch.'),
};

export type ChangeItemColumnValuesBatchToolInput = typeof changeItemColumnValuesBatchToolSchema;

export class ChangeItemColumnValuesBatchTool extends BaseMondayApiTool<ChangeItemColumnValuesBatchToolInput> {
  name = 'change_item_column_values_batch';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Change Item Column Values (Batch)',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      'Update column values for multiple items in a single batch operation. ' +
      'Each item is updated independently — partial failures do not block other items. ' +
      'Returns per-item success/failure results. Max 50 items per batch. ' +
      '[REQUIRED PRECONDITION]: Before using this tool, use get_board_info to understand the board structure (column IDs, types, labels).'
    );
  }

  getInputSchema(): ChangeItemColumnValuesBatchToolInput {
    return changeItemColumnValuesBatchToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<ChangeItemColumnValuesBatchToolInput>,
  ): Promise<ToolOutputType<never>> {
    const boardId = this.context?.boardId ?? input.boardId;

    const results = await Promise.allSettled(
      input.items.map(async (item) => {
        const variables: ChangeItemColumnValuesMutationVariables = {
          boardId: boardId.toString(),
          itemId: item.itemId.toString(),
          columnValues: item.columnValues,
          ...(item.createLabelsIfMissing !== undefined && {
            createLabelsIfMissing: item.createLabelsIfMissing,
          }),
        };

        const res = await this.mondayApi.request<ChangeItemColumnValuesMutation>(changeItemColumnValues, variables);
        return {
          itemId: item.itemId,
          id: res.change_multiple_column_values?.id,
          name: res.change_multiple_column_values?.name,
          url: res.change_multiple_column_values?.url,
        };
      }),
    );

    const successful = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);

    const failed = input.items
      .map((item, index) => ({ item, result: results[index] }))
      .filter((entry): entry is { item: typeof entry.item; result: PromiseRejectedResult } =>
        entry.result.status === 'rejected',
      )
      .map((entry) => ({
        itemId: entry.item.itemId,
        error: entry.result.reason instanceof Error ? entry.result.reason.message : String(entry.result.reason),
      }));

    return {
      content: {
        message: `${successful.length} of ${input.items.length} items updated successfully${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
        successful,
        failed,
      },
    };
  }
}
