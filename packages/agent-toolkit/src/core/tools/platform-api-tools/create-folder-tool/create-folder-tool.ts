import { z } from 'zod';
import {
  FolderColor,
  FolderFontWeight,
  FolderCustomIcon,
  CreateFolderMutation,
  CreateFolderMutationVariables,
} from '../../../../monday-graphql/generated/graphql';
import { createFolderTool } from './create-folder-tool.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

export const createFolderToolSchema = {
  workspaceId: z.string().describe('The ID of the workspace where the folder will be created'),
  name: z.string().describe('The name of the folder to be created'),
  color: z.nativeEnum(FolderColor).optional().describe('The color of the folder'),
  fontWeight: z.nativeEnum(FolderFontWeight).optional().describe('The font weight of the folder'),
  customIcon: z.nativeEnum(FolderCustomIcon).optional().describe('The custom icon of the folder'),
  parentFolderId: z.string().optional().describe('The ID of the parent folder'),
};

export type CreateFolderToolInput = typeof createFolderToolSchema;

export class CreateFolderTool extends BaseMondayApiTool<CreateFolderToolInput> {
  name = 'create_folder';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Folder',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Create a new folder in a monday.com workspace';
  }

  getInputSchema(): CreateFolderToolInput {
    return createFolderToolSchema;
  }

  protected async executeInternal(input: ToolInputType<CreateFolderToolInput>): Promise<ToolOutputType<never>> {
    const variables: CreateFolderMutationVariables = {
      workspaceId: input.workspaceId,
      name: input.name,
      color: input.color,
      fontWeight: input.fontWeight,
      customIcon: input.customIcon,
      parentFolderId: input.parentFolderId,
    };

    const res = await this.mondayApi.request<CreateFolderMutation>(createFolderTool, variables);

    return {
      content: `Folder ${res.create_folder?.id} successfully created`,
    };
  }
}
