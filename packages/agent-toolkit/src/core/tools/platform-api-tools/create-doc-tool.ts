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
// TODO - to create a doc title i should use the update title mutation
export const createDocToolSchema = {
  workspace_id: z
    .number()
    .optional()
    .describe(
      'Workspace ID under which to create the new document. Provide either workspace_id (for workspace docs) or item_id (for item-attached docs).',
    ),
  item_id: z
    .number()
    .optional()
    .describe('Item ID to attach the new document to. If provided, a doc will be created on the item.'),
  column_id: z
    .string()
    .optional()
    .describe(
      "ID of an existing 'doc' column on the board which contains the item. If not provided, the tool will create a new doc column automatically when creating a doc on an item.",
    ),
  doc_name: z
    .string()
    .optional()
    .describe(
      'Name for the new document. For workspace docs, this is set during creation. For item docs, this is applied after creation via update_doc_name mutation.',
    ),
  doc_kind: z
    .nativeEnum(BoardKind)
    .optional()
    .describe('Document kind for workspace docs (public / private / share). Defaults to private.'),
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
    return `Create a new monday.com doc either inside a workspace or attached to an item (via a doc column). After creation, the provided markdown will be appended to the document.`;
  }

  getInputSchema(): typeof createDocToolSchema {
    return createDocToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof createDocToolSchema>): Promise<ToolOutputType<never>> {
    // Validate mutually exclusive parameters
    if (!input.workspace_id && !input.item_id) {
      return {
        content: 'Error: You must provide either workspace_id for a workspace doc or item_id for an item doc.',
      };
    }

    if (input.workspace_id && input.item_id) {
      return {
        content: 'Error: Provide only one of workspace_id or item_id, not both.',
      };
    }

    try {
      let docId: string | undefined;
      let docUrl: string | undefined;

      if (input.workspace_id) {
        // Workspace document creation
        const locationInput = {
          workspace: {
            workspace_id: input.workspace_id.toString(),
            name: input.doc_name || 'New Document',
            kind: input.doc_kind || BoardKind.Private,
          },
        };

        const res: any = await this.mondayApi.request(createDocMutation, { location: locationInput });
        docId = res?.create_doc?.id;
        docUrl = res?.create_doc?.url;
      } else if (input.item_id) {
        // Item-attached document creation
        // Step 1: Resolve the board id and existing doc columns
        const itemRes: any = await this.mondayApi.request(getItemBoard, {
          itemId: input.item_id.toString(),
        });

        const item = itemRes?.items?.[0];
        if (!item) {
          return { content: `Error: Item with id ${input.item_id} not found.` };
        }

        const boardId = item.board.id;
        const existingDocColumn = item.board.columns.find((c: any) => ['doc'].includes(c.type));

        let columnId = input.column_id;

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
            item_id: input.item_id.toString(),
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
        content: `✅ Document successfully created (id: ${docId}). Markdown imported (${blockIds.length} blocks).${
          docUrl ? `\n\nURL: ${docUrl}` : ''
        }`,
      };
    } catch (error) {
      return {
        content: `Error creating document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
