import { z } from 'zod';
import { MoveItemToGroupMutation, MoveItemToGroupMutationVariables } from '../../../monday-graphql/generated/graphql';
import { moveItemToGroup } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const moveItemToGroupToolSchema = {
  itemId: z.number().describe('The id of the item to which the update will be added'),
  groupId: z.string().describe('The id of the group to which the item will be moved'),
};

export class MoveItemToGroupTool extends BaseMondayApiTool<typeof moveItemToGroupToolSchema> {
  name = 'move_item_to_group';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Move Item to Group',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Move an item to a group in a monday.com board';
  }

  getInputSchema(): typeof moveItemToGroupToolSchema {
    return moveItemToGroupToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof moveItemToGroupToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables: MoveItemToGroupMutationVariables = {
      itemId: input.itemId.toString(),
      groupId: input.groupId,
    };

    const res = await this.mondayApi.request<MoveItemToGroupMutation>(moveItemToGroup, variables);

    return {
      content: `Item ${res.move_item_to_group?.id} successfully moved to group ${input.groupId}`,
    };
  }
}
