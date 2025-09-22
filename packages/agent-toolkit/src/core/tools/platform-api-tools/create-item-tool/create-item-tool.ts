import { z } from 'zod';
import { CreateItemMutation, CreateItemMutationVariables, DuplicateItemMutation } from '../../../../monday-graphql/generated/graphql';
import { createItem, duplicateItem } from '../../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { ChangeItemColumnValuesTool } from '../change-item-column-values-tool';

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
    duplicateFromItemId: z.number()
    .optional()
    .describe('The id of existing item to duplicate and update with new values (only provide when duplicating)'),
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
    return 'Create a new item with provided values, or duplicate an existing item and update it with new values';
  }

  getInputSchema(): CreateItemToolInput {
    if (this.context?.boardId) {
      return createItemToolSchema;
    }

    return createItemInBoardToolSchema;
  }

  protected async executeInternal(input: ToolInputType<CreateItemToolInput>): Promise<ToolOutputType<never>> {
    const boardId = this.context?.boardId ?? (input as ToolInputType<typeof createItemInBoardToolSchema>).boardId;

    //two paths, one for duplicate item, one for create item
    if (input.duplicateFromItemId) {
      return await this.duplicateAndUpdateItem(input, boardId);
    } else {
      return await this.createNewItem(input, boardId);
    }
  }

  private async duplicateAndUpdateItem(input: ToolInputType<CreateItemToolInput>, boardId: number): Promise<ToolOutputType<never>> {

    const duplicateVariables = {
      boardId: boardId.toString(),
      itemId: input.duplicateFromItemId!.toString()
    };
    
    const duplicateRes = await this.mondayApi.request<DuplicateItemMutation>(duplicateItem, duplicateVariables);
    
    if (!duplicateRes.duplicate_item?.id) {
      throw new Error('Failed to duplicate item');
    }

    let columnValuesParsed;
    try {
      columnValuesParsed = JSON.parse(input.columnValues);
    } catch (error) {
      throw new Error('Invalid JSON in columnValues');
    }
    
    const columnValuesAndName = {
      ...columnValuesParsed,
      name: input.name,
    };

    // Now update the duplicated item with the new name and column values
    const changeColumnValuesTool = new ChangeItemColumnValuesTool(this.mondayApi, this.apiToken, { boardId: boardId });
    const updateRes = await changeColumnValuesTool.execute({
      itemId: parseInt(duplicateRes.duplicate_item.id),
      columnValues: JSON.stringify(columnValuesAndName),
    });

    if (updateRes.content.includes('Error')) {
      throw new Error('Failed to update duplicated item: ' + updateRes.content);
    }

    return {
      content: `Item ${duplicateRes.duplicate_item.id} successfully duplicated from ${input.duplicateFromItemId} and updated`,
    };
  }

  private async createNewItem(input: ToolInputType<CreateItemToolInput>, boardId: number): Promise<ToolOutputType<never>> {
    // Create new item
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
