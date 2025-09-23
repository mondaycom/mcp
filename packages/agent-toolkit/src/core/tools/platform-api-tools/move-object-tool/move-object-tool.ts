import { z } from 'zod';
import { updateFolder } from '../update-folder-tool/update-folder-tool.graphql';
import { updateBoardHierarchy, updateOverviewHierarchy } from './move-object-tool.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { ObjectType, UpdateOverviewHierarchyMutation } from 'src/monday-graphql/generated/graphql';
import { UpdateBoardHierarchyMutation, UpdateFolderMutation } from 'src/monday-graphql/generated/graphql';

export const moveObjectToolSchema = {
  objectType: z.nativeEnum(ObjectType).describe('The type of object to move'),
  id: z.string().describe('The ID of the object to move'),
  position: z
    .object({
      object_id: z.string().describe('The ID of the object to position the object relative to'),
      object_type: z.nativeEnum(ObjectType).describe('The type of object to position the object relative to'),
      is_after: z.boolean().optional().describe('Whether to position the object after the object'),
    })
    .optional()
    .describe('The new position of the object. Required if changing the position based on another object.'),
  parentFolderId: z
    .string()
    .optional()
    .describe('The ID of the new parent folder. Required if moving to a different folder.'),
  workspaceId: z
    .string()
    .optional()
    .describe('The ID of the workspace containing the object. Required if moving to a different workspace.'),
  accountProductId: z
    .string()
    .optional()
    .describe(
      'The ID of the account product containing the object. Required if moving to a different account product.',
    ),
};

export type MoveObjectToolInput = typeof moveObjectToolSchema;

export class MoveObjectTool extends BaseMondayApiTool<MoveObjectToolInput> {
  name = 'move_object';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Move Object',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Move a folder, board, or overview in monday.com. Use `position` for relative placement based on another object, `parentFolderId` for folder changes, `workspaceId` for workspace moves, and `accountProductId` for account product changes.';
  }

  getInputSchema(): MoveObjectToolInput {
    return moveObjectToolSchema;
  }

  private async executeUpdateFolder(input: ToolInputType<MoveObjectToolInput>): Promise<ToolOutputType<never>> {
    const { id, position, parentFolderId, workspaceId, accountProductId } = input;
    const variables = { folderId: id, position, parentFolderId, workspaceId, accountProductId };

    const res = await this.mondayApi.request<UpdateFolderMutation>(updateFolder, variables);

    return {
      content: `Object ${res.update_folder?.id} successfully moved`,
    };
  }

  private async executeUpdateBoardHierarchy(input: ToolInputType<MoveObjectToolInput>): Promise<ToolOutputType<never>> {
    const { id, position, parentFolderId, workspaceId, accountProductId } = input;
    const variables = {
      boardId: id,
      attributes: {
        position,
        folder_id: parentFolderId,
        workspace_id: workspaceId,
        account_product_id: accountProductId,
      },
    };

    const res = await this.mondayApi.request<UpdateBoardHierarchyMutation>(updateBoardHierarchy, variables);

    return res.update_board_hierarchy?.success
      ? {
          content: `Board ${res.update_board_hierarchy?.board?.id} position updated successfully`,
        }
      : {
          content: `Board position updated failed: ${res.update_board_hierarchy?.message}`,
        };
  }

  private async executeUpdateOverviewHierarchy(
    input: ToolInputType<MoveObjectToolInput>,
  ): Promise<ToolOutputType<never>> {
    const { id, position, parentFolderId, workspaceId, accountProductId } = input;
    const variables = {
      overviewId: id,
      attributes: {
        position,
        folder_id: parentFolderId,
        workspace_id: workspaceId,
        account_product_id: accountProductId,
      },
    };

    const res = await this.mondayApi.request<UpdateOverviewHierarchyMutation>(updateOverviewHierarchy, variables);

    return res.update_overview_hierarchy?.success
      ? {
          content: `Overview ${res.update_overview_hierarchy?.overview?.id} position updated successfully`,
        }
      : {
          content: `Overview position updated failed: ${res.update_overview_hierarchy?.message}`,
        };
  }

  protected async executeInternal(input: ToolInputType<MoveObjectToolInput>): Promise<ToolOutputType<never>> {
    const { objectType } = input;

    switch (objectType) {
      case ObjectType.Folder:
        return this.executeUpdateFolder(input);
      case ObjectType.Board:
        return this.executeUpdateBoardHierarchy(input);
      case ObjectType.Overview:
        return this.executeUpdateOverviewHierarchy(input);
      default:
        throw new Error(`Unsupported object type: ${objectType}`);
    }
  }
}
