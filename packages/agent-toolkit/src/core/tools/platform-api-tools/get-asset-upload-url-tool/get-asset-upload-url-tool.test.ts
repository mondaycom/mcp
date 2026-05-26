import { createMockApiClient } from '../test-utils/mock-api-client';
import { GetAssetUploadUrlTool } from './get-asset-upload-url-tool';

describe('GetAssetUploadUrlTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
  });

  it('returns upload_id, upload_url, and url_expires_at', async () => {
    mocks.setResponse({
      create_upload: {
        upload_id: 'uuid-123',
        parts: [{ part_number: 1, url: 'https://s3.example.com/presigned', size_range_start: 0, size_range_end: 1023 }],
        part_size: 1024,
        expires_at: '2026-04-17T12:00:00Z',
      },
    });

    const tool = new GetAssetUploadUrlTool(mocks.mockApiClient);
    const result = await tool.execute({ fileName: 'test.pdf', contentType: 'application/pdf', fileSize: 1024 });

    expect(result.content).toEqual({
      upload_id: 'uuid-123',
      upload_url: 'https://s3.example.com/presigned',
      url_expires_at: '2026-04-17T12:00:00Z',
    });
  });

  it('passes correct variables with versionOverride dev', async () => {
    mocks.setResponse({
      create_upload: {
        upload_id: 'uuid-456',
        parts: [{ part_number: 1, url: 'https://s3.example.com/url2', size_range_start: 0, size_range_end: 2047 }],
        part_size: 2048,
        expires_at: '2026-04-18T00:00:00Z',
      },
    });

    const tool = new GetAssetUploadUrlTool(mocks.mockApiClient);
    await tool.execute({ fileName: 'photo.jpg', contentType: 'image/jpeg', fileSize: 2048 });

    expect(mocks.mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      {
        input: {
          file_name: 'photo.jpg',
          content_type: 'image/jpeg',
          file_size: 2048,
          source: 'mcp',
          multipart: false,
        },
      },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('throws when parts array is empty', async () => {
    mocks.setResponse({
      create_upload: {
        upload_id: 'uuid-999',
        parts: [],
        part_size: 1024,
        expires_at: '2026-04-17T12:00:00Z',
      },
    });

    const tool = new GetAssetUploadUrlTool(mocks.mockApiClient);
    await expect(
      tool.execute({ fileName: 'test.pdf', contentType: 'application/pdf', fileSize: 1024 }),
    ).rejects.toThrow('create_upload returned no upload URL');
  });

  it('has correct metadata', () => {
    const tool = new GetAssetUploadUrlTool(mocks.mockApiClient);
    expect(tool.name).toBe('get_asset_upload_url');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('curl');
    expect(tool.getDescription()).toContain('ETag');
    expect(tool.getDescription()).toContain('finalize_asset_upload');
  });
});
