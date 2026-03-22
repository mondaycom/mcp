# `update_doc` Tool — Staging Test Plan

## Setup

Before starting, create a test doc and call `read_docs` on it to get block IDs. Keep the doc ID handy for all tests.

## Known API Limitations (confirmed in staging)

These are not tool bugs — the API itself rejects them:
- `update_block` on **divider** blocks → "Block type not supported"
- `update_block` on **table** blocks → "Block type not supported"
- `update_block` cannot change block subtype (e.g. NORMAL_TEXT→LARGE_TITLE, BULLETED_LIST→CHECK_LIST) → use `replace_block`
- `add_markdown_content` with empty string → API 500 (tool now validates client-side)
- Populating table/layout/notice_box children requires two separate calls: one to create the container, then `read_docs` to get cell IDs, then a second call to add children via `parent_block_id`

---

## 1. `set_name`

- **Simple:** Rename the doc to a short name → verify new name appears
- **With special chars:** Rename to `"Q4 Plan: Phase 1 & 2 (draft)"` → verify it doesn't break

---

## 2. `add_markdown_content`

- **Append text:** Add `# New Section\n\nSome paragraph text` with no `after_block_id` → verify blocks appear at end
- **Insert in middle:** Add `## Inserted` with `after_block_id` pointing to a specific block → verify it lands in the right position
- **Bullet list:** Add `- item 1\n- item 2\n- item 3` → verify 3 list blocks created
- **Numbered list:** Add `1. First\n2. Second`
- **Simple table:** Add a markdown table `| A | B |\n|---|---|\n| 1 | 2 |`
- **Bold/italic in markdown:** Add `**bold** and _italic_ text` → verify formatting carries through
- **Error case:** Pass empty string `""` → should fail gracefully

---

## 3. `update_block`

First call `read_docs` to get block IDs.

- **Update text block:** Change a normal text block to new content with plain text
- **Update to heading:** Update a text block with `text_block_type: "LARGE_TITLE"` → verify it becomes H1
- **Update with formatting:** Update a block using mixed delta_format (bold + italic + link in same block)
- **Update list item:** Change a bullet to a checked todo (`list_block_type: "CHECK_LIST"`, `checked: true`)
- **Update code block:** Change content + `language: "python"`
- **Update divider:** Change alignment to `"CENTER"`
- **Wrong block type:** Try to `update_block` on an image block → should fail or return an error (expected — image blocks can't be updated in-place)
- **Invalid block_id:** Use a fake block ID → should fail gracefully with a clear error

---

## 4. `create_block`

- **Text block at end:** Create a `NORMAL_TEXT` block with no `after_block_id` → appends
- **Text block in middle:** Create with `after_block_id` pointing to first block → verify position
- **Heading block:** Create `text` block with `text_block_type: "MEDIUM_TITLE"`
- **Bullet list item:** Create `list_item` with `list_block_type: "BULLETED_LIST"`
- **Numbered list item:** Create `list_item` with `list_block_type: "NUMBERED_LIST"`
- **Todo item (unchecked):** Create `list_item` with `list_block_type: "CHECK_LIST"`
- **Code block:** Create `code` block with `language: "javascript"` and some code content
- **Divider:** Create a `divider` block
- **Page break:** Create a `page_break` block
- **Image:** Create `image` block with a public image URL and `width: 400`
- **Video:** Create `video` block with a YouTube URL
- **Notice box:** Create `notice_box` with each theme: `info`, `tips`, `warning`, `general`
- **Table:** Create `table` with `row_count: 3, column_count: 3` → verify empty table created; get cell block IDs from `read_docs`, then add text inside a cell using `create_block` with `parent_block_id: <cell_id>`
- **Layout:** Create `layout` with `column_count: 2, column_style: [{width: 50}, {width: 50}]` → get column cell IDs from `read_docs`, then place content inside using `parent_block_id`
- **Nested in notice_box:** Create notice_box, then `read_docs` to get its block ID, then create a text block inside it via `parent_block_id`

---

## 5. `delete_block`

- **Delete text block:** Delete a block, verify it's gone via `read_docs`
- **Delete image block:** Create an image block first, then delete it
- **Delete notice_box:** Delete a notice_box block (should delete the container + children)
- **Invalid block_id:** Should fail gracefully

---

## 6. `replace_block`

- **Replace image URL:** Create image block, then `replace_block` with a different `public_url` → verify new image
- **Replace video URL:** Same pattern with a video block
- **Replace notice_box theme:** Create `notice_box` with `info`, then `replace_block` with `warning` → verify theme changed
- **Replace table:** Create a 2×2 table, then replace with a 3×4 table
- **Replace with different block type:** Replace a text block with a divider
- **Provide `after_block_id`:** After replacing, verify the new block lands in the correct position (not just appended)
- **Delete succeeds but create fails:** Pass an invalid block spec for the replacement → should report `[FAILED] replace_block` and note the original block is already gone

---

## 7. Multi-operation batches

- **All success:** Send 3 operations (`set_name` + `add_markdown_content` + `create_block`) → verify `Completed 3/3`
- **Fail-fast:** Send [valid op, invalid op (bad block_id), valid op] → verify only 1 completed, third op was never executed
- **Max ops:** Send 25 operations (all `add_markdown_content`) → should complete
- **26 ops:** Should be rejected by schema validation before any API call

---

## 8. `object_id` resolution

- **Valid object_id:** Use the `object_id` from `read_docs` (the one visible in the URL) instead of `doc_id` → should resolve and execute normally
- **Invalid object_id:** Use a fake object_id → should return `No document found for object_id ...`
- **Both provided:** Provide both `doc_id` and `object_id` → `doc_id` should take priority (no resolution query made)

---

## 9. Validation errors (should fail before any API call)

- **No ID:** Omit both `doc_id` and `object_id` → error message
- **Empty operations array:** `operations: []` → schema validation error
- **Invalid operation_type:** `operation_type: "foo"` → schema rejection
- **Missing required field:** `create_block` with `block_type: "image"` but no `public_url` → schema rejection
- **Table out of range:** `row_count: 26` → schema rejection (max is 25)
- **Layout column_count: 1** → schema rejection (min is 2)

---

## 10. Edge cases

- `add_markdown_content` with very long markdown (500+ words) → does it truncate or handle gracefully?
- Creating a table then immediately populating all cells **in the same operations array** — this should fail because cell block IDs are only available after the table is created. Agents must do it in two separate `update_doc` calls.
- Delta format with only `{insert: {text: "\\n"}}` (single newline op) → should create an empty block
- `checked: true` on a `BULLETED_LIST` item (not a CHECK_LIST) → API accepts silently, property is inert (block stays bulleted)

---

## 11. Complex multi-operation scenarios

These simulate real agent workflows combining multiple operations in a single `update_doc` call. Verify the final doc state via `read_docs` after each scenario.

### 11.1 — Build a structured section from scratch

One call with 6 operations, each `create_block` using `after_block_id` from the previous:
1. `create_block` — `text` with `text_block_type: "LARGE_TITLE"` — "Project Overview"
2. `create_block` — `text` paragraph after the heading
3. `create_block` — `list_item` BULLETED_LIST — "Goal 1" (after paragraph)
4. `create_block` — `list_item` BULLETED_LIST — "Goal 2" (after Goal 1)
5. `create_block` — `list_item` BULLETED_LIST — "Goal 3" (after Goal 2)
6. `create_block` — `divider` after the list

→ Verify `Completed 6/6`. Check all blocks appear in the correct order via `read_docs`.

### 11.2 — Update multiple existing blocks in one call

Call `read_docs` first to get block IDs, then:
1. `update_block` — block A: plain text content change
2. `update_block` — block B: bold + italic mixed formatting
3. `update_block` — block C: code content with `language: "python"`

→ Verify `Completed 3/3`. Each block updated independently, confirmed via `read_docs`.

### 11.3 — Rename + restructure content

1. `set_name` — "Sprint 42 — Planning"
2. `delete_block` — remove an outdated section heading
3. `add_markdown_content` — insert `## New Goal\n\nThis replaces the old content.`
4. `create_block` — `divider` at the end

→ Verify `Completed 4/4`. Doc name changed, old block gone, new blocks in place, divider at end.

### 11.4 — Replace image + update surrounding text

1. `update_block` — update text block above the image (new caption text)
2. `replace_block` — replace old image with a new `public_url`
3. `update_block` — update text block below the image

→ Verify `Completed 3/3`. New image URL confirmed via `read_docs`, surrounding text updated.

### 11.5 — Build a notice_box with nested content (two calls required)

**Call 1:**
1. `create_block` — `notice_box` with `theme: "WARNING"`

**Call 2** (after `read_docs` to get the notice_box block ID):
1. `create_block` — `text` inside notice_box via `parent_block_id`
2. `create_block` — second `text` line inside the same notice_box

→ Verify both text blocks appear nested inside the notice_box via `read_docs`.

### 11.6 — Build and populate a full table (two calls required)

**Call 1:**
1. `create_block` — `table` with `row_count: 2, column_count: 3`

**Call 2** (after `read_docs` to get all 6 cell block IDs):
1–6. `create_block` × 6 — one text block per cell via `parent_block_id`

→ Verify `Completed 7/7` across both calls. All 6 cells have content via `read_docs`.

### 11.7 — Fail-fast in a complex batch

1. `set_name` — "Updated Title" ✓ should succeed
2. `update_block` — valid block + valid content ✓ should succeed
3. `update_block` — **invalid UUID** as `block_id` ✗ should fail
4. `create_block` — text block ✗ should never execute
5. `delete_block` — valid block ✗ should never execute

→ Verify `Completed 2/5`. Operations 4 and 5 were not called. Doc name and block 2 updated, rest untouched.

### 11.8 — Mixed replace + create in one call

1. `replace_block` — replace an image with a new `public_url`
2. `create_block` — `text` caption after the new image
3. `replace_block` — replace a `notice_box` theme (INFO → TIPS)
4. `create_block` — `divider` after the notice_box

→ Verify `Completed 4/4`. New image, caption, updated notice_box, and divider all in correct positions.

### 11.9 — Full doc rewrite using max operations

1. `read_docs` — get all top-level block IDs
2. Single `update_doc` call (up to 25 ops):
   - `delete_block` × N to remove all existing blocks
   - `add_markdown_content` / `create_block` × M to write entirely new content

→ Verify final doc matches the intended structure exactly. Tests the 25-op limit under real conditions.

### 11.10 — Chained positioning requires separate calls

Demonstrates a key limitation: you cannot chain `after_block_id` across operations in the same call because returned block IDs are unknown before execution.

**Wrong approach (one call):**
- `create_block` A → `create_block` B after A → `create_block` C after B → impossible, B's ID is unknown

**Correct approach (one call per block, or use `add_markdown_content` for text):**
- Call 1: create block A → get ID from response
- Call 2: create block B with `after_block_id: <A>` → get ID
- Call 3: create block C with `after_block_id: <B>`

→ Confirm the agent correctly identifies this constraint and uses separate calls (or `add_markdown_content` to append multiple blocks at once).

---

## Section 12 — Extended Coverage Tests

### 12.1 — All delta formatting attributes

Create a text block using every formatting attribute: `underline`, `strike`, `code`, `color` (hex), `background` (hex), and a combined segment using all 6 attributes together (bold + italic + underline + strike + color + background). Verify all attributes are preserved in read_docs output.

### 12.2 — RTL direction + alignment

Create blocks with:
- `alignment: "CENTER"` only
- `alignment: "RIGHT"` only
- `direction: "RTL"` with Hebrew text
- Both `alignment: "CENTER"` + `direction: "RTL"` combined

→ Verify each combination is stored correctly in block content.

### 12.3 — Nested list indentation

Create bulleted list items at indentation levels 0–3 and numbered list items at levels 0–2. Verify each block has the correct `indentation` value.

### 12.4 — Unicode/emoji in content and doc name

- Create blocks with emoji (🚀🌟✨🌍), CJK characters (Chinese, Korean, Japanese), and Arabic text
- Use `set_name` to rename the document with emoji in the title

→ Verify all characters are preserved without corruption.

### 12.5 — Block type optional fields

- `CHECK_LIST` without the `checked` flag (should default unchecked)
- `code` block without `language` field
- `image` block without `width` field

→ Verify all create successfully with defaults.

### 12.6 — Layout nesting, table column_style, replace same type

- Create a `table` with explicit `column_style` (e.g., 30%/70%)
- Create a `layout` with explicit `column_style`
- `replace_block` replacing text with a different text block (same type swap)
- Attempt `create_block` inside a layout using the layout container ID as `parent_block_id` (expected: fail — must use cell ID)

### 12.7 — Error edge cases

- `set_name` with empty string `""` → schema should reject
- `set_name` with very long string (500+ chars) → observe API behavior
- `set_name` on a non-existent doc_id → observe API behavior
- `update_block` to clear content (single `\n` delta) → should succeed

### 12.8 — Concurrent calls and container delete cascade

- Delete a notice_box that contains child blocks → observe if children are cascade-deleted or orphaned
- Delete a table block → observe behavior
- Send two `create_block` calls to the same doc concurrently → verify no race conditions
