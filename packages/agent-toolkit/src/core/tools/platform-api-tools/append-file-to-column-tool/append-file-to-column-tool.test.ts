import { createMockApiClient } from '../test-utils/mock-api-client';
import { AppendFileToColumnTool } from './append-file-to-column-tool';

const CHANGE_COLUMN_RESPONSE = { change_column_value: { id: '42' } };

describe('AppendFileToColumnTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
  });

  it('calls change_column_value with correct added_file payload for asset', async () => {
    mocks.mockRequest.mockResolvedValueOnce(CHANGE_COLUMN_RESPONSE);

    const tool = new AppendFileToColumnTool(mocks.mockApiClient);
    const result = await tool.execute({
      boardId: '100',
      itemId: '42',
      columnId: 'files',
      file: { fileType: 'asset', name: 'new.png', assetId: 999 },
    });

    expect(result.content).toMatchObject({ item_id: '42', column_id: 'files' });
    expect(mocks.mockRequest).toHaveBeenCalledTimes(1);
    expect(mocks.mockRequest).toHaveBeenCalledWith(expect.anything(), {
      boardId: '100',
      itemId: '42',
      columnId: 'files',
      value: JSON.stringify({ added_file: { fileType: 'ASSET', name: 'new.png', assetId: '999' } }),
    });
  });

  it('calls change_column_value with correct added_file payload for doc', async () => {
    mocks.mockRequest.mockResolvedValueOnce(CHANGE_COLUMN_RESPONSE);

    const tool = new AppendFileToColumnTool(mocks.mockApiClient);
    await tool.execute({
      boardId: '100',
      itemId: '42',
      columnId: 'files',
      file: { fileType: 'doc', name: 'My Doc', objectId: 222 },
    });

    expect(mocks.mockRequest).toHaveBeenCalledWith(expect.anything(), {
      boardId: '100',
      itemId: '42',
      columnId: 'files',
      value: JSON.stringify({ added_file: { fileType: 'DOC', name: 'My Doc', objectId: '222' } }),
    });
  });

  it('calls change_column_value with correct added_file payload for link', async () => {
    mocks.mockRequest.mockResolvedValueOnce(CHANGE_COLUMN_RESPONSE);

    const tool = new AppendFileToColumnTool(mocks.mockApiClient);
    await tool.execute({
      boardId: '100',
      itemId: '42',
      columnId: 'files',
      file: { fileType: 'google_drive', name: 'Drive File', linkToFile: 'https://drive.google.com/file' },
    });

    expect(mocks.mockRequest).toHaveBeenCalledWith(expect.anything(), {
      boardId: '100',
      itemId: '42',
      columnId: 'files',
      value: JSON.stringify({ added_file: { fileType: 'GOOGLE_DRIVE', name: 'Drive File', linkToFile: 'https://drive.google.com/file' } }),
    });
  });

  it('makes exactly one API call', async () => {
    mocks.mockRequest.mockResolvedValueOnce(CHANGE_COLUMN_RESPONSE);

    const tool = new AppendFileToColumnTool(mocks.mockApiClient);
    await tool.execute({
      boardId: '100',
      itemId: '42',
      columnId: 'files',
      file: { fileType: 'asset', name: 'file.pdf', assetId: 1 },
    });

    expect(mocks.mockRequest).toHaveBeenCalledTimes(1);
  });

  it('has correct metadata', () => {
    const tool = new AppendFileToColumnTool(mocks.mockApiClient);
    expect(tool.name).toBe('append_file_to_column');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('update_assets_on_item');
  });
});
