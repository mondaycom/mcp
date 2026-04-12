import {
  updateDocBlock,
  deleteDocBlock,
  updateDocName,
  addContentToDocFromMarkdown,
  getDocByObjectId,
  getDocObjectIdByDocId,
  getDocBoardItem,
  createDocComment,
  getDocBlockContent,
} from './update-doc-tool.graphql';
import { createDocBlocks } from './update-doc-tool.graphql.dev';

import {
  UpdateDocBlockMutation,
  UpdateDocBlockMutationVariables,
  DeleteDocBlockMutation,
  DeleteDocBlockMutationVariables,
  UpdateDocNameMutation,
  UpdateDocNameMutationVariables,
  AddContentToDocFromMarkdownMutation,
  AddContentToDocFromMarkdownMutationVariables,
  GetDocBlockContentQuery,
} from '../../../../monday-graphql/generated/graphql/graphql';
import {
  CreateDocBlocksMutation,
  CreateDocBlocksMutationVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { buildUpdateBlockContent, buildCreateBlockInput, applyCommentToDelta } from './update-doc-tool.helpers';
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
- text / code / list_item → update_block. Use replace_block to change subtype (e.g. NORMAL_TEXT→LARGE_TITLE)
- divider / table / image / video / notice_box / layout → replace_block (properties immutable after creation)
- BOARD / WIDGET / DOC / GIPHY → delete_block only

GETTING BLOCK IDs: Call read_docs with include_blocks: true — returns id, type, position, and content per block.

BLOCK CONTENT (delta_format): Array of insert ops. Last op MUST be {insert: {text: "\\n"}}.
- Plain: [{insert: {text: "Hello"}}, {insert: {text: "\\n"}}]
- Bold: [{insert: {text: "Hi"}, attributes: {bold: true}}, {insert: {text: "\\n"}}]
- Mention user/doc/board: [{insert: {text: "Hey "}}, {insert: {mention: {id: 12345, type: "USER"}}}, {insert: {text: "\\n"}}] — type is USER, DOC, or BOARD. id is numeric (user IDs from list_users_and_teams)
- Inline column value: [{insert: {column_value: {item_id: 111, column_id: "status"}}}, {insert: {text: "\\n"}}]
- Supported attributes: bold, italic, underline, strike, code, link, color, background (not applicable to mention/column_value ops)

IMAGE WITH ASSET: For asset-based images, use create_block with block_type "image" and asset_id (instead of public_url). add_markdown_content does NOT support asset images — for mixed content, alternate add_markdown_content (text) and create_block (image) operations in sequence.

COMMENTS:
- add_comment: Create a new comment or reply on the document. Three scopes:
  - Doc-level (no block_id): comment appears on the doc as a whole.
  - Block-level (block_id only): comment is anchored to a specific block. The block shows a comment indicator in the UI.
  - Text-selection (block_id + selection_from + selection_length): comment is anchored to a specific character range inside a text/code/list_item block. That text is highlighted with a comment marker.
  Block-level and text-selection comments only work on blocks with text content (text, code, list_item, title, quote). They do NOT work on: divider, page_break, table, layout, notice_box, image, video, or giphy blocks.
  Get block IDs from read_docs with include_blocks: true. Format body with HTML, not markdown. Use mentions_list for @mentions.`;
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
        return this.executeAddComment(
          docId,
          objectId,
          op.body,
          op.parent_update_id,
          op.mentions_list,
          op.block_id,
          op.selection_from,
          op.selection_length,
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
    const res = await this.mondayApi.request<CreateDocBlocksMutation>(createDocBlocks, variables, {
      versionOverride: 'dev',
    });

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

  private async fetchAllBlockContent(
    docId: string,
  ): Promise<Array<{ id: string; type: string; content: Record<string, unknown> }>> {
    const res = await this.mondayApi.request<GetDocBlockContentQuery>(getDocBlockContent, { docId: [docId] });
    const blocks = (res.docs?.[0]?.blocks ?? []).filter((b): b is NonNullable<typeof b> => b != null);
    return blocks.map((block) => {
      // GraphQL JSON scalar may return content as a string — parse it
      let content: Record<string, unknown>;
      if (typeof block.content === 'string') {
        try {
          content = JSON.parse(block.content);
        } catch {
          throw new Error(`Failed to parse content of block ${block.id} in doc ${docId} as JSON`);
        }
      } else {
        content = (block.content as Record<string, unknown>) ?? {};
      }
      return { id: block.id ?? '', type: block.type ?? '', content };
    });
  }

  private async executeAddComment(
    docId: string,
    objectId: string | undefined,
    body: string,
    parentUpdateId?: number,
    mentionsList?: string,
    blockId?: string | string[],
    selectionFrom?: number,
    selectionLength?: number,
  ): Promise<string> {
    if ((selectionFrom != null || selectionLength != null) && !blockId) {
      throw new Error('selection_from and selection_length require block_id');
    }

    if ((selectionFrom != null) !== (selectionLength != null)) {
      throw new Error('selection_from and selection_length must both be provided together');
    }

    const blockIds = blockId ? (Array.isArray(blockId) ? blockId : [blockId]) : [];

    if ((selectionFrom != null || selectionLength != null) && blockIds.length > 1) {
      throw new Error('selection_from and selection_length are only supported with a single block_id');
    }

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

    const postId = res.create_update.id;
    const numericPostId = Number(postId);
    const action = parentUpdateId ? `Reply to update ${parentUpdateId}` : 'Comment';

    if (blockIds.length > 0) {
      if (Number.isNaN(numericPostId)) {
        throw new Error(
          `${action} created (update ID: ${postId}) but block annotation aborted: comment ID is not numeric and cannot be used as a delta reference`,
        );
      }

      // Fetch all block content once before mutating any block
      const allBlocks = await this.fetchAllBlockContent(docId);

      for (const id of blockIds) {
        const block = allBlocks.find((b) => b.id === id);
        if (!block) {
          throw new Error(
            `${action} created (update ID: ${postId}) but block annotation failed: block ${id} not found in doc ${docId}`,
          );
        }

        const deltaFormat = block.content.deltaFormat as Record<string, unknown>[] | undefined;
        if (!deltaFormat) {
          throw new Error(
            `${action} created (update ID: ${postId}) but block annotation failed: block ${id} has no deltaFormat — only text, code, and list_item blocks are supported`,
          );
        }

        let totalLen = 0;
        for (const op of deltaFormat) {
          totalLen += typeof op.insert === 'string' ? (op.insert as string).length : 1;
        }
        if (totalLen === 0) {
          throw new Error(
            `${action} created (update ID: ${postId}) but block annotation failed: block ${id} has an empty deltaFormat and cannot be annotated`,
          );
        }

        const annotationFrom = selectionFrom ?? 0;
        const annotationLength = selectionLength ?? totalLen;

        if (annotationFrom + annotationLength > totalLen) {
          throw new Error(
            `${action} created (update ID: ${postId}) but block annotation failed: ` +
              `selection [${annotationFrom}, ${annotationFrom + annotationLength}) is out of range for block ${id} (total length ${totalLen})`,
          );
        }

        let annotatedDelta: Record<string, unknown>[];
        try {
          annotatedDelta = applyCommentToDelta(deltaFormat, numericPostId, annotationFrom, annotationLength);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          throw new Error(
            `${action} created (update ID: ${postId}) but delta annotation failed for block ${id}: ${errMsg}`,
          );
        }

        const updatedContent: Record<string, unknown> = { ...block.content, deltaFormat: annotatedDelta };

        const annotationRes = await this.mondayApi.request<UpdateDocBlockMutation>(updateDocBlock, {
          blockId: id,
          content: JSON.stringify(updatedContent),
        });
        if (!annotationRes?.update_doc_block) {
          throw new Error(
            `${action} created (update ID: ${postId}) but block annotation write returned no confirmation for block ${id}`,
          );
        }
      }
    }

    const blockCount = blockIds.length;
    const blockSuffix = blockCount > 1 ? ` across ${blockCount} blocks` : blockCount === 1 ? ' on block' : '';
    return `${action} created${blockSuffix} (update ID: ${postId})`;
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
