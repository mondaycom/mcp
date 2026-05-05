import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { createUploadMutationDev } from './get-asset-upload-url.graphql.dev';

export const getAssetUploadUrlSchema = {
  fileName: z.string().describe('The name of the file to upload, including extension (e.g. "report.pdf")'),
  contentType: z.string().describe('The MIME type of the file (e.g. "application/pdf", "image/png", "text/plain")'),
  fileSize: z.number().int().positive().max(524288000).describe('The file size in bytes. Maximum 500MB (524288000 bytes)'),
};

interface CreateUploadMutation {
  create_upload: {
    upload_id: string;
    parts: Array<{ part_number: number; url: string; size_range_start: number; size_range_end: number }>;
    part_size: number;
    expires_at: string;
  };
}

export class GetAssetUploadUrlTool extends BaseMondayApiTool<typeof getAssetUploadUrlSchema, never> {
  name = 'get_asset_upload_url';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Get Asset Upload URL',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return (
      'Get a presigned URL to upload a file to monday.com. Returns an upload_id and upload_url.\n\n' +
      'After calling this tool, upload the file to the returned URL using an HTTP PUT request ' +
      'and capture the ETag header from the response:\n\n' +
      'curl -i -X PUT "<upload_url>" \\\n' +
      '  -H "Content-Type: <the contentType you provided>" \\\n' +
      '  --data-binary @<local_file_path>\n\n' +
      'The response includes an ETag header (e.g. ETag: "abc123...") — save this value.\n\n' +
      'Then call finalize_asset_upload with the upload_id, etag, board_id, item_id, and column_id ' +
      "to complete the upload and attach the file to an item's file column.\n\n" +
      'Max file size: 500MB.'
    );
  }

  getInputSchema(): typeof getAssetUploadUrlSchema {
    return getAssetUploadUrlSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof getAssetUploadUrlSchema>): Promise<ToolOutputType<never>> {
    const res = await this.mondayApi.request<CreateUploadMutation>(
      createUploadMutationDev,
      {
        input: {
          file_name: input.fileName,
          content_type: input.contentType,
          file_size: input.fileSize,
          source: 'mcp',
          multipart: false,
        },
      },
      // create_upload is only available in the dev schema; remove versionOverride once promoted to stable
      { versionOverride: 'dev' },
    );

    const upload = res.create_upload;
    const uploadUrl = upload.parts[0]?.url;
    if (!uploadUrl) {
      throw new Error('create_upload returned no upload URL — parts array was empty');
    }

    return {
      content: {
        upload_id: upload.upload_id,
        upload_url: uploadUrl,
        url_expires_at: upload.expires_at,
      },
    };
  }
}
