import { createMockApiClient } from '../test-utils/mock-api-client';
import { FinalizeAssetUploadTool } from './finalize-asset-upload-tool';

const MOCK_ASSET = {
  id: 987654,
  filename: 'report.pdf',
  content_type: 'application/pdf',
  file_size: 1024,
  url: '/protected_static/12345/resources/987654/report.pdf',
  created_at: '2026-04-17T00:00:00Z',
  is_image: false,
  url_thumb: null,
};

describe('FinalizeAssetUploadTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
  });

  it('completes upload and attaches asset to file column', async () => {
    mocks.mockRequest
      .mockResolvedValueOnce({ complete_upload: MOCK_ASSET })
      .mockResolvedValueOnce({ update_assets_on_item: { id: '42', name: 'Test Item' } });

    const tool = new FinalizeAssetUploadTool(mocks.mockApiClient);
    const result = await tool.execute({
      uploadId: 'uuid-upload-123',
      boardId: '100',
      itemId: '42',
      columnId: 'files',
      fileName: 'report.pdf',
    });

    expect(result.content).toEqual(
      expect.objectContaining({
        asset_id: 987654,
        filename: 'report.pdf',
        status: 'attached',
        item_id: '42',
        column_id: 'files',
      }),
    );

    // Verify complete_upload call (dev override, dummy etag)
    expect(mocks.mockRequest).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        input: {
          upload_id: 'uuid-upload-123',
          holder: { type: 'ITEM', id: '42' },
          board_id: '100',
          parts: [{ part_number: 1, etag: '0' }],
        },
      },
      expect.objectContaining({ versionOverride: 'dev' }),
    );

    // Verify update_assets_on_item call (no dev override)
    expect(mocks.mockRequest).toHaveBeenNthCalledWith(2, expect.anything(), {
      boardId: '100',
      itemId: '42',
      columnId: 'files',
      files: [{ fileType: 'asset', name: 'report.pdf', assetId: 987654 }],
    });
  });

  it('propagates complete_upload errors', async () => {
    mocks.mockRequest.mockRejectedValueOnce(new Error('Upload not found'));
    const tool = new FinalizeAssetUploadTool(mocks.mockApiClient);

    await expect(
      tool.execute({ uploadId: 'bad', boardId: '100', itemId: '42', columnId: 'files', fileName: 'f.pdf' }),
    ).rejects.toThrow('Upload not found');
  });

  it('propagates update_assets_on_item errors after successful complete', async () => {
    mocks.mockRequest
      .mockResolvedValueOnce({ complete_upload: MOCK_ASSET })
      .mockRejectedValueOnce(new Error('Column not found'));

    const tool = new FinalizeAssetUploadTool(mocks.mockApiClient);

    await expect(
      tool.execute({ uploadId: 'uuid-123', boardId: '100', itemId: '42', columnId: 'bad', fileName: 'f.pdf' }),
    ).rejects.toThrow('Column not found');
  });

  it('has correct metadata', () => {
    const tool = new FinalizeAssetUploadTool(mocks.mockApiClient);
    expect(tool.name).toBe('finalize_asset_upload');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('get_asset_upload_url');
    expect(tool.getDescription()).toContain('file column');
  });
});
