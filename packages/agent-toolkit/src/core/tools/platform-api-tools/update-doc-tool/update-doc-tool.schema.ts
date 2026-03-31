import { z } from 'zod';

// ─── Delta format ─────────────────────────────────────────────────────────────

const AttributesSchema = z
  .object({
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    strike: z.boolean().optional(),
    code: z.boolean().optional(),
    link: z.string().optional(),
    color: z.string().optional(),
    background: z.string().optional(),
  })
  .optional();

const MentionInsertSchema = z.object({
  mention: z
    .object({
      id: z.union([z.string(), z.number()]).describe('User, doc, or board ID. Get user IDs from list_users_and_teams.'),
      type: z.enum(['USER', 'DOC', 'BOARD']).default('USER').describe('Mention type. USER is most common.'),
    })
    .describe('Mention blot — tags a user, doc, or board inline. Do not set attributes on mention ops.'),
});

const ColumnValueInsertSchema = z.object({
  column_value: z
    .object({
      item_id: z.union([z.string(), z.number()]).describe('The board item ID.'),
      column_id: z.string().describe('The column ID (e.g. "status", "date4"). Get column IDs from get_board_schema.'),
    })
    .describe('Column value blot — embeds a live board column value inline in the doc.'),
});

export const DeltaOperationSchema = z.object({
  insert: z
    .union([z.object({ text: z.string() }), MentionInsertSchema, ColumnValueInsertSchema])
    .describe(
      'Content to insert. Use {text: "..."} for plain text, {mention: {id, type}} to tag a user/doc/board, or {column_value: {item_id, column_id}} to embed a live column value. The last operation in the array must be {text: "\\n"}.',
    ),
  attributes: AttributesSchema.describe(
    'Optional formatting: bold, italic, underline, strike, code, link, color, background. Not applicable to mention or column_value ops.',
  ),
});

export type DeltaOperation = z.infer<typeof DeltaOperationSchema>;

// ─── update_block content ─────────────────────────────────────────────────────

export const UpdateBlockTextSchema = z.object({
  block_content_type: z.literal('text'),
  delta_format: z
    .array(DeltaOperationSchema)
    .min(1)
    .describe('Array of delta operations. Last op must be {insert: {text: "\\n"}}.'),
  alignment: z.enum(['LEFT', 'RIGHT', 'CENTER']).optional(),
  direction: z.enum(['LTR', 'RTL']).optional(),
});

export const UpdateBlockCodeSchema = z.object({
  block_content_type: z.literal('code'),
  delta_format: z
    .array(DeltaOperationSchema)
    .min(1)
    .describe('Array of delta operations. Last op must be {insert: {text: "\\n"}}.'),
  language: z.string().optional().describe('Programming language (e.g. "javascript", "python").'),
});

export const UpdateBlockListItemSchema = z.object({
  block_content_type: z.literal('list_item'),
  delta_format: z
    .array(DeltaOperationSchema)
    .min(1)
    .describe('Array of delta operations. Last op must be {insert: {text: "\\n"}}.'),
  checked: z.boolean().optional().describe('Check state for CHECK_LIST items.'),
  indentation: z.number().int().min(0).optional().describe('Nesting level (0 = no indent).'),
});

export const UpdateBlockContentSchema = z.discriminatedUnion('block_content_type', [
  UpdateBlockTextSchema,
  UpdateBlockCodeSchema,
  UpdateBlockListItemSchema,
]);

export type UpdateBlockContent = z.infer<typeof UpdateBlockContentSchema>;

// ─── create_block / replace_block block definition ───────────────────────────

export const CreateBlockTextSchema = z.object({
  block_type: z.literal('text'),
  text_block_type: z
    .enum(['NORMAL_TEXT', 'LARGE_TITLE', 'MEDIUM_TITLE', 'SMALL_TITLE', 'QUOTE'])
    .optional()
    .describe('Block subtype. LARGE_TITLE=H1, MEDIUM_TITLE=H2, SMALL_TITLE=H3.'),
  delta_format: z
    .array(DeltaOperationSchema)
    .min(1)
    .describe('Array of delta operations. Last op must be {insert: {text: "\\n"}}.'),
  alignment: z.enum(['LEFT', 'RIGHT', 'CENTER']).optional(),
  direction: z.enum(['LTR', 'RTL']).optional(),
});

export const CreateBlockListItemSchema = z.object({
  block_type: z.literal('list_item'),
  list_block_type: z
    .enum(['BULLETED_LIST', 'NUMBERED_LIST', 'CHECK_LIST'])
    .optional()
    .describe('List type. Defaults to BULLETED_LIST.'),
  delta_format: z
    .array(DeltaOperationSchema)
    .min(1)
    .describe('Array of delta operations. Last op must be {insert: {text: "\\n"}}.'),
  indentation: z.number().int().min(0).optional().describe('Nesting level (0 = no indent).'),
});

export const CreateBlockCodeSchema = z.object({
  block_type: z.literal('code'),
  delta_format: z
    .array(DeltaOperationSchema)
    .min(1)
    .describe('Array of delta operations. Last op must be {insert: {text: "\\n"}}.'),
  language: z.string().optional().describe('Programming language (e.g. "javascript", "python").'),
});

export const CreateBlockDividerSchema = z.object({ block_type: z.literal('divider') });
export const CreateBlockPageBreakSchema = z.object({ block_type: z.literal('page_break') });

export const CreateBlockImageSchema = z.object({
  block_type: z.literal('image'),
  public_url: z
    .string()
    .url()
    .optional()
    .describe('Publicly accessible image URL. Provide either public_url or asset_id.'),
  asset_id: z
    .union([z.number().int(), z.string().regex(/^\d+$/).transform(Number)])
    .optional()
    .describe(
      'monday.com asset ID for the image. The image block will reference the asset directly. Provide either public_url or asset_id.',
    ),
  width: z.number().int().min(1).optional().describe('Width in pixels.'),
});

export const CreateBlockVideoSchema = z.object({
  block_type: z.literal('video'),
  raw_url: z.string().url().describe('Video URL (YouTube, Vimeo, or direct video URL).'),
  width: z.number().int().min(1).optional().describe('Width in pixels.'),
});

export const CreateBlockNoticeBoxSchema = z.object({
  block_type: z.literal('notice_box'),
  theme: z.enum(['INFO', 'TIPS', 'WARNING', 'GENERAL']).describe('Visual style of the notice box.'),
});

export const CreateBlockTableSchema = z.object({
  block_type: z.literal('table'),
  row_count: z.number().int().min(1).max(25).describe('Number of rows (1–25).'),
  column_count: z.number().int().min(1).max(10).describe('Number of columns (1–10).'),
  width: z.number().int().optional().describe('Table width in pixels.'),
  column_style: z
    .array(z.object({ width: z.number().int() }))
    .optional()
    .describe('Column widths. Array length must match column_count; widths must sum to 100.'),
});

export const CreateBlockLayoutSchema = z.object({
  block_type: z.literal('layout'),
  column_count: z.number().int().min(2).max(6).describe('Number of columns (2–6).'),
  column_style: z
    .array(z.object({ width: z.number().int() }))
    .optional()
    .describe('Column widths. Array length must match column_count; widths must sum to 100.'),
});

export const CreateBlockSchema = z.discriminatedUnion('block_type', [
  CreateBlockTextSchema,
  CreateBlockListItemSchema,
  CreateBlockCodeSchema,
  CreateBlockDividerSchema,
  CreateBlockPageBreakSchema,
  CreateBlockImageSchema,
  CreateBlockVideoSchema,
  CreateBlockNoticeBoxSchema,
  CreateBlockTableSchema,
  CreateBlockLayoutSchema,
]);

export type CreateBlock = z.infer<typeof CreateBlockSchema>;

// ─── Operations ───────────────────────────────────────────────────────────────

const SetNameOperation = z.object({
  operation_type: z.literal('set_name'),
  name: z.string().min(1).describe('New document name.'),
});

const AddMarkdownContentOperation = z.object({
  operation_type: z.literal('add_markdown_content'),
  markdown: z.string().describe('Markdown content to convert and append (or insert) as blocks.'),
  after_block_id: z
    .string()
    .optional()
    .describe('Insert after this block ID. Omit to append at end. Block IDs come from read_docs.'),
});

const UpdateBlockOperation = z.object({
  operation_type: z.literal('update_block'),
  block_id: z.string().describe('ID of the block to update. Get block IDs from read_docs.'),
  content: UpdateBlockContentSchema.describe(
    'New content for the block. Use block_content_type to select: text (updates text/heading/quote content), code (updates code content), list_item (updates bullets/numbered/todo content). Cannot change block subtype — use replace_block for that.',
  ),
});

const CreateBlockOperation = z.object({
  operation_type: z.literal('create_block'),
  after_block_id: z
    .string()
    .optional()
    .describe('Insert after this block ID. Omit to append at end. Block IDs come from read_docs.'),
  parent_block_id: z
    .string()
    .optional()
    .describe(
      'Parent block ID for nested blocks. Only works for notice_box containers — use the notice_box block ID directly. Table/layout cell nesting is NOT supported by the API. IMPORTANT: A notice_box created in the same call cannot be referenced — use a separate call first to create it, then a second call to nest content inside it.',
    ),
  block: CreateBlockSchema.describe('The block to create. Use block_type to select the block type.'),
});

const DeleteBlockOperation = z.object({
  operation_type: z.literal('delete_block'),
  block_id: z
    .string()
    .describe(
      'ID of the block to permanently delete. Works for all block types including BOARD, WIDGET, DOC embed, GIPHY.',
    ),
});

const ReplaceBlockOperation = z.object({
  operation_type: z.literal('replace_block'),
  block_id: z.string().describe('ID of the block to delete.'),
  after_block_id: z
    .string()
    .optional()
    .describe('Insert replacement after this block ID. Provide the ID of the block that precedes the deleted block.'),
  parent_block_id: z.string().optional().describe('Parent block ID for the replacement block.'),
  block: CreateBlockSchema.describe('The new block to create in place of the deleted one.'),
});

const AddCommentOperation = z.object({
  operation_type: z.literal('add_comment'),
  body: z
    .string()
    .min(1)
    .describe(
      'The comment text. Use HTML tags for formatting (not markdown). Do not use @ to mention users — use mentions_list instead.',
    ),
  parent_update_id: z
    .number()
    .optional()
    .describe(
      'The ID of an existing comment (update) to reply to. Omit to create a new top-level comment. Get comment IDs from read_docs with include_comments: true.',
    ),
  mentions_list: z
    .string()
    .optional()
    .describe(
      'Optional JSON array of mentions: [{"id": "123", "type": "User"}, {"id": "456", "type": "Team"}]. Valid types: User, Team, Board, Project.',
    ),
  block_id: z
    .union([z.string(), z.array(z.string()).min(1)])
    .optional()
    .describe(
      'Block ID (string) or array of block IDs to anchor the comment to. When an array is provided, the same comment highlights all specified blocks. Get block IDs from read_docs with include_blocks: true. Omit to create a general doc-level comment. Pair with selection_from + selection_length (single block_id only) to comment on a specific text range.',
    ),
  selection_from: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      'Start character offset (0-indexed) of the selected text within the block. Requires block_id. Omit to comment on the entire block.',
    ),
  selection_length: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      'Number of characters in the text selection. Requires block_id and selection_from. Only works for text, code, and list_item blocks that have a delta format.',
    ),
});

export const OperationSchema = z.discriminatedUnion('operation_type', [
  SetNameOperation,
  AddMarkdownContentOperation,
  UpdateBlockOperation,
  CreateBlockOperation,
  DeleteBlockOperation,
  ReplaceBlockOperation,
  AddCommentOperation,
]);

export type Operation = z.infer<typeof OperationSchema>;

// ─── Top-level tool schema ────────────────────────────────────────────────────

export const updateDocToolSchema = {
  doc_id: z
    .string()
    .min(1)
    .optional()
    .describe('The document ID (the id field from read_docs). Takes priority over object_id if both are provided.'),
  object_id: z
    .string()
    .min(1)
    .optional()
    .describe(
      'The document object ID (the object_id field from read_docs, visible in the document URL). Resolved to doc_id.',
    ),
  operations: z
    .array(OperationSchema)
    .min(1)
    .max(25)
    .describe(
      `Ordered list of operations to perform. Executed sequentially; stops at first failure.

Operation types:
- set_name: Rename the document.
- add_markdown_content: Append markdown as blocks (simplest for text/lists/tables).
- update_block: Change content of an existing text/code/list/divider block.
- create_block: Create a new block at a specific position (supports text, list_item, code, divider, page_break, image, video, notice_box, table, layout).
- delete_block: Permanently remove a block. Works for ALL block types including BOARD, WIDGET, DOC embed, GIPHY.
- replace_block: Delete a block and create a new one in its place. Use for: changing image/video source, table restructure, notice_box theme change.
- add_comment: Create a new comment or reply on the document. Use parent_update_id to reply to an existing comment. Format text with HTML. Uses the doc's backing board item.

WHEN TO USE WHICH:
- Adding new text sections → add_markdown_content
- Adding asset-based images → create_block with block_type "image" and asset_id (add_markdown_content does NOT support asset images)
- Mixed content with asset images → alternate add_markdown_content (for text) and create_block (for each image) in sequence
- Editing existing text block → update_block
- Changing an image URL → replace_block (image URL is immutable after creation)
- Changing video URL → replace_block
- Restructuring a table → replace_block
- BOARD/WIDGET/DOC/GIPHY blocks → delete_block only (no public API to create these)

NESTING CONTENT IN CONTAINERS:
- notice_box: Fully supported. Create the notice_box first, then in a separate call create child blocks with parent_block_id set to the notice_box ID. You cannot reference a block ID created in the same call.
- table: Cell-level API nesting is NOT supported. To create a table with content, use add_markdown_content with a markdown table (e.g. "| H1 | H2 |\\n| --- | --- |\\n| A | B |"). This creates a pre-populated table in one shot. Empty tables created via create_block cannot have their cells populated through the API.
- layout: Cell-level API nesting is NOT supported and there is no markdown equivalent. Layouts can only be created empty via create_block. No workaround exists to populate layout columns through the API.
Deleting a container does NOT delete its children — delete children first for clean removal.

Block IDs are available in the blocks array returned by read_docs.`,
    ),
};
