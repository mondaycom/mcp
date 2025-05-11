import { z } from 'zod';
import { DeleteItemMutation, DeleteItemMutationVariables } from '../../../monday-graphql/generated/graphql';
import { deleteItem } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool } from './base-monday-api-tool';

export const deleteItemToolSchema = {
  itemId: z.number(),
};

export class DeleteItemTool extends BaseMondayApiTool<typeof deleteItemToolSchema, never> {
  name = 'delete_item';
  type = ToolType.WRITE;

  getDescription(): string {
    return 'Delete an item';
  }

  getInputSchema(): typeof deleteItemToolSchema {
    return deleteItemToolSchema;
  }

  async execute(input: ToolInputType<typeof deleteItemToolSchema>): Promise<ToolOutputType<never>> {
    const variables: DeleteItemMutationVariables = {
      id: input.itemId.toString(),
    };

    const res = await this.mondayApi.request<DeleteItemMutation>(deleteItem, variables);

    return {
      content: `Item ${res.delete_item?.id} successfully deleted`,
    };
  }
}
