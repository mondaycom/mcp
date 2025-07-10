import { z } from 'zod';
import {
  ChangeItemPositionMutation,
  ChangeItemPositionMutationVariables,
  PositionRelative,
} from '../../../monday-graphql/generated/graphql';
import { changeItemPosition } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const changeItemPositionToolSchema = {
  itemId: z.number().describe('The ID of the item to be moved'),
  relativeTo: z
    .number()
    .optional()
    .describe('The ID of the item to position relative to (required when using position_relative_method)'),
  positionRelativeMethod: z
    .enum(['after_at', 'before_at'])
    .optional()
    .describe('The position relative method to another item (after_at / before_at)'),
  groupId: z.string().optional().describe('The group ID to move the item to (required when using group_top)'),
  groupTop: z
    .boolean()
    .optional()
    .describe('Whether to position the item at the top of the group (true) or bottom (false)'),
};

export const changeItemPositionInBoardToolSchema = {
  boardId: z.number().describe('The ID of the board that contains the item to be moved'),
  ...changeItemPositionToolSchema,
};

export type ChangeItemPositionToolInput =
  | typeof changeItemPositionToolSchema
  | typeof changeItemPositionInBoardToolSchema;

export class ChangeItemPositionTool extends BaseMondayApiTool<ChangeItemPositionToolInput> {
  name = 'change_item_position';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Change Item Position',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Change the position of an item in a monday.com board. You can move an item relative to another item (before/after) or to the top/bottom of a group.';
  }

  getInputSchema(): ChangeItemPositionToolInput {
    if (this.context?.boardId) {
      return changeItemPositionToolSchema;
    }

    return changeItemPositionInBoardToolSchema;
  }

  protected async executeInternal(input: ToolInputType<ChangeItemPositionToolInput>): Promise<ToolOutputType<never>> {
    const boardId =
      this.context?.boardId ?? (input as ToolInputType<typeof changeItemPositionInBoardToolSchema>).boardId;

    // Validate the input based on the positioning method
    if (input.positionRelativeMethod && !input.relativeTo) {
      throw new Error('relativeTo is required when using positionRelativeMethod');
    }

    if (input.groupTop !== undefined && !input.groupId) {
      throw new Error('groupId is required when using groupTop');
    }

    if (!input.positionRelativeMethod && !input.groupId) {
      throw new Error('Either positionRelativeMethod with relativeTo or groupId with groupTop must be provided');
    }

    const variables: ChangeItemPositionMutationVariables = {
      item_id: input.itemId.toString(),
      relative_to: input.relativeTo?.toString(),
      position_relative_method: input.positionRelativeMethod as PositionRelative,
      group_id: input.groupId,
      group_top: input.groupTop,
    };

    const res = await this.mondayApi.request<ChangeItemPositionMutation>(changeItemPosition, variables);

    if (!res.change_item_position) {
      throw new Error('Failed to change item position');
    }

    return {
      content: `Item ${res.change_item_position.id} successfully moved to new position${
        res.change_item_position.group?.id ? ` in group ${res.change_item_position.group.id}` : ''
      }`,
    };
  }
}
