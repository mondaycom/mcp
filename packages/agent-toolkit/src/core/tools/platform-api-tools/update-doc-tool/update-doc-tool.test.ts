import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';

const DELTA = [{ insert: { text: 'Hello' } }, { insert: { text: '\n' } }];

describe('UpdateDocTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── Validation ───────────────────────────────────────────────────────────

  it('returns error when neither doc_id nor object_id is provided', async () => {
    const result = await callToolByNameRawAsync('update_doc', {
      operations: [{ operation_type: 'set_name', name: 'New Name' }],
    });
    expect(result.content[0].text).toContain('Error: Either doc_id or object_id must be provided');
    expect(mocks.getMockRequest()).not.toHaveBeenCalled();
  });

  it('returns schema error when operations array is empty', async () => {
    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [],
    });
    expect(result.content[0].text).toContain('Invalid arguments');
    expect(mocks.getMockRequest()).not.toHaveBeenCalled();
  });

  // ─── Object ID resolution ─────────────────────────────────────────────────

  it('resolves object_id to doc_id before executing operations', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('query getDocByObjectId')) return Promise.resolve({ docs: [{ id: 'resolved_doc_789' }] });
      if (query.includes('mutation updateDocBlock')) return Promise.resolve({ update_doc_block: { id: 'block_1' } });
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      object_id: 'obj_abc',
      operations: [
        {
          operation_type: 'update_block',
          block_id: 'block_1',
          content: { block_content_type: 'text', delta_format: DELTA },
        },
      ],
    });

    expect(result.content[0].text).toContain('Doc ID: resolved_doc_789');

    const calls = mocks.getMockRequest().mock.calls;
    const resolveCall = calls.find((c: any) => c[0].includes('query getDocByObjectId'));
    expect(resolveCall).toBeDefined();
    expect(resolveCall[1]).toEqual({ objectId: ['obj_abc'] });
  });

  it('returns error when object_id resolves to no document', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('query getDocByObjectId')) return Promise.resolve({ docs: [] });
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      object_id: 'missing_obj',
      operations: [{ operation_type: 'set_name', name: 'X' }],
    });

    expect(result.content[0].text).toContain('No document found for object_id missing_obj');
  });

  // ─── set_name ────────────────────────────────────────────────────────────

  it('executes set_name operation', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation updateDocName')) return Promise.resolve({ update_doc_name: true });
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [{ operation_type: 'set_name', name: 'My New Title' }],
    });

    expect(result.content[0].text).toContain('[OK] set_name');
    expect(result.content[0].text).toContain('My New Title');
    expect(result.content[0].text).toContain('Completed 1/1');

    const calls = mocks.getMockRequest().mock.calls;
    const nameCall = calls.find((c: any) => c[0].includes('mutation updateDocName'));
    expect(nameCall[1]).toEqual({ docId: 'doc_123', name: 'My New Title' });
  });

  it('throws when update_doc_name returns null', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation updateDocName')) return Promise.resolve({ update_doc_name: null });
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [{ operation_type: 'set_name', name: 'My Title' }],
    });

    expect(result.content[0].text).toContain('[FAILED] set_name');
    expect(result.content[0].text).toContain('No confirmation from update_doc_name');
  });

  // ─── add_markdown_content ────────────────────────────────────────────────

  it('executes add_markdown_content operation', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation addContentToDocFromMarkdown')) {
        return Promise.resolve({
          add_content_to_doc_from_markdown: { success: true, block_ids: ['b1', 'b2'], error: null },
        });
      }
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [{ operation_type: 'add_markdown_content', markdown: '# Hello\n\nWorld', after_block_id: 'blk_0' }],
    });

    expect(result.content[0].text).toContain('[OK] add_markdown_content');
    expect(result.content[0].text).toContain('2 blocks added');

    const calls = mocks.getMockRequest().mock.calls;
    const mdCall = calls.find((c: any) => c[0].includes('mutation addContentToDocFromMarkdown'));
    expect(mdCall[1]).toEqual({ docId: 'doc_123', markdown: '# Hello\n\nWorld', afterBlockId: 'blk_0' });
  });

  it('throws when add_markdown_content markdown is whitespace-only', async () => {
    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [{ operation_type: 'add_markdown_content', markdown: '   ' }],
    });

    expect(result.content[0].text).toContain('[FAILED] add_markdown_content');
    expect(result.content[0].text).toContain('markdown must not be empty');
    expect(mocks.getMockRequest()).not.toHaveBeenCalled();
  });

  it('throws when add_markdown_content returns success=false', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation addContentToDocFromMarkdown')) {
        return Promise.resolve({
          add_content_to_doc_from_markdown: { success: false, block_ids: null, error: 'Bad markdown' },
        });
      }
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [{ operation_type: 'add_markdown_content', markdown: 'bad' }],
    });

    expect(result.content[0].text).toContain('[FAILED] add_markdown_content');
    expect(result.content[0].text).toContain('Bad markdown');
  });

  // ─── update_block ────────────────────────────────────────────────────────

  it('executes update_block with text content', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation updateDocBlock'))
        return Promise.resolve({
          update_doc_block: { id: 'block_abc', type: 'normal_text', created_at: '2024-01-01' },
        });
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        {
          operation_type: 'update_block',
          block_id: 'block_abc',
          content: {
            block_content_type: 'text',
            delta_format: DELTA,
            alignment: 'CENTER',
          },
        },
      ],
    });

    expect(result.content[0].text).toContain('[OK] update_block');
    expect(result.content[0].text).toContain('block_abc');

    const calls = mocks.getMockRequest().mock.calls;
    const updateCall = calls.find((c: any) => c[0].includes('mutation updateDocBlock'));
    const content = JSON.parse(updateCall[1].content);
    expect(updateCall[1].blockId).toBe('block_abc');
    expect(content.alignment).toBe('CENTER');
    expect(content.deltaFormat).toBeDefined();
  });

  it('executes update_block with list_item content (checked todo)', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation updateDocBlock')) return Promise.resolve({ update_doc_block: { id: 'block_todo' } });
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        {
          operation_type: 'update_block',
          block_id: 'block_todo',
          content: {
            block_content_type: 'list_item',
            delta_format: DELTA,
            checked: true,
            indentation: 1,
          },
        },
      ],
    });

    expect(result.content[0].text).toContain('[OK] update_block');

    const calls = mocks.getMockRequest().mock.calls;
    const updateCall = calls.find((c: any) => c[0].includes('mutation updateDocBlock'));
    const content = JSON.parse(updateCall[1].content);
    expect(content.checked).toBe(true);
    expect(content.indentation).toBe(1);
  });

  it('executes update_block with code content', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation updateDocBlock')) return Promise.resolve({ update_doc_block: { id: 'block_code' } });
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        {
          operation_type: 'update_block',
          block_id: 'block_code',
          content: {
            block_content_type: 'code',
            delta_format: DELTA,
            language: 'typescript',
          },
        },
      ],
    });

    expect(result.content[0].text).toContain('[OK] update_block');

    const calls = mocks.getMockRequest().mock.calls;
    const updateCall = calls.find((c: any) => c[0].includes('mutation updateDocBlock'));
    const content = JSON.parse(updateCall[1].content);
    expect(content.textBlockType).toBeUndefined();
    expect(content.language).toBe('typescript');
  });

  it('throws when update_doc_block returns null', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation updateDocBlock')) return Promise.resolve({ update_doc_block: null });
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        {
          operation_type: 'update_block',
          block_id: 'blk',
          content: { block_content_type: 'text', delta_format: DELTA },
        },
      ],
    });

    expect(result.content[0].text).toContain('[FAILED] update_block');
  });

  // ─── create_block ────────────────────────────────────────────────────────

  it('executes create_block with image type', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation createDocBlocks')) {
        return Promise.resolve({
          create_doc_blocks: [
            { id: 'new_block_img', type: 'image', parent_block_id: null, created_at: '2024-01-01', content: [] },
          ],
        });
      }
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        {
          operation_type: 'create_block',
          after_block_id: 'prev_block',
          block: { block_type: 'image', public_url: 'https://example.com/img.png', width: 600 },
        },
      ],
    });

    expect(result.content[0].text).toContain('[OK] create_block');
    expect(result.content[0].text).toContain('new_block_img');

    const calls = mocks.getMockRequest().mock.calls;
    const createCall = calls.find((c: any) => c[0].includes('mutation createDocBlocks'));
    expect(createCall[1].docId).toBe('doc_123');
    expect(createCall[1].afterBlockId).toBe('prev_block');
    expect(createCall[1].blocksInput[0].image_block.public_url).toBe('https://example.com/img.png');
    expect(createCall[1].blocksInput[0].image_block.width).toBe(600);
  });

  it('executes create_block with table type', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation createDocBlocks')) {
        return Promise.resolve({
          create_doc_blocks: [
            { id: 'new_table', type: 'table', parent_block_id: null, created_at: '2024-01-01', content: [] },
          ],
        });
      }
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        {
          operation_type: 'create_block',
          block: { block_type: 'table', row_count: 3, column_count: 2 },
        },
      ],
    });

    expect(result.content[0].text).toContain('[OK] create_block');

    const calls = mocks.getMockRequest().mock.calls;
    const createCall = calls.find((c: any) => c[0].includes('mutation createDocBlocks'));
    expect(createCall[1].blocksInput[0].table_block.row_count).toBe(3);
    expect(createCall[1].blocksInput[0].table_block.column_count).toBe(2);
  });

  it('injects parent_block_id into block input when provided', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation createDocBlocks')) {
        return Promise.resolve({
          create_doc_blocks: [
            { id: 'child_blk', type: 'normal_text', parent_block_id: 'cell_1', created_at: '2024-01-01', content: [] },
          ],
        });
      }
      return Promise.resolve({});
    });

    await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        {
          operation_type: 'create_block',
          parent_block_id: 'cell_1',
          block: { block_type: 'text', delta_format: DELTA },
        },
      ],
    });

    const calls = mocks.getMockRequest().mock.calls;
    const createCall = calls.find((c: any) => c[0].includes('mutation createDocBlocks'));
    expect(createCall[1].blocksInput[0].text_block.parent_block_id).toBe('cell_1');
  });

  it('throws when create_doc_blocks returns empty array', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation createDocBlocks')) return Promise.resolve({ create_doc_blocks: [] });
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [{ operation_type: 'create_block', block: { block_type: 'divider' } }],
    });

    expect(result.content[0].text).toContain('[FAILED] create_block');
  });

  // ─── delete_block ────────────────────────────────────────────────────────

  it('executes delete_block operation', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation deleteDocBlock')) return Promise.resolve({ delete_doc_block: { id: 'block_del' } });
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [{ operation_type: 'delete_block', block_id: 'block_del' }],
    });

    expect(result.content[0].text).toContain('[OK] delete_block');
    expect(result.content[0].text).toContain('block_del');

    const calls = mocks.getMockRequest().mock.calls;
    const deleteCall = calls.find((c: any) => c[0].includes('mutation deleteDocBlock'));
    expect(deleteCall[1]).toEqual({ blockId: 'block_del' });
  });

  it('throws when delete_doc_block returns null', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation deleteDocBlock')) return Promise.resolve({ delete_doc_block: null });
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [{ operation_type: 'delete_block', block_id: 'blk' }],
    });

    expect(result.content[0].text).toContain('[FAILED] delete_block');
  });

  // ─── replace_block ───────────────────────────────────────────────────────

  it('executes replace_block: delete then create', async () => {
    const callOrder: string[] = [];
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation deleteDocBlock')) {
        callOrder.push('delete');
        return Promise.resolve({ delete_doc_block: { id: 'old_block' } });
      }
      if (query.includes('mutation createDocBlocks')) {
        callOrder.push('create');
        return Promise.resolve({
          create_doc_blocks: [
            { id: 'new_block', type: 'image', parent_block_id: null, created_at: '2024-01-01', content: [] },
          ],
        });
      }
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        {
          operation_type: 'replace_block',
          block_id: 'old_block',
          after_block_id: 'prev_block',
          block: { block_type: 'image', public_url: 'https://example.com/new.png' },
        },
      ],
    });

    expect(result.content[0].text).toContain('[OK] replace_block');
    expect(callOrder).toEqual(['delete', 'create']);

    const calls = mocks.getMockRequest().mock.calls;
    const deleteCall = calls.find((c: any) => c[0].includes('mutation deleteDocBlock'));
    expect(deleteCall[1]).toEqual({ blockId: 'old_block' });

    const createCall = calls.find((c: any) => c[0].includes('mutation createDocBlocks'));
    expect(createCall[1].afterBlockId).toBe('prev_block');
    expect(createCall[1].blocksInput[0].image_block.public_url).toBe('https://example.com/new.png');
  });

  it('reports partial failure when replace_block delete succeeds but create fails', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation deleteDocBlock')) return Promise.resolve({ delete_doc_block: { id: 'old_block' } });
      if (query.includes('mutation createDocBlocks')) return Promise.resolve({ create_doc_blocks: [] });
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        {
          operation_type: 'replace_block',
          block_id: 'old_block',
          block: { block_type: 'video', raw_url: 'https://youtube.com/watch?v=abc' },
        },
      ],
    });

    // delete succeeded, create failed → replace_block failed with informative message
    expect(result.content[0].text).toContain('[FAILED] replace_block');
    expect(result.content[0].text).toContain('Original block old_block was deleted');
    expect(result.content[0].text).toContain('The original block is gone');
  });

  it('reports failure when replace_block delete step fails', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation deleteDocBlock')) return Promise.resolve({ delete_doc_block: null });
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [{ operation_type: 'replace_block', block_id: 'old_block', block: { block_type: 'divider' } }],
    });

    expect(result.content[0].text).toContain('[FAILED] replace_block');
    expect(result.content[0].text).toContain('No response from delete_doc_block');
    // Should NOT contain "original block is gone" since delete itself failed
    expect(result.content[0].text).not.toContain('original block is gone');
  });

  // ─── create_block with asset_id ──────────────────────────────────────────

  it('fails when image block has neither public_url nor asset_id', async () => {
    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        {
          operation_type: 'create_block',
          block: { block_type: 'image' },
        },
      ],
    });

    expect(result.content[0].text).toContain('[FAILED] create_block');
    expect(result.content[0].text).toContain('image block requires either asset_id or public_url');
    expect(mocks.getMockRequest()).not.toHaveBeenCalled();
  });

  it('creates image block with asset_id', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation createDocBlocks')) {
        return Promise.resolve({
          create_doc_blocks: [
            { id: 'img_block_1', type: 'image', parent_block_id: null, created_at: '2024-01-01' },
          ],
        });
      }
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        {
          operation_type: 'create_block',
          block: { block_type: 'image', asset_id: 9999, width: 400 },
        },
      ],
    });

    expect(result.content[0].text).toContain('[OK] create_block');
    expect(result.content[0].text).toContain('img_block_1');

    const calls = mocks.getMockRequest().mock.calls;
    const createCall = calls.find((c: any) => c[0].includes('mutation createDocBlocks'));
    expect(createCall[1].blocksInput[0].image_block.asset_id).toBe('9999');
    expect(createCall[1].blocksInput[0].image_block.width).toBe(400);
    expect(createCall[1].blocksInput[0].image_block.public_url).toBeUndefined();
  });

  it('creates image block with asset_id passed as string', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation createDocBlocks')) {
        return Promise.resolve({
          create_doc_blocks: [
            { id: 'img_block_2', type: 'image', parent_block_id: null, created_at: '2024-01-01' },
          ],
        });
      }
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        {
          operation_type: 'create_block',
          block: { block_type: 'image', asset_id: '12345' },
        },
      ],
    });

    expect(result.content[0].text).toContain('[OK] create_block');

    const calls = mocks.getMockRequest().mock.calls;
    const createCall = calls.find((c: any) => c[0].includes('mutation createDocBlocks'));
    expect(createCall[1].blocksInput[0].image_block.asset_id).toBe('12345');
  });

  it('handles replace_block with asset_id image', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation deleteDocBlock')) {
        return Promise.resolve({ delete_doc_block: { id: 'old_img' } });
      }
      if (query.includes('mutation createDocBlocks')) {
        return Promise.resolve({
          create_doc_blocks: [{ id: 'new_img', type: 'image', parent_block_id: null, created_at: '2024-01-01' }],
        });
      }
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        {
          operation_type: 'replace_block',
          block_id: 'old_img',
          block: { block_type: 'image', asset_id: 5555 },
        },
      ],
    });

    expect(result.content[0].text).toContain('[OK] replace_block');
    expect(result.content[0].text).toContain('new_img');

    const calls = mocks.getMockRequest().mock.calls;
    const createCall = calls.find((c: any) => c[0].includes('mutation createDocBlocks'));
    expect(createCall[1].blocksInput[0].image_block.asset_id).toBe('5555');
    expect(createCall[1].blocksInput[0].image_block.public_url).toBeUndefined();
  });

  // ─── Multiple operations & fail-fast ─────────────────────────────────────

  it('executes multiple operations in order and returns all results', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation updateDocName')) return Promise.resolve({ update_doc_name: true });
      if (query.includes('mutation updateDocBlock')) return Promise.resolve({ update_doc_block: { id: 'blk' } });
      if (query.includes('mutation deleteDocBlock')) return Promise.resolve({ delete_doc_block: { id: 'del_blk' } });
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        { operation_type: 'set_name', name: 'Updated Title' },
        {
          operation_type: 'update_block',
          block_id: 'blk',
          content: { block_content_type: 'text', delta_format: DELTA },
        },
        { operation_type: 'delete_block', block_id: 'del_blk' },
      ],
    });

    expect(result.content[0].text).toContain('Completed 3/3');
    expect(result.content[0].text).toContain('[OK] set_name');
    expect(result.content[0].text).toContain('[OK] update_block');
    expect(result.content[0].text).toContain('[OK] delete_block');
  });

  it('stops at first failure (fail-fast) and does not execute subsequent operations', async () => {
    let deleteCalled = false;

    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation updateDocName')) return Promise.reject(new Error('Name service down'));
      if (query.includes('mutation deleteDocBlock')) {
        deleteCalled = true;
        return Promise.resolve({ delete_doc_block: { id: 'blk' } });
      }
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        { operation_type: 'set_name', name: 'Title' },
        { operation_type: 'delete_block', block_id: 'blk' },
      ],
    });

    expect(result.content[0].text).toContain('Completed 0/2');
    expect(result.content[0].text).toContain('[FAILED] set_name');
    expect(result.content[0].text).toContain('Name service down');
    expect(deleteCalled).toBe(false);
  });

  // ─── Mention blot (update_block path — raw JSON format) ──────────────────

  it('sends mention blot in raw JSON format for update_block', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation updateDocBlock')) return Promise.resolve({ update_doc_block: { id: 'blk' } });
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        {
          operation_type: 'update_block',
          block_id: 'blk',
          content: {
            block_content_type: 'text',
            delta_format: [
              { insert: { text: 'Hey ' } },
              { insert: { mention: { id: 12345, type: 'USER' } } },
              { insert: { text: '\n' } },
            ],
          },
        },
      ],
    });

    expect(result.content[0].text).toContain('[OK] update_block');

    const calls = mocks.getMockRequest().mock.calls;
    const updateCall = calls.find((c: any) => c[0].includes('mutation updateDocBlock'));
    const content = JSON.parse(updateCall[1].content);
    expect(content.deltaFormat[0]).toEqual({ insert: 'Hey ' });
    expect(content.deltaFormat[1]).toEqual({ insert: { mention: { id: 12345, type: 'USER' } } });
    expect(content.deltaFormat[2]).toEqual({ insert: '\n' });
  });

  // ─── Mention blot (create_block path — GraphQL BlotInput format) ──────────

  it('sends mention blot with BlotInput wrapper for create_block', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation createDocBlocks')) {
        return Promise.resolve({
          create_doc_blocks: [{ id: 'new_blk', type: 'normal_text', parent_block_id: null, created_at: '', content: [] }],
        });
      }
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        {
          operation_type: 'create_block',
          block: {
            block_type: 'text',
            delta_format: [
              { insert: { mention: { id: 99, type: 'USER' } } },
              { insert: { text: ' please review\n' } },
            ],
          },
        },
      ],
    });

    expect(result.content[0].text).toContain('[OK] create_block');

    const calls = mocks.getMockRequest().mock.calls;
    const createCall = calls.find((c: any) => c[0].includes('mutation createDocBlocks'));
    const deltaFormat = createCall[1].blocksInput[0].text_block.delta_format;
    expect(deltaFormat[0]).toEqual({ insert: { blot: { mention: { id: '99', type: 'USER' } } } });
    expect(deltaFormat[1]).toEqual({ insert: { text: ' please review\n' }, attributes: undefined });
  });

  // ─── Column value blot (create_block path — GraphQL BlotInput format) ─────

  it('sends column_value blot with BlotInput wrapper for create_block', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation createDocBlocks')) {
        return Promise.resolve({
          create_doc_blocks: [{ id: 'new_blk', type: 'normal_text', parent_block_id: null, created_at: '', content: [] }],
        });
      }
      return Promise.resolve({});
    });

    await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        {
          operation_type: 'create_block',
          block: {
            block_type: 'text',
            delta_format: [
              { insert: { column_value: { item_id: 111, column_id: 'status' } } },
              { insert: { text: '\n' } },
            ],
          },
        },
      ],
    });

    const calls = mocks.getMockRequest().mock.calls;
    const createCall = calls.find((c: any) => c[0].includes('mutation createDocBlocks'));
    const deltaFormat = createCall[1].blocksInput[0].text_block.delta_format;
    expect(deltaFormat[0]).toEqual({ insert: { blot: { column_value: { item_id: '111', column_id: 'status' } } } });
  });

  // ─── add_comment ─────────────────────────────────────────────────────────

  it('creates a new comment on a document using object_id', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('query getDocByObjectId')) return Promise.resolve({ docs: [{ id: 'doc_resolved' }] });
      if (query.includes('query getDocBoardItem')) {
        return Promise.resolve({ boards: [{ items_page: { items: [{ id: '99001' }] } }] });
      }
      if (query.includes('mutation createDocComment')) {
        return Promise.resolve({ create_update: { id: 'upd_123', body: 'Hello', created_at: '2024-01-01' } });
      }
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      object_id: 'obj_board_555',
      operations: [{ operation_type: 'add_comment', body: '<p>Hello world</p>' }],
    });

    expect(result.content[0].text).toContain('[OK] add_comment');
    expect(result.content[0].text).toContain('Comment created');
    expect(result.content[0].text).toContain('upd_123');

    const calls = mocks.getMockRequest().mock.calls;
    const boardItemCall = calls.find((c: any) => c[0].includes('query getDocBoardItem'));
    expect(boardItemCall[1]).toEqual({ boardId: 'obj_board_555' });

    const commentCall = calls.find((c: any) => c[0].includes('mutation createDocComment'));
    expect(commentCall[1]).toEqual({ itemId: '99001', body: '<p>Hello world</p>', parentId: undefined });
  });

  it('creates a reply comment using parent_update_id', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('query getDocObjectIdByDocId')) {
        return Promise.resolve({ docs: [{ id: 'doc_123', object_id: 'board_777' }] });
      }
      if (query.includes('query getDocBoardItem')) {
        return Promise.resolve({ boards: [{ items_page: { items: [{ id: '88001' }] } }] });
      }
      if (query.includes('mutation createDocComment')) {
        return Promise.resolve({ create_update: { id: 'reply_456', body: 'Reply', created_at: '2024-01-01' } });
      }
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [{ operation_type: 'add_comment', body: '<p>Reply here</p>', parent_update_id: 42 }],
    });

    expect(result.content[0].text).toContain('[OK] add_comment');
    expect(result.content[0].text).toContain('Reply to update 42');
    expect(result.content[0].text).toContain('reply_456');

    const calls = mocks.getMockRequest().mock.calls;
    const commentCall = calls.find((c: any) => c[0].includes('mutation createDocComment'));
    expect(commentCall[1]).toEqual({ itemId: '88001', body: '<p>Reply here</p>', parentId: '42' });
  });

  it('fails when no item found on backing board', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('query getDocObjectIdByDocId')) {
        return Promise.resolve({ docs: [{ id: 'doc_123', object_id: 'board_999' }] });
      }
      if (query.includes('query getDocBoardItem')) {
        return Promise.resolve({ boards: [{ items_page: { items: [] } }] });
      }
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [{ operation_type: 'add_comment', body: '<p>Test</p>' }],
    });

    expect(result.content[0].text).toContain('[FAILED] add_comment');
    expect(result.content[0].text).toContain('No item found');
  });

  it('fails when object_id cannot be resolved from doc_id', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('query getDocObjectIdByDocId')) {
        return Promise.resolve({ docs: [] });
      }
      return Promise.resolve({});
    });

    const result = await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_unknown',
      operations: [{ operation_type: 'add_comment', body: '<p>Test</p>' }],
    });

    expect(result.content[0].text).toContain('[FAILED] add_comment');
    expect(result.content[0].text).toContain('Could not resolve object_id');
  });

  // ─── Column value blot (update_block path — macro format) ─────────────────

  it('sends column_value as macro format for update_block', async () => {
    jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
      if (query.includes('mutation updateDocBlock')) return Promise.resolve({ update_doc_block: { id: 'blk' } });
      return Promise.resolve({});
    });

    await callToolByNameRawAsync('update_doc', {
      doc_id: 'doc_123',
      operations: [
        {
          operation_type: 'update_block',
          block_id: 'blk',
          content: {
            block_content_type: 'text',
            delta_format: [
              { insert: { column_value: { item_id: 222, column_id: 'date4' } } },
              { insert: { text: '\n' } },
            ],
          },
        },
      ],
    });

    const calls = mocks.getMockRequest().mock.calls;
    const updateCall = calls.find((c: any) => c[0].includes('mutation updateDocBlock'));
    const content = JSON.parse(updateCall[1].content);
    const macroOp = content.deltaFormat[0];
    expect(macroOp.insert.macro.type).toBe('COLUMN_VALUE');
    expect(macroOp.insert.macro.macroData).toEqual({ itemId: 222, columnId: 'date4' });
    expect(macroOp.insert.macro.macroId).toBeDefined();
  });
});
