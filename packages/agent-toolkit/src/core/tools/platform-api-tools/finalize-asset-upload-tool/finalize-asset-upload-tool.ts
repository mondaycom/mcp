import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { completeUploadMutationDev } from './finalize-asset-upload.graphql.dev';
import { changeColumnValue } from './change-column-value.graphql';

export const finalizeAssetUploadSchema = {
  uploadId: z.string().describe('The upload_id returned by get_asset_upload_url'),
  etag: z.string().describe('The ETag header value from the PUT response when uploading to the presigned URL'),
  boardId: z.string().describe("The board's unique identifier"),
  itemId: z.string().describe("The item's unique identifier"),
  columnId: z.string().describe("The file or doc column's unique identifier to attach the uploaded asset to"),
};

interface CompleteUploadMutation {
  complete_upload: {
    id: number;
    filename: string;
    content_type: string;
    file_size: number;
    url: string;
    created_at: string;
    filelink: string;
  };
}

interface ChangeColumnValueMutation {
  change_column_value?: { id: string };
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
      'Finalize a file upload and create the asset on monday.com. ' +
      'Call this after uploading the file to the presigned URL from get_asset_upload_url. ' +
      'Requires the etag value from the PUT response headers. ' +
      'Automatically attaches the uploaded asset to the specified file column on the item. ' +
      'Returns the created asset_id.'
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
      // complete_upload is only available in the dev schema; remove versionOverride once promoted to stable
      { versionOverride: 'dev' },
    );

    const asset = completeRes.complete_upload;

    const value = JSON.stringify({
      added_file: {
        fileType: 'ASSET',
        name: asset.filename,
        assetId: String(asset.id),
      },
    });

    await this.mondayApi.request<ChangeColumnValueMutation>(changeColumnValue, {
      boardId: input.boardId,
      itemId: input.itemId,
      columnId: input.columnId,
      value,
    });

    return {
      content: {
        asset_id: asset.id,
        filename: asset.filename,
        content_type: asset.content_type,
        file_size: asset.file_size,
        url: asset.url,
        filelink: asset.filelink,
      },
    };
  }
}
