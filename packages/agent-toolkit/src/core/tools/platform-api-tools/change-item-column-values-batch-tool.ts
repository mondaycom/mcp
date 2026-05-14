import { z } from 'zod';
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

type ItemResult = { id: string; name: string; url: string | null } | null;

function buildBatchMutation(boardId: string, items: z.infer<typeof batchItemSchema>[]) {
  const varDefs: string[] = ['$boardId: ID!'];
  const mutations: string[] = [];
  const variables: Record<string, unknown> = { boardId };

  items.forEach((item, i) => {
    varDefs.push(`$itemId_${i}: ID!`, `$columnValues_${i}: JSON!`);
    variables[`itemId_${i}`] = item.itemId.toString();
    variables[`columnValues_${i}`] = item.columnValues;

    const args = ['board_id: $boardId', `item_id: $itemId_${i}`, `column_values: $columnValues_${i}`];

    if (item.createLabelsIfMissing !== undefined) {
      varDefs.push(`$createLabelsIfMissing_${i}: Boolean`);
      args.push(`create_labels_if_missing: $createLabelsIfMissing_${i}`);
      variables[`createLabelsIfMissing_${i}`] = item.createLabelsIfMissing;
    }

    mutations.push(`item_${i}: change_multiple_column_values(${args.join(', ')}) { id name url }`);
  });

  const query = `mutation(${varDefs.join(', ')}) {\n${mutations.join('\n')}\n}`;
  return { query, variables };
}

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
      'All items are sent in one GraphQL request using aliased mutations — partial failures do not block other items. ' +
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

    const { query, variables } = buildBatchMutation(boardId.toString(), input.items);

    let data: Record<string, ItemResult> = {};
    let errors: Array<{ message: string; path?: string[] }> = [];

    try {
      data = await this.mondayApi.request<Record<string, ItemResult>>(query, variables);
    } catch (error: unknown) {
      const partialData = (error as any)?.response?.data;
      if (partialData) {
        data = partialData;
        errors = (error as any).response?.errors ?? [];
      } else {
        return {
          content: {
            message: `0 of ${input.items.length} items updated successfully, ${input.items.length} failed`,
            successful: [],
            failed: input.items.map((item) => ({
              itemId: item.itemId,
              error: this.extractErrorMessage(error),
            })),
          },
        };
      }
    }

    const successful: Array<{ itemId: number; id: string; name: string; url: string | null }> = [];
    const failed: Array<{ itemId: number; error: string }> = [];

    input.items.forEach((item, i) => {
      const alias = `item_${i}`;
      const result = data[alias];
      if (result) {
        successful.push({ itemId: item.itemId, id: result.id, name: result.name, url: result.url });
      } else {
        const itemErrors = errors
          .filter((e) => e.path?.[0] === alias)
          .map((e) => e.message)
          .join(', ');
        failed.push({ itemId: item.itemId, error: itemErrors || 'Unknown error' });
      }
    });

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
