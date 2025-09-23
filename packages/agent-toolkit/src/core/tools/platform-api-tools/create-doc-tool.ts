import { z } from 'zod';

import {
  createDoc as createDocMutation,
  addContentToDocFromMarkdown,
  getItemBoard,
  createColumn as createColumnMutation,
  updateDocName,
} from '../../../monday-graphql/queries.graphql';
import {
  BoardKind,
  ColumnType,
  CreateColumnMutation,
  CreateColumnMutationVariables,
  CreateDocMutation,
  CreateDocMutationVariables,
  GetItemBoardQuery,
  GetItemBoardQueryVariables,
  UpdateDocNameMutation,
  UpdateDocNameMutationVariables,
  AddContentToDocFromMarkdownMutation,
  AddContentToDocFromMarkdownMutationVariables,
} from '../../../monday-graphql/generated/graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

const DocType = z.enum(['workspace', 'item']);

// Create discriminated union for document location
const CreateDocLocationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(DocType.enum.workspace).describe('Create document in workspace'),
    workspace_id: z.number().describe('Workspace ID under which to create the new document'),
    doc_kind: z.nativeEnum(BoardKind).optional().describe('Document kind (public/private/share). Defaults to public.'),
    folder_id: z.number().optional().describe('Optional folder ID to place the document inside a specific folder'),
  }),
  z.object({
    type: z.literal(DocType.enum.item).describe('Create document attached to item'),
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
  doc_name: z.string().describe('Name for the new document.'),
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
- workspace: Creates a document in a workspace (requires workspace_id, optional doc_kind, optional folder_id)
- item: Creates a document attached to an item (requires item_id, optional column_id)

USAGE EXAMPLES:
- Workspace doc: { location: { type: "workspace", workspace_id: 123, doc_kind: "private" }, markdown: "..." }
- Workspace doc in folder: { location: { type: "workspace", workspace_id: 123, folder_id: 17264196 }, markdown: "..." }
- Item doc: { location: { type: "item", item_id: 456, column_id: "doc_col_1" }, markdown: "..." }`;
  }

  getInputSchema(): typeof createDocToolSchema {
    return createDocToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof createDocToolSchema>): Promise<ToolOutputType<never>> {
    try {
      let docId: string | undefined;
      let docUrl: string | undefined;

      if (input.location.type === DocType.enum.workspace) {
        // Workspace document creation
        const variables: CreateDocMutationVariables = {
          location: {
            workspace: {
              workspace_id: input.location.workspace_id.toString(),
              name: input.doc_name,
              kind: input.location.doc_kind || BoardKind.Public,
              folder_id: input.location.folder_id?.toString(),
            },
          },
        };

        const res: CreateDocMutation = await this.mondayApi.request(createDocMutation, variables);
        docId = res?.create_doc?.id ?? undefined;
        docUrl = res?.create_doc?.url ?? undefined;
      } else if (input.location.type === DocType.enum.item) {
        // Item-attached document creation
        // Step 1: Resolve the board id and existing doc columns
        const variables: GetItemBoardQueryVariables = {
          itemId: input.location.item_id.toString(),
        };
        const itemRes: GetItemBoardQuery = await this.mondayApi.request(getItemBoard, variables);

        const item = itemRes.items?.[0];
        if (!item) {
          return { content: `Error: Item with id ${input.location.item_id} not found.` };
        }

        const boardId = item.board?.id;
        const existingDocColumn = item.board?.columns?.find((c) => c && c.type === ColumnType.Doc);

        let columnId = input.location.column_id;

        if (!columnId) {
          if (existingDocColumn) {
            columnId = existingDocColumn.id;
          } else {
            // Create new doc column on the board
            const columnVariables: CreateColumnMutationVariables = {
              boardId: boardId!.toString(),
              columnType: ColumnType.Doc,
              columnTitle: 'Doc',
            };
            const columnRes: CreateColumnMutation = await this.mondayApi.request(createColumnMutation, columnVariables);

            columnId = columnRes?.create_column?.id;
            if (!columnId) {
              return { content: 'Error: Failed to create doc column.' };
            }
          }
        }

        // Step 2: Create the doc attached to the item and column
        const itemVariables: CreateDocMutationVariables = {
          location: {
            board: {
              item_id: input.location.item_id.toString(),
              column_id: columnId,
            },
          },
        };

        const res: CreateDocMutation = await this.mondayApi.request(createDocMutation, itemVariables);
        docId = res.create_doc?.id ?? undefined;
        docUrl = res.create_doc?.url ?? undefined;

        // Step 3: Update doc name if provided (item-attached docs don't support name in creation)
        if (input.doc_name && docId) {
          try {
            const updateVariables: UpdateDocNameMutationVariables = {
              docId: docId,
              name: input.doc_name,
            };
            const updateRes: UpdateDocNameMutation = await this.mondayApi.request(updateDocName, updateVariables);
          } catch (updateError) {
            // Non-fatal error - doc was created but naming failed
            console.warn('Failed to update doc name:', updateError);
          }
        }
      }

      if (!docId) {
        return { content: 'Error: Failed to create document.' };
      }

      // Add markdown content to the doc
      const contentVariables: AddContentToDocFromMarkdownMutationVariables = {
        docId,
        markdown: input.markdown,
      };
      const contentRes: AddContentToDocFromMarkdownMutation = await this.mondayApi.request(
        addContentToDocFromMarkdown,
        contentVariables,
      );

      const success = contentRes?.add_content_to_doc_from_markdown?.success;
      const errorMsg = contentRes?.add_content_to_doc_from_markdown?.error;

      if (!success) {
        return {
          content: `Document ${docId} created, but failed to add markdown content: ${errorMsg || 'Unknown error'}`,
        };
      }

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
