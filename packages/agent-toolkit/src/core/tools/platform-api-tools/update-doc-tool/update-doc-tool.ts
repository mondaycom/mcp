import {
  updateDocBlock,
  deleteDocBlock,
  createDocBlocks,
  updateDocName,
  addContentToDocFromMarkdown,
  getDocByObjectId,
  getDocById,
  getBoardDataForAsset,
  addFileToColumn,
} from './update-doc-tool.graphql';

import {
  UpdateDocBlockMutation,
  UpdateDocBlockMutationVariables,
  DeleteDocBlockMutation,
  DeleteDocBlockMutationVariables,
  CreateDocBlocksMutation,
  CreateDocBlocksMutationVariables,
  UpdateDocNameMutation,
  UpdateDocNameMutationVariables,
  AddContentToDocFromMarkdownMutation,
  AddContentToDocFromMarkdownMutationVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { buildUpdateBlockContent, buildCreateBlockInput } from './update-doc-tool.helpers';
import { updateDocToolSchema, UpdateBlockContent, CreateBlock } from './update-doc-tool.schema';

export { updateDocToolSchema };

// ─── Resolve object_id type ──────────────────────────────────────────────────

type DocQueryResult = {
  docs?: Array<{ id: string; object_id: string } | null> | null;
};

type BoardDataForAssetQuery = {
  boards?: Array<{
    columns?: Array<{ id: string }> | null;
    items_page?: { items?: Array<{ id: string }> | null } | null;
  }> | null;
};

// ─── Tool class ───────────────────────────────────────────────────────────────

export class UpdateDocTool extends BaseMondayApiTool<typeof updateDocToolSchema> {
  name = 'update_doc';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update Document',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Update an existing monday.com document. Provide doc_id (preferred) or object_id, plus an ordered operations array (executed sequentially, stops on first failure).

OPERATIONS:
- set_name: Rename the document.
- add_markdown_content: Append markdown as blocks (or insert after a block). Best for text, headings, lists, simple tables — no block IDs needed.
- update_block: Update content of an existing text, code, or list_item block in-place.
- create_block: Create a new block at a precise position. Use parent_block_id to nest inside notice_box, table cell, or layout cell.
- delete_block: Remove any block. The ONLY option for BOARD, WIDGET, DOC embed, and GIPHY blocks.
- replace_block: Delete a block and create a new one in its place (use when update_block is not supported).
- add_image_from_file: Upload an image file (base64) and insert it as an image block. Use when the content to update contains an image provided as a file, NOT a public URL. The board context (file column and item) is resolved automatically from the document's object_id.

WHEN TO USE EACH OPERATION:
- text / code / list_item → update_block; use replace_block to change subtype (e.g. NORMAL_TEXT→LARGE_TITLE)
- divider / table / image (public URL) / video / notice_box / layout → replace_block (properties immutable after creation)
- image from file (not a public URL) → add_image_from_file (uploads file, then creates image block)
- BOARD / WIDGET / DOC / GIPHY → delete_block only

GETTING BLOCK IDs: Call read_docs with include_blocks: true — returns id, type, position, and content per block.

BLOCK CONTENT (delta_format): Array of insert ops. Last op MUST be {insert: {text: "\\n"}}.
- Plain: [{insert: {text: "Hello"}}, {insert: {text: "\\n"}}]
- Bold: [{insert: {text: "Hi"}, attributes: {bold: true}}, {insert: {text: "\\n"}}]
- Supported attributes: bold, italic, underline, strike, code, link, color, background`;
  }

  getInputSchema(): typeof updateDocToolSchema {
    return updateDocToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof updateDocToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.doc_id && !input.object_id) {
      return { content: 'Error: Either doc_id or object_id must be provided.' };
    }

    try {
      // Resolve doc_id and object_id — we need both for full functionality
      let docId = input.doc_id;
      let objectId = input.object_id;

      if (!docId && objectId) {
        // Resolve doc_id from object_id
        const res = await this.mondayApi.request<DocQueryResult>(getDocByObjectId, {
          objectId: [objectId],
        });
        const doc = res.docs?.[0];
        if (!doc) {
          return { content: `Error: No document found for object_id ${objectId}.` };
        }
        docId = doc.id;
      } else if (docId && !objectId) {
        // Resolve object_id from doc_id (needed for add_image_from_file board context)
        const hasImageOp = input.operations.some((op) => op.operation_type === 'add_image_from_file');
        if (hasImageOp) {
          const res = await this.mondayApi.request<DocQueryResult>(getDocById, {
            docId: [docId],
          });
          const doc = res.docs?.[0];
          if (!doc?.object_id) {
            return { content: `Error: Could not resolve board context for doc_id ${docId}. Provide object_id for image upload.` };
          }
          objectId = doc.object_id;
        }
      }

      const results: string[] = [];
      let failedAt: number | null = null;

      for (let i = 0; i < input.operations.length; i++) {
        const op = input.operations[i];
        try {
          const result = await this.executeOperation(docId!, objectId, op);
          results.push(`- [OK] ${op.operation_type}${result ? `: ${result}` : ''}`);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          results.push(`- [FAILED] ${op.operation_type}: ${errMsg}`);
          failedAt = i;
          break;
        }
      }

      const completed = failedAt !== null ? failedAt : input.operations.length;
      const total = input.operations.length;
      const summary = `Completed ${completed}/${total} operation${total === 1 ? '' : 's'} on doc ${docId}.`;

      return {
        content: `${summary}\n\nResults:\n${results.join('\n')}\n\nDoc ID: ${docId}`,
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      return {
        content: `Error: ${errMsg}`,
      };
    }
  }

  private async executeOperation(
    docId: string,
    objectId: string | undefined,
    op: ToolInputType<typeof updateDocToolSchema>['operations'][number],
  ): Promise<string> {
    switch (op.operation_type) {
      case 'set_name':
        return this.executeSetName(docId, op.name);
      case 'add_markdown_content':
        return this.executeAddMarkdown(docId, op.markdown, op.after_block_id);
      case 'update_block':
        return this.executeUpdateBlock(op.block_id, op.content as UpdateBlockContent);
      case 'create_block':
        return this.executeCreateBlock(docId, op.block as CreateBlock, op.after_block_id, op.parent_block_id);
      case 'delete_block':
        return this.executeDeleteBlock(op.block_id);
      case 'replace_block':
        return this.executeReplaceBlock(
          docId,
          op.block_id,
          op.block as CreateBlock,
          op.after_block_id,
          op.parent_block_id,
        );
      case 'add_image_from_file':
        return this.executeAddImageFromFile(
          docId,
          objectId,
          op.file_base64,
          op.file_name,
          op.after_block_id,
          op.parent_block_id,
          op.width,
        );
      default: {
        const unhandled = (op as { operation_type: string }).operation_type;
        throw new Error(`Unsupported operation type: "${unhandled}"`);
      }
    }
  }

  private async executeSetName(docId: string, name: string): Promise<string> {
    const variables: UpdateDocNameMutationVariables = { docId, name };
    const res = await this.mondayApi.request<UpdateDocNameMutation>(updateDocName, variables);
    if (!res?.update_doc_name) {
      throw new Error(`No confirmation from update_doc_name — rename to "${name}" may not have applied`);
    }
    return `Renamed to "${name}"`;
  }

  private async executeAddMarkdown(docId: string, markdown: string, afterBlockId?: string): Promise<string> {
    if (!markdown.trim()) {
      throw new Error('markdown must not be empty');
    }
    const variables: AddContentToDocFromMarkdownMutationVariables = { docId, markdown, afterBlockId };
    const res = await this.mondayApi.request<AddContentToDocFromMarkdownMutation>(
      addContentToDocFromMarkdown,
      variables,
    );

    const result = res?.add_content_to_doc_from_markdown;
    if (!result?.success) {
      throw new Error(result?.error || 'Failed to add markdown content');
    }
    const count = result.block_ids?.length ?? 0;
    return `${count} block${count === 1 ? '' : 's'} added${result.block_ids?.length ? `. Block IDs: ${result.block_ids.join(', ')}` : ''}`;
  }

  private async executeUpdateBlock(blockId: string, content: UpdateBlockContent): Promise<string> {
    const rawContent = buildUpdateBlockContent(content);
    const variables: UpdateDocBlockMutationVariables = { blockId, content: JSON.stringify(rawContent) };
    const res = await this.mondayApi.request<UpdateDocBlockMutation>(updateDocBlock, variables);

    if (!res?.update_doc_block) {
      throw new Error('No response from update_doc_block');
    }
    return `Block ${blockId} updated`;
  }

  private async executeCreateBlock(
    docId: string,
    block: CreateBlock,
    afterBlockId?: string,
    parentBlockId?: string,
  ): Promise<string> {
    const blockInput = buildCreateBlockInput(block);

    // Inject parent_block_id into the block input if provided
    if (parentBlockId) {
      const keys = Object.keys(blockInput);
      if (keys.length !== 1) {
        throw new Error(
          `Cannot inject parent_block_id: expected exactly 1 key in block input, got: ${keys.join(', ')}`,
        );
      }
      const blockKey = keys[0] as keyof typeof blockInput;
      const blockValue = blockInput[blockKey];
      if (!blockValue || typeof blockValue !== 'object') {
        throw new Error(`Cannot inject parent_block_id into block type "${blockKey}" — block value is not an object`);
      }
      (blockValue as Record<string, unknown>).parent_block_id = parentBlockId;
    }

    const variables: CreateDocBlocksMutationVariables = {
      docId,
      afterBlockId,
      blocksInput: [blockInput],
    };
    const res = await this.mondayApi.request<CreateDocBlocksMutation>(createDocBlocks, variables);

    const created = res?.create_doc_blocks;
    if (!created || created.length === 0) {
      throw new Error('No blocks returned from create_doc_blocks');
    }
    const createdIds = created.map((b) => b.id).join(', ');
    return `Block created (ID: ${createdIds})`;
  }

  private async executeDeleteBlock(blockId: string): Promise<string> {
    const variables: DeleteDocBlockMutationVariables = { blockId };
    const res = await this.mondayApi.request<DeleteDocBlockMutation>(deleteDocBlock, variables);

    if (!res?.delete_doc_block) {
      throw new Error('No response from delete_doc_block');
    }
    return `Block ${blockId} deleted`;
  }

  private async executeAddImageFromFile(
    docId: string,
    objectId: string | undefined,
    fileBase64: string,
    fileName: string,
    afterBlockId?: string,
    parentBlockId?: string,
    width?: number,
  ): Promise<string> {
    if (!objectId) {
      throw new Error(
        'Cannot upload image: object_id is required to resolve board context. Provide object_id in the tool input.',
      );
    }

    // Step 0: Resolve board context — find a file column and an item on the board
    const boardRes = await this.mondayApi.request<BoardDataForAssetQuery>(getBoardDataForAsset, {
      objectId,
    });

    const board = boardRes.boards?.[0];
    const columnId = board?.columns?.[0]?.id;
    const itemId = board?.items_page?.items?.[0]?.id;

    if (!columnId) {
      throw new Error(
        `No file column found on board ${objectId}. The board must have at least one file-type column to upload images.`,
      );
    }
    if (!itemId) {
      throw new Error(
        `No items found on board ${objectId}. The board must have at least one item to upload files to.`,
      );
    }

    // Step 1: Decode base64 and upload file via add_file_to_column
    const buffer = Buffer.from(fileBase64, 'base64');
    const mimeType = this.getMimeType(fileName);
    // File is available natively in Node 20+; for Node 18, construct from Blob with name
    const file =
      typeof globalThis.File !== 'undefined'
        ? new File([buffer], fileName, { type: mimeType })
        : Object.assign(new Blob([buffer], { type: mimeType }), { name: fileName });

    const uploadRes = await this.mondayApi.request<{
      add_file_to_column?: { id: string };
    }>(addFileToColumn, { file, itemId, columnId });

    const asset = uploadRes.add_file_to_column;
    if (!asset?.id) {
      throw new Error('File upload failed — no asset ID returned from add_file_to_column');
    }

    // Step 2: Create image block in the doc using the uploaded asset's ID
    const createResult = await this.executeCreateBlock(
      docId,
      { block_type: 'image' as const, asset_id: asset.id, width },
      afterBlockId,
      parentBlockId,
    );

    return `Image uploaded (asset ID: ${asset.id}). ${createResult}`;
  }

  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private async executeReplaceBlock(
    docId: string,
    blockId: string,
    block: CreateBlock,
    afterBlockId?: string,
    parentBlockId?: string,
  ): Promise<string> {
    // Delete first
    await this.executeDeleteBlock(blockId);
    // Then create — if this fails, the original block is already gone
    try {
      const createResult = await this.executeCreateBlock(docId, block, afterBlockId, parentBlockId);
      return `Block ${blockId} replaced. ${createResult}`;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Original block ${blockId} was deleted, but replacement creation failed: ${errMsg}. The original block is gone.`,
      );
    }
  }
}
