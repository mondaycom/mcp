import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameAsync, callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';
import { GetAssetsTool } from './get-assets-tool';

describe('GetAssetsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockAsset = {
    id: '123456',
    name: 'cat.jpeg',
    file_extension: '.jpeg',
    file_size: 132612,
    public_url: 'https://files-monday-com.s3.amazonaws.com/5/resources/123456/cat.jpeg?X-Amz-Expires=3600',
    url: 'https://monday.monday.com/protected_static/5/resources/123456/cat.jpeg',
    url_thumbnail: 'https://monday.monday.com/protected_static/5/resources/123456/thumb_small-cat.jpeg',
    created_at: '2026-03-16T13:52:54Z',
    original_geometry: '1000x1000',
    uploaded_by: { id: '98531209', name: 'Marcin Polak' },
  };

  it('returns asset metadata for valid IDs', async () => {
    mocks.setResponse({ assets: [mockAsset] });

    const result = await callToolByNameAsync('get_assets', { ids: ['123456'] });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      id: '123456',
      name: 'cat.jpeg',
      file_extension: '.jpeg',
      file_size: 132612,
      public_url: expect.stringContaining('X-Amz-Expires=3600'),
      url_thumbnail: expect.stringContaining('thumb_small'),
      original_geometry: '1000x1000',
      uploaded_by: { id: '98531209', name: 'Marcin Polak' },
    });
  });

  it('returns multiple assets when multiple IDs are provided', async () => {
    const mockAsset2 = { ...mockAsset, id: '789012', name: '40mb.png', file_extension: '.png', file_size: 41997754 };
    mocks.setResponse({ assets: [mockAsset, mockAsset2] });

    const result = await callToolByNameAsync('get_assets', { ids: ['123456', '789012'] });

    expect(result.results).toHaveLength(2);
    expect(result.results[0].id).toBe('123456');
    expect(result.results[1].id).toBe('789012');
  });

  it('returns not found message for unknown IDs', async () => {
    mocks.setResponse({ assets: [] });

    const raw = await callToolByNameRawAsync('get_assets', { ids: ['99999'] });
    const text = raw.content[0].text;

    expect(text).toContain('No assets found');
    expect(text).toContain('99999');
  });

  it('handles null entries in assets array gracefully', async () => {
    mocks.setResponse({ assets: [mockAsset, null] });

    const result = await callToolByNameAsync('get_assets', { ids: ['123456', '000000'] });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe('123456');
  });

  it('handles optional fields being null', async () => {
    const assetWithNulls = { ...mockAsset, url_thumbnail: null, created_at: null, original_geometry: null };
    mocks.setResponse({ assets: [assetWithNulls] });

    const result = await callToolByNameAsync('get_assets', { ids: ['123456'] });

    expect(result.results[0].url_thumbnail).toBeNull();
    expect(result.results[0].created_at).toBeNull();
    expect(result.results[0].original_geometry).toBeNull();
  });
});
