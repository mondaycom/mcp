import { z } from 'zod';
import {
  ChangeItemColumnValuesMutation,
  ChangeItemColumnValuesMutationVariables,
} from 'src/monday-graphql/generated/graphql/graphql';
import { changeItemColumnValues } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

const batchItemSchema = z.object({
  itemId: z.number().describe('The ID of the item to be updated'),
  columnValues: z
    .string()
    .describe(
      `A string containing the new column values for the item following this structure: {\\"column_id\\": \\"value\\",... you can change multiple columns at once, note that for status column you must use nested value with 'label' as a key and for date column use 'date' as key} - example: "{\\"text_column_id\\":\\"New text\\", \\"status_column_id\\":{\\"label\\":\\"Done\\"}, \\"date_column_id\\":{\\"date\\":\\"2023-05-25\\"}, \\"phone_id\\":\\"123-456-7890\\", \\"email_id\\":\\"test@example.com\\"}"`,
    ),
  createLabelsIfMissing: z
    .boolean()
    .optional()
    .describe(
      'If true, create missing Status/Dropdown labels when setting those columns. Requires permission to change board structure. Omit or false to only use existing labels.',
    ),
});

export const changeItemColumnValuesBatchToolSchema = {
  items: z
    .array(batchItemSchema)
    .min(1)
    .max(50)
    .describe('Array of items to update. Each item needs an itemId and columnValues. Max 50 items per batch.'),
};

export const changeItemColumnValuesBatchInBoardToolSchema = {
  boardId: z.number().describe('The ID of the board containing the items to update'),
  ...changeItemColumnValuesBatchToolSchema,
};

export type ChangeItemColumnValuesBatchToolInput =
  | typeof changeItemColumnValuesBatchToolSchema
  | typeof changeItemColumnValuesBatchInBoardToolSchema;

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
      '[REQUIRED PRECONDITION]: Before using this tool, if new columns were added to the board or if you are not familiar with the board structure (column IDs, column types, status labels, etc.), first use get_board_info to understand the board metadata. This is essential for constructing proper column values and knowing which columns are available. ' +
      '[REQUIRED PRECONDITION]: For board-relation linking tasks, call link_board_items_workflow before using this tool.'
    );
  }

  getInputSchema(): ChangeItemColumnValuesBatchToolInput {
    if (this.context?.boardId) {
      return changeItemColumnValuesBatchToolSchema;
    }

    return changeItemColumnValuesBatchInBoardToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<ChangeItemColumnValuesBatchToolInput>,
  ): Promise<ToolOutputType<never>> {
    const boardId =
      this.context?.boardId ?? (input as ToolInputType<typeof changeItemColumnValuesBatchInBoardToolSchema>).boardId;

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
        error: this.extractErrorMessage(entry.result.reason),
      }));

    return {
      content: {
        message: `${successful.length} of ${input.items.length} items updated successfully${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
        successful,
        failed,
      },
    };
  }

  private extractErrorMessage(error: unknown): string {
    const graphQLErrors = (error as any)?.response?.errors?.map((e: { message: string }) => e.message)?.join(', ');
    if (graphQLErrors) {
      return graphQLErrors;
    }
    return error instanceof Error ? error.message : String(error);
  }
}
