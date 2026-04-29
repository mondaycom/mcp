import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { changeColumnValue } from './change-column-value.graphql';

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

export const appendFileToColumnSchema = {
  boardId: z.string().describe("The board's unique identifier"),
  itemId: z.string().describe("The item's unique identifier"),
  columnId: z.string().describe("The file or doc column's unique identifier"),
  file: fileInputSchema.describe('The file to append to the column'),
};

interface ChangeColumnValueMutation {
  change_column_value?: { id: string };
}

export class AppendFileToColumnTool extends BaseMondayApiTool<typeof appendFileToColumnSchema, never> {
  name = 'append_file_to_column';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Append File To Column',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return (
      'Append a file to a file column on an item without removing existing files. ' +
      'Use this instead of update_assets_on_item when you want to add a file without replacing existing ones.'
    );
  }

  getInputSchema(): typeof appendFileToColumnSchema {
    return appendFileToColumnSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof appendFileToColumnSchema>): Promise<ToolOutputType<never>> {
    const addedFile: Record<string, unknown> = {
      fileType: input.file.fileType.toUpperCase(),
      name: input.file.name,
    };
    if (input.file.assetId !== undefined) addedFile.assetId = String(input.file.assetId);
    if (input.file.objectId !== undefined) addedFile.objectId = String(input.file.objectId);
    if (input.file.linkToFile !== undefined) addedFile.linkToFile = input.file.linkToFile;

    const value = JSON.stringify({ added_file: addedFile });

    const res = await this.mondayApi.request<ChangeColumnValueMutation>(changeColumnValue, {
      boardId: input.boardId,
      itemId: input.itemId,
      columnId: input.columnId,
      value,
    });

    return {
      content: {
        item_id: res.change_column_value?.id,
        column_id: input.columnId,
      },
    };
  }
}
