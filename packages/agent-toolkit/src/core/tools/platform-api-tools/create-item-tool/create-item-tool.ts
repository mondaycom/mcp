import { z } from 'zod';
import { CreateItemMutation, CreateItemMutationVariables, DuplicateItemMutation, CreateSubitemMutation } from '../../../../monday-graphql/generated/graphql';
import { createItem } from '../../../../monday-graphql/queries.graphql';
import { duplicateItem } from './duplicate-item.graphql';
import { createSubitem } from './create-subitem.graphql';
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
    parentItemId: z.number()
    .optional()
    .describe('The id of the parent item under which the new subitem will be created'),
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
    return 'Create a new item with provided values, create a subitem under a parent item, or duplicate an existing item and update it with new values. Use parentItemId when creating a subitem under an existing item. Use duplicateFromItemId when copying an existing item with modifications.' 
      + `[REQUIRED PRECONDITION]: Before using this tool, if you are not familiar with the board's structure (column IDs, column types, status labels, etc.), first use get_board_info to understand the board metadata. This is essential for constructing proper column values and knowing which columns are available.`;
  }

  getInputSchema(): CreateItemToolInput {
    if (this.context?.boardId) {
      return createItemToolSchema;
    }
    return createItemInBoardToolSchema;
  }

  protected async executeInternal(input: ToolInputType<CreateItemToolInput>): Promise<ToolOutputType<never>> {
    const boardId = this.context?.boardId ?? (input as ToolInputType<typeof createItemInBoardToolSchema>).boardId;

    if (input.duplicateFromItemId && input.parentItemId) {
      throw new Error('Cannot specify both parentItemId and duplicateFromItemId. Please provide only one of these parameters.');
    }

    if (input.duplicateFromItemId) {
      return await this.duplicateAndUpdateItem(input, boardId);
    } else if (input.parentItemId) {
      return await this.createSubitem(input);
    } else {
      return await this.createNewItem(input, boardId);
    }
  }

  private async duplicateAndUpdateItem(input: ToolInputType<CreateItemToolInput>, boardId: number): Promise<ToolOutputType<never>> {
    try {
      const duplicateVariables = {
        boardId: boardId.toString(),
        itemId: input.duplicateFromItemId!.toString()
      };
      
      const duplicateRes = await this.mondayApi.request<DuplicateItemMutation>(duplicateItem, duplicateVariables);
      
      if (!duplicateRes.duplicate_item?.id) {
        throw new Error('Failed to duplicate item: no item duplicated');
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
    } catch (error) {
      this.rethrowWrapped(error, 'duplicate item');
    }
  }

  private async createSubitem(input: ToolInputType<CreateItemToolInput>): Promise<ToolOutputType<never>> {

      const variables = {
        parentItemId: input.parentItemId!.toString(),
        itemName: input.name,
        columnValues: input.columnValues,
      };
      try {
        const res = await this.mondayApi.request<CreateSubitemMutation>(createSubitem, variables);

      if (!res.create_subitem?.id) {
        throw new Error('Failed to create subitem: no subitem created');
      }

      return {
        content: `Subitem ${res.create_subitem.id} successfully created under parent item ${input.parentItemId}`,
      };
    } catch (error) {
      this.rethrowWrapped(error, 'create subitem');
    }
  }

  private async createNewItem(input: ToolInputType<CreateItemToolInput>, boardId: number): Promise<ToolOutputType<never>> {
    try {
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
    } catch (error) {
      this.rethrowWrapped(error, 'create item');
    }
    
  }

  private rethrowWrapped(error: unknown, operation: string): never {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (error instanceof Error && 'response' in error) {
      const clientError = error as any;
      if (clientError.response?.errors) {
        throw new Error(`Failed to ${operation}: ${clientError.response.errors.map((e: any) => e.message).join(', ')}`);
      }
    }
    
    throw new Error(`Failed to ${operation}: ${errorMessage}`);
  }
}
