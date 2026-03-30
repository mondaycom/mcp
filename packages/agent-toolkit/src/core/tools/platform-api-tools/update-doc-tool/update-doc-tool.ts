import {
  updateDocBlock,
  deleteDocBlock,
  createDocBlocks,
  updateDocName,
  addContentToDocFromMarkdown,
  getDocByObjectId,
  getDocObjectIdByDocId,
  getDocBoardItem,
  createDocComment,
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
import { mentionsListSchema } from '../create-update-tool/create-update-tool';

export { updateDocToolSchema };

// ─── Resolve object_id type ──────────────────────────────────────────────────

type GetDocByObjectIdQuery = {
  docs?: Array<{ id: string } | null> | null;
};

type GetDocObjectIdByDocIdQuery = {
  docs?: Array<{ id: string; object_id: string } | null> | null;
};

type GetDocBoardItemQuery = {
  boards?: Array<{
    items_page?: {
      items?: Array<{ id: string }> | null;
    } | null;
  }> | null;
};

type CreateDocCommentMutation = {
  create_update?: {
    id: string;
    body: string;
    created_at?: string | null;
  } | null;
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

WHEN TO USE EACH OPERATION:
- text / code / list_item → update_block; use replace_block to change subtype (e.g. NORMAL_TEXT→LARGE_TITLE)
- divider / table / image / video / notice_box / layout → replace_block (properties immutable after creation)
- BOARD / WIDGET / DOC / GIPHY → delete_block only

GETTING BLOCK IDs: Call read_docs with include_blocks: true — returns id, type, position, and content per block.

BLOCK CONTENT (delta_format): Array of insert ops. Last op MUST be {insert: {text: "\\n"}}.
- Plain: [{insert: {text: "Hello"}}, {insert: {text: "\\n"}}]
- Bold: [{insert: {text: "Hi"}, attributes: {bold: true}}, {insert: {text: "\\n"}}]
- Mention user/doc/board: [{insert: {text: "Hey "}}, {insert: {mention: {id: 12345, type: "USER"}}}, {insert: {text: "\\n"}}] — type is USER, DOC, or BOARD; id is numeric (user IDs from list_users_and_teams)
- Inline column value: [{insert: {column_value: {item_id: 111, column_id: "status"}}}, {insert: {text: "\\n"}}]
- Supported attributes: bold, italic, underline, strike, code, link, color, background (not applicable to mention/column_value ops)

IMAGE WITH ASSET: For asset-based images, use create_block with block_type "image" and asset_id (instead of public_url). add_markdown_content does NOT support asset images — for mixed content, alternate add_markdown_content (text) and create_block (image) operations in sequence.

COMMENTS:
- add_comment: Create a new comment or reply on the document. Documents have a backing board with a single item where comments live. The tool automatically resolves the item ID from the doc's object_id (board ID). Use parent_update_id to reply to an existing comment. Format text with HTML, not markdown. Use mentions_list for @mentions.`;
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
          const result = await this.executeOperation(docId, op, input.object_id);
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
    objectId?: string,
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
      case 'add_comment':
        return this.executeAddComment(docId, objectId, op.body, op.parent_update_id, op.mentions_list);
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

  private async resolveObjectId(docId: string, objectId?: string): Promise<string> {
    if (objectId) return objectId;

    const res = await this.mondayApi.request<GetDocObjectIdByDocIdQuery>(getDocObjectIdByDocId, {
      docId: [docId],
    });
    const doc = res.docs?.[0];
    if (!doc?.object_id) {
      throw new Error(`Could not resolve object_id for doc ${docId}`);
    }
    return doc.object_id;
  }

  // Follows mf-docs logic: comments always live on the first board item (items[0]).
  private async resolveDocItemId(objectId: string): Promise<string> {
    const res = await this.mondayApi.request<GetDocBoardItemQuery>(getDocBoardItem, {
      boardId: objectId,
    });
    const itemId = res.boards?.[0]?.items_page?.items?.[0]?.id;
    if (!itemId) {
      throw new Error(`No item found on the document backing board (object_id: ${objectId})`);
    }
    return itemId;
  }

  private async executeAddComment(
    docId: string,
    objectId: string | undefined,
    body: string,
    parentUpdateId?: number,
    mentionsList?: string,
  ): Promise<string> {
    const resolvedObjectId = await this.resolveObjectId(docId, objectId);
    const itemId = await this.resolveDocItemId(resolvedObjectId);

    let parsedMentionsList: Array<{ id: string; type: string }> | undefined;
    if (mentionsList) {
      const parsedJson = JSON.parse(mentionsList);
      const validationResult = mentionsListSchema.safeParse(parsedJson);
      if (!validationResult.success) {
        throw new Error(`Invalid mentions_list format: ${validationResult.error.message}`);
      }
      parsedMentionsList = validationResult.data;
    }

    const variables: {
      itemId: string;
      body: string;
      parentId?: string;
      mentionsList?: Array<{ id: string; type: string }>;
    } = {
      itemId,
      body,
      parentId: parentUpdateId?.toString(),
      mentionsList: parsedMentionsList,
    };

    const res = await this.mondayApi.request<CreateDocCommentMutation>(createDocComment, variables);

    if (!res.create_update?.id) {
      throw new Error('Failed to create comment: no update returned');
    }

    const action = parentUpdateId ? `Reply to update ${parentUpdateId}` : 'Comment';
    return `${action} created (update ID: ${res.create_update.id})`;
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
