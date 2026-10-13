import { z } from 'zod';
import {
  MoveItemToGroupMutation,
  MoveItemToGroupMutationVariables,
} from 'src/monday-graphql/generated/graphql/graphql';
import { moveItemToGroup } from 'src/monday-graphql/queries.graphql';
import { rethrowWithContext } from '../../../utils';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const moveItemToGroupToolSchema = {
  itemId: z.number().describe('The id of the item to move'),
  groupId: z
    .string()
    .describe(
      "The id of the group to which the item will be moved. Must be a group on the item's board, read from get_board_info in this run — never guessed from the group title.",
    ),
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
    return 'Move an item to another group on the same monday.com board. It cannot move an item to a different board.';
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

    let res: MoveItemToGroupMutation;
    try {
      res = await this.mondayApi.request<MoveItemToGroupMutation>(moveItemToGroup, variables);
    } catch (error) {
      rethrowWithContext(error, 'move item to group');
    }

    return {
      content: `Item ${res.move_item_to_group?.id} successfully moved to group ${input.groupId}`,
    };
  }
}
