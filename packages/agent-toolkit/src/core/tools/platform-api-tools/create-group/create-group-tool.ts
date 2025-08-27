import { z } from 'zod';
import {
  PositionRelative,
  CreateGroupMutation,
  CreateGroupMutationVariables,
} from '../../../../monday-graphql';
import { createGroup } from './create-group.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

export const createGroupToolSchema = {
  boardId: z.string().describe('The ID of the board to create the group in'),
  groupName: z.string().max(255).describe('The name of the new group (maximum 255 characters)'),
  groupColor: z.string().optional().describe('The HEX code color for the group (e.g., #ff642e)'),
  relativeTo: z.string().optional().describe('The ID of the group to position this new group relative to'),
  positionRelativeMethod: z.nativeEnum(PositionRelative).optional().describe('Whether to position the new group before or after the relativeTo group'),
};

export class CreateGroupTool extends BaseMondayApiTool<typeof createGroupToolSchema, never> {
  name = 'create_group';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Group',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Create a new group in a Monday.com board. Groups are sections that organize related items (e.g., "To Do", "In Progress", "Done"). Use when users want to add structure, categorize items, or create workflow phases. Groups can be positioned relative to existing groups and assigned predefined colors.';
  }

  getInputSchema(): typeof createGroupToolSchema {
    return createGroupToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof createGroupToolSchema>): Promise<ToolOutputType<never>> {
    const variables: CreateGroupMutationVariables = {
      boardId: input.boardId,
      groupName: input.groupName,
      groupColor: input.groupColor,
      relativeTo: input.relativeTo,
      positionRelativeMethod: input.positionRelativeMethod,
    };

    const res = await this.mondayApi.request<CreateGroupMutation>(createGroup, variables);

    return {
      content: `Group "${res.create_group?.title}" (ID: ${res.create_group?.id}) successfully created`,
    };
  }
}
