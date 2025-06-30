import { z } from 'zod';
import { CreateItemMutation, CreateItemMutationVariables } from '../../../monday-graphql/generated/graphql';
import { createItem } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const createItemToolSchema = {
  name: z.string().describe("The name of the new item to be created, must be relevant to the user's request"),
  groupId: z
    .string()
    .optional()
    .describe('The id of the group id to which the new item will be added, if its not clearly specified, leave empty'),
  columnValues: z
    .string()
    .describe(
      `A string containing the new column values for the item following this structure: {\\"column_id\\": \\"value\\",... you can change multiple columns at once, note that for status column you must use nested value with 'label' as a key and for date column use 'date' as key} - example: "{\\"text_column_id\\":\\"New text\\", \\"status_column_id\\":{\\"label\\":\\"Done\\"}, \\"date_column_id\\":{\\"date\\":\\"2023-05-25\\"},\\"dropdown_id\\":\\"value\\", \\"phone_id\\":\\"123-456-7890\\", \\"email_id\\":\\"test@example.com\\"}"`,
    ),
};

export const createItemInBoardToolSchema = {
  boardId: z.number().describe('The id of the board to which the new item will be added'),
  ...createItemToolSchema,
};

export type CreateItemToolInput = typeof createItemToolSchema | typeof createItemInBoardToolSchema;

export class CreateItemTool extends BaseMondayApiTool<CreateItemToolInput> {
  name = 'create_item';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Item',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Create a new item in a monday.com board';
  }

  getInputSchema(): CreateItemToolInput {
    if (this.context?.boardId) {
      return createItemToolSchema;
    }

    return createItemInBoardToolSchema;
  }

  async execute(input: ToolInputType<CreateItemToolInput>): Promise<ToolOutputType<never>> {
    const boardId = this.context?.boardId ?? (input as ToolInputType<typeof createItemInBoardToolSchema>).boardId;
    const variables: CreateItemMutationVariables = {
      boardId: boardId.toString(),
      itemName: input.name,
      groupId: input.groupId,
      columnValues: input.columnValues,
    };

    const res = await this.mondayApi.request<CreateItemMutation>(createItem, variables);

    return {
      content: `Item ${res.create_item?.id} successfully created`,
    };
  }
}
