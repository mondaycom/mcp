import { createMockApiClient } from '../test-utils/mock-api-client';
import { AppendFileToColumnTool } from './append-file-to-column-tool';

const COLUMN_VALUE_WITH_ASSET = {
  items: [
    {
      column_values: [
        {
          files: [{ __typename: 'FileAssetValue', asset_id: '111', name: 'existing.pdf' }],
        },
      ],
    },
  ],
};

const COLUMN_VALUE_WITH_MIXED = {
  items: [
    {
      column_values: [
        {
          files: [
            { __typename: 'FileAssetValue', asset_id: '111', name: 'asset.pdf' },
            { __typename: 'FileDocValue', object_id: '222', doc: { name: 'My Doc' } },
            { __typename: 'FileLinkValue', name: 'Drive File', kind: 'google_drive', url: 'https://drive.google.com/file' },
          ],
        },
      ],
    },
  ],
};

const COLUMN_VALUE_EMPTY = {
  items: [{ column_values: [{}] }],
};

const UPDATE_RESPONSE = { update_assets_on_item: { id: '42', name: 'Test Item' } };

describe('AppendFileToColumnTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
  });

  it('appends new file to existing asset', async () => {
    mocks.mockRequest.mockResolvedValueOnce(COLUMN_VALUE_WITH_ASSET).mockResolvedValueOnce(UPDATE_RESPONSE);

    const tool = new AppendFileToColumnTool(mocks.mockApiClient);
    const result = await tool.execute({
      boardId: '100',
      itemId: '42',
      columnId: 'files',
      file: { fileType: 'asset', name: 'new.png', assetId: 999 },
    });

    expect(result.content).toMatchObject({ item_id: '42', total_files: 2 });

    expect(mocks.mockRequest).toHaveBeenNthCalledWith(2, expect.anything(), {
      boardId: '100',
      itemId: '42',
      columnId: 'files',
      files: [
        { fileType: 'asset', name: 'existing.pdf', assetId: 111 },
        { fileType: 'asset', name: 'new.png', assetId: 999 },
      ],
    });
  });

  it('correctly maps all file value types', async () => {
    mocks.mockRequest.mockResolvedValueOnce(COLUMN_VALUE_WITH_MIXED).mockResolvedValueOnce(UPDATE_RESPONSE);

    const tool = new AppendFileToColumnTool(mocks.mockApiClient);
    await tool.execute({
      boardId: '100',
      itemId: '42',
      columnId: 'files',
      file: { fileType: 'link', name: 'ref.html', linkToFile: 'https://example.com' },
    });

    const updateCall = mocks.mockRequest.mock.calls[1];
    expect(updateCall[1].files).toEqual([
      { fileType: 'asset', name: 'asset.pdf', assetId: 111 },
      { fileType: 'doc', name: 'My Doc', objectId: 222 },
      { fileType: 'google_drive', name: 'Drive File', linkToFile: 'https://drive.google.com/file' },
      { fileType: 'link', name: 'ref.html', linkToFile: 'https://example.com' },
    ]);
  });

  it('appends to empty column (no existing files)', async () => {
    mocks.mockRequest.mockResolvedValueOnce(COLUMN_VALUE_EMPTY).mockResolvedValueOnce(UPDATE_RESPONSE);

    const tool = new AppendFileToColumnTool(mocks.mockApiClient);
    const result = await tool.execute({
      boardId: '100',
      itemId: '42',
      columnId: 'files',
      file: { fileType: 'asset', name: 'first.pdf', assetId: 777 },
    });

    expect(result.content).toMatchObject({ total_files: 1 });
    expect(mocks.mockRequest).toHaveBeenNthCalledWith(2, expect.anything(), {
      boardId: '100',
      itemId: '42',
      columnId: 'files',
      files: [{ fileType: 'asset', name: 'first.pdf', assetId: 777 }],
    });
  });

  it('skips FileAssetInvalidValue entries', async () => {
    mocks.mockRequest
      .mockResolvedValueOnce({
        items: [{ column_values: [{ files: [{ __typename: 'FileAssetInvalidValue', asset_id: 'bad' }] }] }],
      })
      .mockResolvedValueOnce(UPDATE_RESPONSE);

    const tool = new AppendFileToColumnTool(mocks.mockApiClient);
    const result = await tool.execute({
      boardId: '100',
      itemId: '42',
      columnId: 'files',
      file: { fileType: 'asset', name: 'good.pdf', assetId: 555 },
    });

    expect(result.content).toMatchObject({ total_files: 1 });
  });

  it('has correct metadata', () => {
    const tool = new AppendFileToColumnTool(mocks.mockApiClient);
    expect(tool.name).toBe('append_file_to_column');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('update_assets_on_item');
    expect(tool.getDescription()).toContain('existing');
  });
});
