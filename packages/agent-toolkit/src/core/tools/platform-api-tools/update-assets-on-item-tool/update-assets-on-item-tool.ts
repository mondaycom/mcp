import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { updateAssetsOnItem } from './update-assets-on-item.graphql';

const fileInputSchema = z.object({
  fileType: z
    .enum(['google_drive', 'dropbox', 'box', 'onedrive', 'link', 'asset', 'doc'])
    .describe(
      'The type of file: "asset" for uploaded files (requires assetId), "doc" for monday docs (requires objectId), "link" for generic links, "google_drive", "dropbox", "box", "onedrive" for cloud storage links (all link types require linkToFile)',
    ),
  name: z.string().describe('File display name'),
  linkToFile: z.string().optional().describe('File link URL. Required for link, google_drive, dropbox, box, and onedrive file types'),
  assetId: z.number().optional().describe("The asset's ID. Required when fileType is 'asset'"),
  objectId: z.number().optional().describe("The doc's ID. Required when fileType is 'doc'"),
});

export const updateAssetsOnItemToolSchema = {
  boardId: z.number().describe("The board's unique identifier"),
  itemId: z.number().describe("The item's unique identifier"),
  columnId: z.string().describe("The file or doc column's unique identifier"),
  files: z.array(fileInputSchema).describe('Array of file values to set on the column'),
};

interface UpdateAssetsOnItemMutation {
  update_assets_on_item?: {
    id: string;
    name: string;
  };
}

interface UpdateAssetsOnItemMutationVariables {
  boardId: string;
  itemId: string;
  columnId: string;
  files: Array<{
    fileType: string;
    name: string;
    linkToFile?: string;
    assetId?: number;
    objectId?: number;
  }>;
}

export class UpdateAssetsOnItemTool extends BaseMondayApiTool<typeof updateAssetsOnItemToolSchema, never> {
  name = 'update_assets_on_item';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update Assets On Item',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Update a file or doc column value on an item using existing assets, docs, or links. Sets the column to the provided list of files, adding new ones and removing any not in the list.';
  }

  getInputSchema(): typeof updateAssetsOnItemToolSchema {
    return updateAssetsOnItemToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof updateAssetsOnItemToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables: UpdateAssetsOnItemMutationVariables = {
      boardId: input.boardId.toString(),
      itemId: input.itemId.toString(),
      columnId: input.columnId,
      files: input.files,
    };

    const res = await this.mondayApi.request<UpdateAssetsOnItemMutation>(updateAssetsOnItem, variables);

    return {
      content: `Item ${res.update_assets_on_item?.id} (${res.update_assets_on_item?.name}) assets successfully updated`,
    };
  }
}
