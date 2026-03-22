import {
  updateDocBlock,
  deleteDocBlock,
  createDocBlocks,
  updateDocName,
  addContentToDocFromMarkdown,
  getDocByObjectId,
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

type GetDocByObjectIdQuery = {
  docs?: Array<{ id: string } | null> | null;
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
    return `Update an existing monday.com document. Supports renaming, updating block content, creating new blocks, deleting blocks, and replacing blocks (delete + recreate).

IDENTIFICATION: Provide doc_id (preferred, from read_docs) or object_id (from read_docs or doc URL).

OPERATIONS — specify as an ordered array (executed sequentially, stops on first failure):
- set_name: Rename the document.
- add_markdown_content: Convert markdown to blocks and append (or insert after a block). Best for adding new text sections, headings, bullet lists, numbered lists, or simple tables — no block IDs needed.
- update_block: Replace the text content of an existing text, code, or list_item block in-place. Only these 3 block types are supported — for everything else use replace_block.
- create_block: Create a new block at a precise position. Supports all creatable types (text, list_item, code, divider, page_break, image, video, notice_box, table, layout). Use parent_block_id to place content inside a table cell, layout cell, or notice_box.
- delete_block: Permanently remove any block. The ONLY supported operation for BOARD, WIDGET, DOC embed, and GIPHY blocks (those cannot be created or replaced via API).
- replace_block: Delete a block and immediately create a new one in its place. Use this when update_block is not supported for the block type.

WHICH OPERATION TO USE — quick reference by block type:
- text / code / list_item → update_block (change content), or replace_block (change subtype e.g. NORMAL_TEXT→LARGE_TITLE, BULLETED_LIST→CHECK_LIST)
- divider → replace_block (update_block not supported by API)
- table → replace_block (update_block not supported by API)
- image → replace_block (public_url is immutable after creation)
- video → replace_block (raw_url is immutable after creation)
- notice_box → replace_block (theme is immutable after creation)
- layout → replace_block (column structure is immutable)
- BOARD / WIDGET / DOC embed / GIPHY → delete_block only (no API to create or replace)

CHOOSING BETWEEN add_markdown_content AND create_block:
- Use add_markdown_content when adding text, headings, bullets, or simple tables — it's simpler and handles formatting automatically.
- Use create_block when you need: an image, video, layout, notice_box, or table with specific dimensions; exact positioning using after_block_id; or nesting inside another block via parent_block_id.

GETTING BLOCK IDs: Call read_docs first — the response includes a blocks array with id, type, position, and content for each block.

BLOCK CONTENT FORMAT for update_block/create_block:
Last operation in delta_format MUST always be {insert: {text: "\\n"}}.

Examples:
- Plain text: [{insert: {text: "Hello world"}}, {insert: {text: "\\n"}}]
- Mixed formatting: [{insert: {text: "Hello "}}, {insert: {text: "bold"}, attributes: {bold: true}}, {insert: {text: " and "}}, {insert: {text: "italic"}, attributes: {italic: true}}, {insert: {text: "\\n"}}]
- Inline code + link: [{insert: {text: "Run "}}, {insert: {text: "npm install"}, attributes: {code: true}}, {insert: {text: " or see "}}, {insert: {text: "docs"}, attributes: {link: "https://example.com"}}, {insert: {text: "\\n"}}]
- Multiple attributes: [{insert: {text: "Critical!"}, attributes: {bold: true, italic: true, color: "#ff0000"}}, {insert: {text: "\\n"}}]
- Strikethrough + underline: [{insert: {text: "old value"}, attributes: {strike: true}}, {insert: {text: " new value"}, attributes: {underline: true}}, {insert: {text: "\\n"}}]
- Background highlight: [{insert: {text: "highlighted"}, attributes: {background: "#ffff00"}}, {insert: {text: "\\n"}}]

LIMITATIONS: BOARD, WIDGET, DOC embed, and GIPHY blocks cannot be created via the API. Use delete_block to remove them if needed.`;
  }

  getInputSchema(): typeof updateDocToolSchema {
    return updateDocToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof updateDocToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.doc_id && !input.object_id) {
      return { content: 'Error: Either doc_id or object_id must be provided.' };
    }

    try {
      // Resolve doc_id from object_id if needed
      let docId = input.doc_id;
      if (!docId) {
        const res = await this.mondayApi.request<GetDocByObjectIdQuery>(getDocByObjectId, {
          objectId: [input.object_id],
        });
        const doc = res.docs?.[0];
        if (!doc) {
          return { content: `Error: No document found for object_id ${input.object_id}.` };
        }
        docId = doc.id;
      }

      const results: string[] = [];
      let failedAt: number | null = null;

      for (let i = 0; i < input.operations.length; i++) {
        const op = input.operations[i];
        try {
          const result = await this.executeOperation(docId, op);
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
