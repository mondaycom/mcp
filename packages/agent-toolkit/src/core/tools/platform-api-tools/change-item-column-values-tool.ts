import { z } from 'zod';
import {
  ChangeItemColumnValuesMutation,
  ChangeItemColumnValuesMutationVariables,
} from 'src/monday-graphql/generated/graphql/graphql';
import { changeItemColumnValues } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';
import { ToolValidationError, rethrowWithContext } from '../../../utils';

export const changeItemColumnValuesToolSchema = {
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
    return (
      '[IMPORTANT] If you need to update multiple items in one call, use update_items instead of calling this tool in a loop. ' +
      'Otherwise: change the column values of a single item in a monday.com board. ' +
      "[REQUIRED PRECONDITION]: Before using this tool, if new columns were added to the board or if you are not familiar with the board's structure (column IDs, column types, status labels, etc.), first use get_board_info to understand the board metadata. This is essential for constructing valid column values. " +
      'For board-relation linking tasks, call link_board_items_workflow before using this tool.'
    );
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
      ...(input.createLabelsIfMissing !== undefined && {
        createLabelsIfMissing: input.createLabelsIfMissing,
      }),
    };

    let parsedColumnValues: unknown;
    try {
      parsedColumnValues = JSON.parse(input.columnValues);
    } catch (e) {
      throw new ToolValidationError(
        `Invalid columnValues JSON: ${(e as Error).message}`,
        'INVALID_COLUMN_VALUES_JSON',
      );
    }

    if (parsedColumnValues === null || typeof parsedColumnValues !== 'object' || Array.isArray(parsedColumnValues)) {
      throw new ToolValidationError(
        'Invalid columnValues JSON: expected a JSON object keyed by column id',
        'INVALID_COLUMN_VALUES_JSON',
      );
    }

    const changedColumnIds = Object.keys(parsedColumnValues as Record<string, unknown>);

    let res: ChangeItemColumnValuesMutation;
    try {
      res = await this.mondayApi.request<ChangeItemColumnValuesMutation>(changeItemColumnValues, {
        ...variables,
        columnIds: changedColumnIds,
      });
    } catch (error) {
      rethrowWithContext(error, 'change column values');
    }

    const updatedColumnValues = res.change_multiple_column_values?.column_values?.reduce(
      (acc: Record<string, string | null>, cv) => {
        acc[cv.id] = cv.value ?? null;
        return acc;
      },
      {},
    );

    return {
      content: {
        message: `Item ${res.change_multiple_column_values?.id} successfully updated`,
        item_id: res.change_multiple_column_values?.id,
        item_name: res.change_multiple_column_values?.name,
        item_url: res.change_multiple_column_values?.url,
        column_values: updatedColumnValues,
      },
    };
  }
}
