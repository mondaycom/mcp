import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { completeUploadMutationDev } from './finalize-asset-upload.graphql.dev';
import { updateAssetsOnItem } from '../update-assets-on-item-tool/update-assets-on-item.graphql';

export const finalizeAssetUploadSchema = {
  uploadId: z.string().describe('The upload_id returned by get_asset_upload_url'),
  etag: z.string().describe('The ETag header value from the PUT response when uploading to the presigned URL'),
  boardId: z.string().describe("The board's unique identifier"),
  itemId: z.string().describe("The item's unique identifier to attach the file to"),
  columnId: z.string().describe("The file column's unique identifier on the board"),
  fileName: z.string().describe('Display name for the file in the column (e.g. "report.pdf")'),
};

interface CompleteUploadMutation {
  complete_upload: {
    id: number;
    filename: string;
    content_type: string;
    file_size: number;
    url: string;
    created_at: string;
    is_image: boolean;
    url_thumb: string | null;
  };
}

interface UpdateAssetsOnItemMutation {
  update_assets_on_item?: { id: string; name: string };
}

export class FinalizeAssetUploadTool extends BaseMondayApiTool<typeof finalizeAssetUploadSchema, never> {
  name = 'finalize_asset_upload';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Finalize Asset Upload',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return (
      "Finalize a file upload and attach it to an item's file column. " +
      'Call this after uploading the file to the presigned URL from get_asset_upload_url. ' +
      'Requires the etag value from the PUT response headers. ' +
      'This completes the upload, creates the asset, and sets it on the specified file column.'
    );
  }

  getInputSchema(): typeof finalizeAssetUploadSchema {
    return finalizeAssetUploadSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof finalizeAssetUploadSchema>,
  ): Promise<ToolOutputType<never>> {
    const completeRes = await this.mondayApi.request<CompleteUploadMutation>(
      completeUploadMutationDev,
      {
        input: {
          upload_id: input.uploadId,
          holder: { type: 'ITEM', id: input.itemId },
          board_id: input.boardId,
          parts: [{ part_number: 1, etag: input.etag }],
        },
      },
      { versionOverride: 'dev' },
    );

    const asset = completeRes.complete_upload;

    // Step 2: Attach asset to file column via existing mutation
    await this.mondayApi.request<UpdateAssetsOnItemMutation>(updateAssetsOnItem, {
      boardId: input.boardId,
      itemId: input.itemId,
      columnId: input.columnId,
      files: [{ fileType: 'asset', name: input.fileName, assetId: asset.id }],
    });

    return {
      content: {
        asset_id: asset.id,
        filename: asset.filename,
        content_type: asset.content_type,
        file_size: asset.file_size,
        url: asset.url,
        is_image: asset.is_image,
        url_thumb: asset.url_thumb,
        status: 'attached',
        item_id: input.itemId,
        column_id: input.columnId,
      },
    };
  }
}
