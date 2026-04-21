import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getFileColumnValue } from './get-file-column-value.graphql';
import { updateAssetsOnItem } from '../update-assets-on-item-tool/update-assets-on-item.graphql';

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

type FileInput = {
  fileType: string;
  name: string;
  linkToFile?: string;
  assetId?: number;
  objectId?: number;
};

type FileValueItem =
  | { __typename: 'FileAssetValue'; asset_id: string; name: string }
  | { __typename: 'FileDocValue'; object_id: string; doc: { name: string } }
  | { __typename: 'FileLinkValue'; name: string; kind: string; url: string | null }
  | { __typename: string };

interface GetFileColumnValueQuery {
  items: Array<{
    column_values: Array<{
      files?: FileValueItem[];
    }>;
  }>;
}

interface UpdateAssetsOnItemMutation {
  update_assets_on_item?: { id: string; name: string };
}

function mapToFileInput(item: FileValueItem): FileInput | null {
  switch (item.__typename) {
    case 'FileAssetValue':
      return { fileType: 'asset', name: (item as any).name, assetId: Number((item as any).asset_id) };
    case 'FileDocValue': {
      const docItem = item as { __typename: 'FileDocValue'; object_id: string; doc: { name: string } };
      return { fileType: 'doc', name: docItem.doc?.name ?? String(docItem.object_id), objectId: Number(docItem.object_id) };
    }
    case 'FileLinkValue': {
      const linkItem = item as { __typename: 'FileLinkValue'; name: string; kind: string; url: string | null };
      return { fileType: linkItem.kind, name: linkItem.name, linkToFile: linkItem.url ?? undefined };
    }
    default:
      return null;
  }
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
      'Fetches the current column state first, then updates with the new file appended. ' +
      'Use this instead of update_assets_on_item when you want to add a file without replacing existing ones.'
    );
  }

  getInputSchema(): typeof appendFileToColumnSchema {
    return appendFileToColumnSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof appendFileToColumnSchema>): Promise<ToolOutputType<never>> {
    const queryRes = await this.mondayApi.request<GetFileColumnValueQuery>(getFileColumnValue, {
      itemId: input.itemId,
      columnId: input.columnId,
    });

    const existingFiles: FileInput[] = (queryRes.items?.[0]?.column_values?.[0]?.files ?? [])
      .map(mapToFileInput)
      .filter((f): f is FileInput => f !== null);

    const files = [...existingFiles, input.file];

    const updateRes = await this.mondayApi.request<UpdateAssetsOnItemMutation>(updateAssetsOnItem, {
      boardId: input.boardId,
      itemId: input.itemId,
      columnId: input.columnId,
      files,
    });

    return {
      content: {
        item_id: updateRes.update_assets_on_item?.id,
        item_name: updateRes.update_assets_on_item?.name,
        total_files: files.length,
        column_id: input.columnId,
      },
    };
  }
}
