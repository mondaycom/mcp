import { z } from 'zod';
// GraphQL operations are defined centrally in queries.graphql.ts

import {
  createDoc as createDocMutation,
  addContentToDocFromMarkdown,
  getItemBoard,
  createColumn as createColumnMutation,
  updateDocName,
} from '../../../monday-graphql/queries.graphql';
import { BoardKind, ColumnType } from '../../../monday-graphql/generated/graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

// Create discriminated union for document location
const CreateDocLocationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('workspace').describe('Create document in workspace'),
    workspace_id: z.number().describe('Workspace ID under which to create the new document'),
    doc_kind: z.nativeEnum(BoardKind).optional().describe('Document kind (public/private/share). Defaults to private.'),
  }),
  z.object({
    type: z.literal('item').describe('Create document attached to item'),
    item_id: z.number().describe('Item ID to attach the new document to'),
    column_id: z
      .string()
      .optional()
      .describe(
        "ID of an existing 'doc' column on the board which contains the item. If not provided, the tool will create a new doc column automatically when creating a doc on an item.",
      ),
  }),
]);

export const createDocToolSchema = {
  location: CreateDocLocationSchema.describe(
    'Location where the document should be created - either in a workspace or attached to an item',
  ),
  doc_name: z.string().optional().describe('Name for the new document. Defaults to "New Document" if not provided.'),
  markdown: z.string().describe('Markdown content that will be imported into the newly created document as blocks.'),
};

export class CreateDocTool extends BaseMondayApiTool<typeof createDocToolSchema> {
  name = 'create_doc';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Document',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Create a new monday.com doc either inside a workspace or attached to an item (via a doc column). After creation, the provided markdown will be appended to the document.

LOCATION TYPES:
- workspace: Creates a document in a workspace (requires workspace_id, optional doc_kind)
- item: Creates a document attached to an item (requires item_id, optional column_id)

USAGE EXAMPLES:
- Workspace doc: { location: { type: "workspace", workspace_id: 123, doc_kind: "private" }, markdown: "..." }
- Item doc: { location: { type: "item", item_id: 456, column_id: "doc_col_1" }, markdown: "..." }`;
  }

  getInputSchema(): typeof createDocToolSchema {
    return createDocToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof createDocToolSchema>): Promise<ToolOutputType<never>> {
    // No need for validation - schema enforces exactly one location type
    try {
      let docId: string | undefined;
      let docUrl: string | undefined;

      if (input.location.type === 'workspace') {
        // Workspace document creation
        const locationInput = {
          workspace: {
            workspace_id: input.location.workspace_id.toString(),
            name: input.doc_name || 'New Document',
            kind: input.location.doc_kind || BoardKind.Private,
          },
        };

        const res: any = await this.mondayApi.request(createDocMutation, { location: locationInput });
        docId = res?.create_doc?.id;
        docUrl = res?.create_doc?.url;
      } else if (input.location.type === 'item') {
        // Item-attached document creation
        // Step 1: Resolve the board id and existing doc columns
        const itemRes: any = await this.mondayApi.request(getItemBoard, {
          itemId: input.location.item_id.toString(),
        });

        const item = itemRes?.items?.[0];
        if (!item) {
          return { content: `Error: Item with id ${input.location.item_id} not found.` };
        }

        const boardId = item.board.id;
        const existingDocColumn = item.board.columns.find((c: any) => ['doc'].includes(c.type));

        let columnId = input.location.column_id;

        if (!columnId) {
          if (existingDocColumn) {
            columnId = existingDocColumn.id;
          } else {
            // Create new doc column on the board
            const columnRes: any = await this.mondayApi.request(createColumnMutation, {
              boardId: boardId.toString(),
              columnType: ColumnType.Doc,
              columnTitle: 'Doc',
              columnDescription: undefined,
              columnSettings: undefined,
            });

            columnId = columnRes?.create_column?.id;
            if (!columnId) {
              return { content: 'Error: Failed to create doc column.' };
            }
          }
        }

        // Step 2: Create the doc attached to the item and column
        const locationInput = {
          board: {
            item_id: input.location.item_id.toString(),
            column_id: columnId,
          },
        };

        const res: any = await this.mondayApi.request(createDocMutation, { location: locationInput });
        docId = res?.create_doc?.id;
        docUrl = res?.create_doc?.url;

        // Step 2.5: Update doc name if provided (item-attached docs don't support name in creation)
        if (input.doc_name && docId) {
          try {
            await this.mondayApi.request(updateDocName, {
              docId: parseInt(docId),
              name: input.doc_name,
            });
          } catch (updateError) {
            // Non-fatal error - doc was created but naming failed
            console.warn('Failed to update doc name:', updateError);
          }
        }
      }

      if (!docId) {
        return { content: 'Error: Failed to create document.' };
      }

      // Step 3: Add markdown content to the doc
      const contentRes: any = await this.mondayApi.request(addContentToDocFromMarkdown, {
        docId,
        markdown: input.markdown,
      });

      const success = contentRes?.add_content_to_doc_from_markdown?.success;
      const errorMsg = contentRes?.add_content_to_doc_from_markdown?.error;

      if (!success) {
        return {
          content: `Document ${docId} created, but failed to add markdown content: ${errorMsg || 'Unknown error'}`,
        };
      }

      const blockIds = contentRes?.add_content_to_doc_from_markdown?.block_ids || [];

      return {
        content: `✅ Document successfully created (id: ${docId}). ${docUrl ? `\n\nURL: ${docUrl}` : ''}`,
      };
    } catch (error) {
      return {
        content: `Error creating document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
