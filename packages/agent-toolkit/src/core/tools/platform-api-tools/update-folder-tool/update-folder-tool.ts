import { z } from 'zod';
import { updateFolder } from './update-folder-tool.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { FolderColor, FolderFontWeight, FolderCustomIcon, ObjectType } from 'src/monday-graphql/generated/graphql';

export const updateFolderToolSchema = {
  folderId: z.string().describe('The ID of the folder to update'),
  name: z.string().optional().describe('The new name of the folder'),
  color: z.nativeEnum(FolderColor).optional().describe('The new color of the folder'),
  fontWeight: z.nativeEnum(FolderFontWeight).optional().describe('The new font weight of the folder'),
  customIcon: z.nativeEnum(FolderCustomIcon).optional().describe('The new custom icon of the folder'),
  parentFolderId: z.string().optional().describe('The ID of the new parent folder'),
  workspaceId: z.string().optional().describe('The ID of the workspace containing the folder'),
  accountProductId: z.string().optional().describe('The account product ID associated with the folder'),
  position: z
    .object({
      object_id: z.string().describe('The ID of the object to position the folder relative to'),
      object_type: z.nativeEnum(ObjectType).describe('The type of object to position the folder relative to'),
      is_after: z.boolean().optional().describe('Whether to position the folder after the object'),
    })
    .optional()
    .describe('The new position of the folder'),
};

export type UpdateFolderToolInput = typeof updateFolderToolSchema;

export class UpdateFolderTool extends BaseMondayApiTool<UpdateFolderToolInput> {
  name = 'update_folder';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update Folder',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Update an existing folder in monday.com';
  }

  getInputSchema(): UpdateFolderToolInput {
    return updateFolderToolSchema;
  }

  protected async executeInternal(input: ToolInputType<UpdateFolderToolInput>): Promise<ToolOutputType<never>> {
    const variables = {
      folderId: input.folderId,
      name: input.name,
      color: input.color,
      fontWeight: input.fontWeight,
      customIcon: input.customIcon,
      parentFolderId: input.parentFolderId,
      workspaceId: input.workspaceId,
      accountProductId: input.accountProductId,
      position: input.position,
    };

    const res = await this.mondayApi.request<{ update_folder: { id: string } }>(updateFolder, variables);

    return {
      content: `Folder ${res.update_folder?.id} successfully updated`,
    };
  }
}
