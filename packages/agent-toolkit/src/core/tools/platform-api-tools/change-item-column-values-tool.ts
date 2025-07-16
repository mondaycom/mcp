import { z } from 'zod';
import {
  ChangeItemColumnValuesMutation,
  ChangeItemColumnValuesMutationVariables,
} from '../../../monday-graphql/generated/graphql';
import { changeItemColumnValues } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const changeItemColumnValuesToolSchema = {
  itemId: z.number().describe('The ID of the item to be updated'),
  columnValues: z
    .string()
    .describe(
      `A string containing the new column values for the item following this structure: {\\"column_id\\": \\"value\\",... you can change multiple columns at once, note that for status column you must use nested value with 'label' as a key and for date column use 'date' as key} - example: "{\\"text_column_id\\":\\"New text\\", \\"status_column_id\\":{\\"label\\":\\"Done\\"}, \\"date_column_id\\":{\\"date\\":\\"2023-05-25\\"}, \\"phone_id\\":\\"123-456-7890\\", \\"email_id\\":\\"test@example.com\\"}"`,
    ),
};

export const changeItemColumnValuesInBoardToolSchema = {
  boardId: z.number().describe('The ID of the board that contains the item to be updated'),
  ...changeItemColumnValuesToolSchema,
};

export type ChangeItemColumnValuesToolInput =
  | typeof changeItemColumnValuesToolSchema
  | typeof changeItemColumnValuesInBoardToolSchema;

export class ChangeItemColumnValuesTool extends BaseMondayApiTool<ChangeItemColumnValuesToolInput> {
  name = 'change_item_column_values';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Change Item Column Values',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Change the column values of an item in a monday.com board';
  }

  getInputSchema(): ChangeItemColumnValuesToolInput {
    if (this.context?.boardId) {
      return changeItemColumnValuesToolSchema;
    }

    return changeItemColumnValuesInBoardToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<ChangeItemColumnValuesToolInput>,
  ): Promise<ToolOutputType<never>> {
    const boardId =
      this.context?.boardId ?? (input as ToolInputType<typeof changeItemColumnValuesInBoardToolSchema>).boardId;
    const variables: ChangeItemColumnValuesMutationVariables = {
      boardId: boardId.toString(),
      itemId: input.itemId.toString(),
      columnValues: input.columnValues,
    };

    const res = await this.mondayApi.request<ChangeItemColumnValuesMutation>(changeItemColumnValues, variables);

    return {
      content: `Item ${res.change_multiple_column_values?.id} successfully updated with the new column values`,
    };
  }
}
