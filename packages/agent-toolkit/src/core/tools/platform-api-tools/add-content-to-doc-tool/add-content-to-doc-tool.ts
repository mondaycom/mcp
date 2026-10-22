import { z } from 'zod';

import { addContentToDocFromMarkdown, getDocById, getDocByObjectId } from './add-content-to-doc-tool.graphql';

import {
  AddContentToDocFromMarkdownMutation,
  AddContentToDocFromMarkdownMutationVariables,
  GetDocByIdQuery,
  GetDocByObjectIdQuery,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { resolveBoardViewDoc } from '../utils/board-view-doc.utils';

interface Document {
  id: string;
  name?: string;
  url?: string | null;
}

export const addContentToDocToolSchema = {
  doc_id: z
    .string()
    .min(1)
    .optional()
    .describe('The document ID (the id field returned by read_docs). Provide this OR object_id. Takes priority if both are provided.'),
  object_id: z
    .string()
    .min(1)
    .optional()
    .describe(
      'The document object ID (the object_id field from read_docs, also visible in the document URL). Will be resolved to a doc_id. Provide this OR doc_id.',
    ),
  board_id: z
    .string()
    .min(1)
    .optional()
    .describe(
      'For a doc that lives as a board view: the <board_id> in https://<slug>.monday.com/boards/<board_id>/views/<view_id>. Pair with view_id. Use this instead of doc_id/object_id when all you have is a board view URL.',
    ),
  view_id: z
    .string()
    .min(1)
    .optional()
    .describe(
      'For a doc that lives as a board view: the <view_id> in https://<slug>.monday.com/boards/<board_id>/views/<view_id>. Requires board_id.',
    ),
  markdown: z.string().describe('Markdown content to add to the document.'),
  after_block_id: z
    .string()
    .optional()
    .describe('Block ID after which to insert the new content. If omitted, content is appended at the end. To insert at the beginning, pass the first block ID from read_docs. Block IDs can be obtained from read_docs or from a previous add_content_to_doc response.'),
};

export class AddContentToDocTool extends BaseMondayApiTool<typeof addContentToDocToolSchema> {
  name = 'add_content_to_doc';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Add Content to Document',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Add markdown content to an existing monday.com document.

IDENTIFICATION: Provide doc_id, object_id, or board_id + view_id to identify the document:
- doc_id: The document ID (the id field returned by read_docs). Takes priority if both provided.
- object_id: The document object ID (the object_id field from read_docs, also visible in the document URL). Will be resolved to a doc_id.
- board_id + view_id: For a doc that lives as a board view, taken from https://<slug>.monday.com/boards/<board_id>/views/<view_id>. Such docs have no usable doc_id/object_id until they are resolved through their board.

USAGE EXAMPLES:
- By doc_id: { doc_id: "123", markdown: "# New Section\\nContent here" }
- By object_id: { object_id: "456", markdown: "# New Section\\nContent here" }
- By board view: { board_id: "18429976879", view_id: "279510271", markdown: "# New Section\\nContent here" }
- Insert after block: { doc_id: "123", markdown: "Inserted content", after_block_id: "block_789" }`;
  }

  getInputSchema(): typeof addContentToDocToolSchema {
    return addContentToDocToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof addContentToDocToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (!input.doc_id && !input.object_id && !input.board_id) {
      return { content: 'Error: Either doc_id, object_id, or board_id (with view_id) must be provided.' };
    }

    try {
      let doc: Document = null!;

      // A doc that lives as a board view has to be resolved through its board first.
      if (!input.doc_id && !input.object_id && input.board_id) {
        const resolved = await resolveBoardViewDoc(this.mondayApi, input.board_id, input.view_id);
        if (!resolved.ok) {
          return { content: `Error: ${resolved.error}` };
        }
        doc = resolved.doc;
      } else if (!input.doc_id) {
        const res = await this.mondayApi.request<GetDocByObjectIdQuery>(getDocByObjectId, {
          objectId: input.object_id,
        });

        doc = res.docs?.[0] ?? null!;

      } else {
        const res = await this.mondayApi.request<GetDocByIdQuery>(getDocById, {
          docId: input.doc_id,
        });

        doc = res.docs?.[0] ?? null!;
      }

      if (!doc) {
        const identifier = input.doc_id ? `doc_id ${input.doc_id}` : `object_id ${input.object_id}`;
        return { content: `Error: No document found for ${identifier}.` };
      }

      this.sessionContext.metadata = {
        ...this.sessionContext.metadata,
        doc_id: doc.id,
        ...(input.object_id && { object_id: input.object_id }),
        ...(input.board_id && { board_id: input.board_id, view_id: input.view_id }),
      };

      const variables: AddContentToDocFromMarkdownMutationVariables = {
        docId: doc.id,
        markdown: input.markdown,
        afterBlockId: input.after_block_id,
      };

      const result = await this.mondayApi.request<AddContentToDocFromMarkdownMutation>(
        addContentToDocFromMarkdown,
        variables,
      );

      if (!result?.add_content_to_doc_from_markdown) {
        return { content: 'Error: Failed to add content to document — no response from API.' };
      }

      const { success, block_ids, error } = result.add_content_to_doc_from_markdown;

      if (!success) {
        return { content: `Error adding content to document: ${error || 'Unknown error'}` };
      }

      const blockCount = block_ids?.length ?? 0;
      return {
        content: {
          message: `Successfully added content to document ${doc.id}. ${blockCount} block${blockCount === 1 ? '' : 's'} created.`,
          doc_id: doc.id,
          block_ids: block_ids,
          doc_name: doc.name,
          doc_url: doc.url,
        },
      };
    } catch (error) {
      return {
        content: `Error adding content to document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
