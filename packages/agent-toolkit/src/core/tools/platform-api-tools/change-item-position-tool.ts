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
export type ChangeItemPositionToolInput = typeof changeItemPositionToolSchema;

const MIN_API_VERSION = '2025-10';
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
    return changeItemPositionToolSchema;
  }

  protected async executeInternal(input: ToolInputType<ChangeItemPositionToolInput>): Promise<ToolOutputType<never>> {
    // Validate the input based on the positioning method
    const apiVersion = this.mondayApi.apiVersion;
    if (apiVersion != 'dev' || apiVersion < MIN_API_VERSION) {
      throw new Error(`This tool is not supported in the ${apiVersion} API version`);
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
