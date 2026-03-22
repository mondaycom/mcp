# Plan: `update_doc` Tool

## Context

The MCP codebase previously had three doc tools: `read_docs`, `create_doc`, and `add_content_to_doc`. There was no way to update existing blocks, delete blocks, rename a doc, or surgically modify doc structure. This plan adds a single `update_doc` tool covering all edit operations, and updates `read_docs` to expose block IDs needed for edit operations.

---

## Design Decisions

| Question | Decision |
|---|---|
| Embedded blocks (BOARD/WIDGET/DOC/GIPHY) | Exclude from `create_block`/`replace_block`; only `delete_block` is supported |
| Text content format | Full `deltaFormat` array exposed in schema (max control) |
| Block reading | Update `read_docs` to return block IDs + types; no new tool needed |
| Schema organization | All Zod schemas extracted to `update-doc-tool.schema.ts`; types derived via `z.infer<>` |
| Single tool vs multiple | One tool with an `operations` array — agents typically need multiple actions per session |

---

## Architecture

**One tool — `update_doc` — accepting `doc_id` + an ordered `operations` array (max 25).**

Execution is sequential and fail-fast: stops at the first failed operation and reports `[OK]`/`[FAILED]` for each.

---

## Block Type Strategy

### Can Update In-Place (`update_block`)

| Block Type | What's Updatable |
|---|---|
| TEXT / HEADER (H1/H2/H3) / QUOTE | Text (deltaFormat), alignment, direction, text_block_type |
| CODE | Text (deltaFormat), language |
| BULLETS / NUMBERED_LIST / TODO_LIST | Text (deltaFormat), indentation, checked state |
| DIVIDER | Alignment, direction |

### Must Delete + Recreate (`replace_block`)

| Block Type | Reason |
|---|---|
| IMAGE | `public_url` immutable after creation |
| VIDEO | `raw_url` immutable after creation |
| TABLE | Row/column structure is immutable |
| LAYOUT | Column count immutable |
| NOTICE_BOX | `theme` immutable after creation |

### Only Deletable (excluded from create/replace)

| Block Type | Reason |
|---|---|
| BOARD_BLOCK | Requires internal widgetId not available via public API |
| WIDGET_BLOCK | Same |
| DOC_BLOCK | Same |
| GIPHY_BLOCK | URL immutable; no public API create support |

### `add_markdown_content` vs `create_block`

- Use `add_markdown_content` for: text, headings, bullet lists, numbered lists, simple tables — no block ID precision needed, markdown is converted automatically.
- Use `create_block` for: image, video, layout, notice_box, table with specific dimensions; exact positioning via `after_block_id`; nesting inside another block via `parent_block_id`.

---

## Operations

### `set_name`
```typescript
{ operation_type: 'set_name', name: string }
```
→ `update_doc_name(docId, name)`

### `add_markdown_content`
```typescript
{ operation_type: 'add_markdown_content', markdown: string, after_block_id?: string }
```
→ `add_content_to_doc_from_markdown(docId, markdown, afterBlockId)`

### `update_block`
```typescript
{
  operation_type: 'update_block',
  block_id: string,
  content: UpdateBlockContentSchema  // discriminated union on block_content_type
}
```
→ `update_doc_block(block_id, content_json)`

`block_content_type` variants: `text`, `code`, `list_item`, `divider`

### `create_block`
```typescript
{
  operation_type: 'create_block',
  after_block_id?: string,
  parent_block_id?: string,  // for blocks inside layout cells, table cells, or notice_box
  block: CreateBlockSchema   // discriminated union on block_type
}
```
→ `create_doc_blocks(docId, afterBlockId, [block])`

`block_type` variants: `text`, `list_item`, `code`, `divider`, `page_break`, `image`, `video`, `notice_box`, `table`, `layout`

### `delete_block`
```typescript
{ operation_type: 'delete_block', block_id: string }
```
→ `delete_doc_block(block_id)` — works for ALL block types including BOARD/WIDGET/DOC/GIPHY

### `replace_block`
```typescript
{
  operation_type: 'replace_block',
  block_id: string,
  after_block_id?: string,
  parent_block_id?: string,
  block: CreateBlockSchema
}
```
→ `delete_doc_block(block_id)` then `create_doc_blocks(...)`. BOARD/WIDGET/DOC/GIPHY excluded.

---

## Delta Format

Quill delta format used for all text/list/code content:
```typescript
[
  { insert: { text: "Hello " } },
  { insert: { text: "world" }, attributes: { bold: true } },
  { insert: { text: "visit " } },
  { insert: { text: "monday" }, attributes: { link: "https://monday.com" } },
  { insert: { text: "\n" } },  // required — last op must always be a newline
]
```

Supported `attributes`: `bold`, `italic`, `underline`, `strike`, `code`, `link`, `color`, `background`.

---

## File Structure

```
src/core/tools/platform-api-tools/update-doc-tool/
├── update-doc-tool.ts           # Tool class (imports schema from schema file)
├── update-doc-tool.schema.ts    # All Zod schemas + inferred TS types
├── update-doc-tool.graphql.ts   # 3 new mutations + re-exports from other tools
├── update-doc-tool.helpers.ts   # buildUpdateBlockContent(), buildCreateBlockInput()
├── update-doc-tool.test.ts      # 21 Jest tests
└── PLAN.md                      # This file
```

Also modified:
- `read-docs-tool.ts` — added blocks array to response + updated description
- `queries.graphql.ts` — added `blocks { id type parent_block_id position content }` to readDocs query
- `platform-api-tools/index.ts` — registered UpdateDocTool

---

## GraphQL Mutations

New mutations in `update-doc-tool.graphql.ts`:

```graphql
mutation updateDocBlock($blockId: String!, $content: JSON!) {
  update_doc_block(block_id: $blockId, content: $content) {
    id
    type
    created_at
  }
}

mutation deleteDocBlock($blockId: String!) {
  delete_doc_block(block_id: $blockId) {
    id
  }
}

mutation createDocBlocks($docId: ID!, $afterBlockId: String, $blocksInput: [CreateBlockInput!]!) {
  create_doc_blocks(docId: $docId, afterBlockId: $afterBlockId, blocksInput: $blocksInput) {
    id
    type
    parent_block_id
    created_at
    content {
      ... on TextBlockContent { delta_format { insert { text } attributes { bold italic } } alignment direction }
      ... on ListBlockContent { delta_format { insert { text } attributes { bold italic } } alignment direction indentation }
      ... on ImageContent { public_url width alignment }
      ... on VideoContent { url width alignment }
      ... on TableContent { cells { row_cells { block_id } } }
      ... on LayoutContent { cells { block_id } }
      ... on NoticeBoxContent { theme alignment direction }
      ... on DividerContent { alignment direction }
    }
  }
}
```

Re-exported from other tools (not redeclared):
- `updateDocName` from `create-doc-tool/create-doc-tool.graphql.ts`
- `addContentToDocFromMarkdown` + `getDocByObjectId` from `add-content-to-doc-tool/add-content-to-doc-tool.graphql.ts`

---

## Tool Response Format

```
Completed 3/4 operations on doc 12345.

Results:
- [OK] set_name: Renamed to "Q4 Planning"
- [OK] update_block: Block block_abc updated
- [OK] delete_block: Block block_xyz deleted
- [FAILED] create_block: API error - Invalid block type

Doc ID: 12345
```
