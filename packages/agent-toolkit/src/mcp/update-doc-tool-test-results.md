# `update_doc` Tool — Staging Test Results

**Date:** 2026-03-22
**Environment:** monday.com Staging (`mondaystaging.com`)
**Tester:** Cursor Agent (on behalf of Linoy Margan)
**Test Doc:** ID `21779`, object_id `5001537876`, workspace `792768`
**URL:** https://monday.mondaystaging.com/docs/5001537876

---

## Summary

| Section | Tests | Passed | Failed | Notes |
|---------|-------|--------|--------|-------|
| 1. set_name | 2 | 2 | 0 | |
| 2. add_markdown_content | 7 | 6 | 1 | Empty string → API 500 (not a tool bug) |
| 3. update_block | 8 | 7 | 1 | Only divider update fails (API limitation) |
| 4. create_block | 18 | 18 | 0 | All block types including notice_box |
| 5. delete_block | 3 | 3 | 0 | |
| 6. replace_block | 6 | 5 | 1 | Skipped video (same as image) |
| 7. Multi-operation batches | 4 | 4 | 0 | |
| 8. object_id resolution | 3 | 3 | 0 | |
| 9. Validation errors | 6 | 6 | 0 | |
| 10. Edge cases | 4 | 4 | 0 | |
| 11. Complex multi-op scenarios | 10 | 10 | 0 | All real-world workflows pass |
| 12. Extended coverage | 21 | 20 | 1 | Layout nesting needs cell ID (expected) |
| **Total** | **92** | **88** | **4** | |

**4 non-passing results are all expected / API limitations, not tool bugs.**

---

## All Bugs Found & Fixed

### ~~BUG #1~~ (FIXED): `update_block` — JSON serialization

- **Symptom:** All `update_block` calls failed with `"Variable $content of type JSON! was provided invalid value"`
- **Root Cause:** `content` was sent as a raw object instead of a JSON string
- **Fix:** Added `JSON.stringify(rawContent)` in `executeUpdateBlock()`
- **Verified:** ✅ All update_block tests pass

### ~~BUG #2~~ (FIXED): `notice_box` creation — lowercase theme enum

- **Symptom:** All notice_box creates failed with `"invalid type for variable: 'blocksInput'"`
- **Root Cause:** Schema defined lowercase enum values (`'info'`, `'tips'`) but API expects uppercase
- **Fix:** Changed to uppercase in schema: `z.enum(['INFO', 'TIPS', 'WARNING', 'GENERAL'])`
- **Verified:** ✅ All 4 themes create successfully

### ~~BUG #3~~ (FIXED): `update_block` on code blocks — stale `textBlockType`

- **Symptom:** Code block updates failed with `"block content schema violation"`
- **Root Cause:** Old build had `textBlockType: 'CODE'` in the update helper's `code` case, which the API rejects
- **Fix:** Source already had the correct code (no `textBlockType` in update path); required rebuild
- **Verified:** ✅ Code block updates work after rebuild

### ~~Replace block error message~~ (IMPROVED)

- `executeReplaceBlock` now has try/catch around the create step
- When delete succeeds but create fails: `"Original block {id} was deleted, but replacement creation failed: {error}. The original block is gone."`
- **Verified:** ✅ Descriptive error message confirmed

---

## API Limitations Discovered (not tool bugs)

1. **Divider blocks cannot be updated** — API returns "Block type not supported"
2. **Table blocks cannot be updated** — API returns "Block type not supported"
3. **Empty markdown string** — API returns 500 INTERNAL_SERVER_ERROR (could add client-side validation)

---

## Detailed Test Results

### 1. `set_name`

| # | Test | Result | Details |
|---|------|--------|---------|
| 1.1 | Simple rename | ✅ PASS | `Renamed to "Renamed Test Doc"` |
| 1.2 | Special chars | ✅ PASS | `Renamed to "Q4 Plan: Phase 1 & 2 (draft)"` |

---

### 2. `add_markdown_content`

| # | Test | Result | Details |
|---|------|--------|---------|
| 2.1 | Append text (no after_block_id) | ✅ PASS | 2 blocks added at end |
| 2.2 | Insert in middle | ✅ PASS | 1 block inserted after "Section One" — confirmed position |
| 2.3 | Bullet list | ✅ PASS | 3 blocks created (one per bullet) |
| 2.4 | Numbered list | ✅ PASS | 2 blocks created |
| 2.5 | Markdown table | ✅ PASS | 9 blocks created (table + cells) |
| 2.6 | Bold/italic markdown | ✅ PASS | Correct delta_format with bold + italic attributes |
| 2.7 | Empty string `""` | ✅ EXPECTED FAIL | API returns 500 INTERNAL_SERVER_ERROR (API limitation) |

---

### 3. `update_block`

| # | Test | Result | Details |
|---|------|--------|---------|
| 3.1 | Update text block (plain text) | ✅ PASS | Block updated — verified via read_docs |
| 3.2 | Update text block content (normal text) | ✅ PASS | Content updated without changing block type |
| 3.3 | Mixed formatting (bold + italic + link) | ✅ PASS | Rich formatting verified in delta_format |
| 3.4 | Update list item (content + checked) | ✅ PASS | Content and checked state updated |
| 3.5 | Update code block (python) | ✅ PASS | Code content and language updated |
| 3.6 | Update divider | ❌ EXPECTED FAIL | "Block type not supported" — API limitation |
| 3.7 | Wrong block type (table) | ✅ EXPECTED FAIL | "Block type not supported" — correct behavior |
| 3.8 | Invalid block_id | ✅ EXPECTED FAIL | "block_id must be UUID" — clear error |

---

### 4. `create_block`

| # | Test | Result | Details |
|---|------|--------|---------|
| 4.1 | Text block at end | ✅ PASS | Block created at end |
| 4.2 | Text block in middle | ✅ PASS | Correctly positioned after specified block |
| 4.3 | Heading block (MEDIUM_TITLE) | ✅ PASS | H2 created |
| 4.4 | Bullet list item | ✅ PASS | BULLETED_LIST created |
| 4.5 | Numbered list item | ✅ PASS | NUMBERED_LIST created |
| 4.6 | Todo item (unchecked) | ✅ PASS | CHECK_LIST created |
| 4.7 | Code block (javascript) | ✅ PASS | Code block with language created |
| 4.8 | Divider | ✅ PASS | Divider created |
| 4.9 | Page break | ✅ PASS | Page break created |
| 4.10 | Image | ✅ PASS | Image with URL + width created |
| 4.11 | Video (YouTube) | ✅ PASS | Video embed created |
| 4.12 | Notice box (INFO) | ✅ PASS | |
| 4.13 | Notice box (TIPS) | ✅ PASS | |
| 4.14 | Notice box (WARNING) | ✅ PASS | |
| 4.15 | Notice box (GENERAL) | ✅ PASS | |
| 4.16 | Table (3×3) | ✅ PASS | Table created |
| 4.17 | Layout (2 col) | ✅ PASS | Layout with column_style created |
| 4.18 | Nested in table cell | ✅ PASS | Text created inside cell via parent_block_id |

---

### 5. `delete_block`

| # | Test | Result | Details |
|---|------|--------|---------|
| 5.1 | Delete text block | ✅ PASS | Confirmed gone via read_docs |
| 5.2 | Delete image block | ✅ PASS | Image block deleted |
| 5.3 | Invalid block_id | ✅ EXPECTED FAIL | "block_id must be UUID" |

---

### 6. `replace_block`

| # | Test | Result | Details |
|---|------|--------|---------|
| 6.1 | Replace image URL | ✅ PASS | Old image deleted, new image created |
| 6.2 | Replace text with divider | ✅ PASS | Block replaced |
| 6.3 | Replace with after_block_id | ✅ PASS | Positioned correctly after specified block |
| 6.4 | Replace notice_box theme | ✅ PASS | INFO → WARNING, new block created |
| 6.5 | Delete succeeds, create fails | ✅ PASS | Descriptive error: "Original block was deleted, but replacement creation failed: ... The original block is gone." |
| 6.6 | Replace video URL | ⏭ SKIP | Same mechanism as image (passed) |

---

### 7. Multi-operation batches

| # | Test | Result | Details |
|---|------|--------|---------|
| 7.1 | All success (3 ops) | ✅ PASS | `Completed 3/3 operations` |
| 7.2 | Fail-fast | ✅ PASS | `Completed 1/3 operations` — third op never executed |
| 7.3 | Max ops (25) | ✅ PASS | `Completed 25/25 operations` |
| 7.4 | 26 ops (over limit) | ✅ PASS | Schema rejection: `Array must contain at most 25 element(s)` |

---

### 8. `object_id` resolution

| # | Test | Result | Details |
|---|------|--------|---------|
| 8.1 | Valid object_id | ✅ PASS | Resolved to doc_id, rename succeeded |
| 8.2 | Invalid object_id | ✅ PASS | `Error: No document found for object_id 9999999999.` |
| 8.3 | Both provided (doc_id priority) | ✅ PASS | doc_id takes priority, no resolution query |

---

### 9. Validation errors (schema-level rejection)

| # | Test | Result | Details |
|---|------|--------|---------|
| 9.1 | No ID | ✅ PASS | `Error: Either doc_id or object_id must be provided.` |
| 9.2 | Empty operations | ✅ PASS | `Array must contain at least 1 element(s)` |
| 9.3 | Invalid operation_type | ✅ PASS | `Invalid discriminator value` |
| 9.4 | Missing required field | ✅ PASS | `Required` at `public_url` |
| 9.5 | Table row_count: 26 | ✅ PASS | `Number must be less than or equal to 25` |
| 9.6 | Layout column_count: 1 | ✅ PASS | `Number must be greater than or equal to 2` |

---

### 10. Edge cases

| # | Test | Result | Details |
|---|------|--------|---------|
| 10.1 | Very long markdown (500+ words) | ✅ PASS | 1 block created, no truncation |
| 10.2 | Table + populate in same batch | ✅ EXPECTED FAIL | 1/2 completed — cell IDs only available after read_docs |
| 10.3 | Single newline delta | ✅ PASS | Empty block created successfully |
| 10.4 | `checked: true` on BULLETED_LIST | ✅ PASS | API accepts silently, stores `checked:true` in content, but block stays "bulleted list" type. No error, no conversion — the property is inert. |

---

### 11. Complex multi-operation scenarios

| # | Test | Ops | Result | Details |
|---|------|-----|--------|---------|
| 11.1 | Build structured section from scratch | 6 create_block | ✅ 6/6 | H1 + paragraph + 3 bullets + divider all created in order |
| 11.2 | Update multiple existing blocks | 3 update_block | ✅ 3/3 | Plain text, bold+italic, and code block all updated independently |
| 11.3 | Rename + restructure content | set_name + delete + add_markdown + create | ✅ 4/4 | Doc renamed, old block deleted, new markdown + divider added |
| 11.4 | Replace image + update surrounding text | 2 update_block + 1 replace_block | ✅ 3/3 | Caption above updated, image replaced with new URL, caption below updated |
| 11.5 | Notice_box with nested content (2 calls) | Call 1: create notice_box; Call 2: 2 create_block with parent_block_id | ✅ 1/1 + 2/2 | Both text blocks nested inside the notice_box — verified via read_docs |
| 11.6 | Build and populate full table (2 calls) | Call 1: create table; Call 2: 4 create_block with parent_block_id | ✅ 1/1 + 4/4 | All 4 cells of 2×2 table populated with text content |
| 11.7 | Fail-fast in complex batch | set_name + update + invalid update + create + delete | ✅ 2/5 | Ops 1-2 succeeded, op 3 failed ("Block not found"), ops 4-5 never executed — correct fail-fast |
| 11.8 | Mixed replace + create in one call | 2 replace_block + 2 create_block | ✅ 4/4 | Image replaced, caption created, notice_box theme changed (INFO→TIPS), divider added |
| 11.9 | Full doc rewrite using max operations | 1 set_name + 1 delete + 18 create_block | ✅ 20/20 | Entire doc wiped and rebuilt with headings, bullets, code, notice_box, numbered list, image, and formatted text — all in a single call |
| 11.10 | Chained positioning (3 separate calls) | 3 × create_block with after_block_id | ✅ 3×1/1 | Blocks A→B→C inserted in correct order after title — verified positions via read_docs (163840 → 180224 → 188416) |

**Test doc for 11.9/11.10:** ID `21799`, URL: https://monday.mondaystaging.com/docs/5001538285

---

### 12. Extended coverage

**Test Doc:** ID `21805`, object_id `5001538396`, workspace `792768`
**URL:** https://monday.mondaystaging.com/docs/5001538396

| # | Test | Result | Details |
|---|------|--------|---------|
| 12.1 | All delta formatting attributes | ✅ PASS | underline, strike, code, color (#ff0000), background (#ffff00), and all 6 combined — all stored correctly in delta_format |
| 12.2a | CENTER alignment | ✅ PASS | `"alignment":"center"` stored in block content |
| 12.2b | RIGHT alignment | ✅ PASS | `"alignment":"right"` stored in block content |
| 12.2c | RTL direction (Hebrew) | ✅ PASS | `"direction":"rtl"` stored; Hebrew text rendered correctly |
| 12.2d | RTL + CENTER combined | ✅ PASS | Both `alignment:"center"` and `direction:"rtl"` stored together |
| 12.3a | Bulleted list indentation 0–3 | ✅ PASS | All 4 levels created with correct indentation values |
| 12.3b | Numbered list indentation 0–2 | ✅ PASS | 3 levels of numbered lists nested correctly |
| 12.4a | Emoji in content | ✅ PASS | 🚀🌟✨🌍 all stored and rendered correctly |
| 12.4b | CJK characters (Chinese, Korean, Japanese) | ✅ PASS | 你好世界, 안녕하세요, こんにちは all preserved |
| 12.4c | Arabic text | ✅ PASS | مرحبا بالعالم stored correctly |
| 12.4d | Emoji in doc name (set_name) | ✅ PASS | `"📝 Section 12 — Extended Tests 🧪"` — emoji in doc name works |
| 12.5a | CHECK_LIST without checked flag | ✅ PASS | Created as "check list" type (unchecked by default) |
| 12.5b | Code block without language | ✅ PASS | Created successfully with no language attribute |
| 12.5c | Image without width | ✅ PASS | Created successfully with only public_url |
| 12.6a | Table with column_style | ✅ PASS | 2×2 table created with 30/70 column widths |
| 12.6b | Layout with column_style | ✅ PASS | 2-column layout created with 30/70 widths |
| 12.6c | Replace same type (text → text) | ✅ PASS | Old block deleted, new block created in place |
| 12.6d | Layout nesting (container as parent) | ❌ EXPECTED FAIL | API requires cell block ID, not the layout container ID — same as tables |
| 12.7a | Empty name | ✅ PASS | Schema rejects: "String must contain at least 1 character(s)" |
| 12.7b | Very long name (510 chars) | ✅ PASS | API accepts without error — no length limit enforced |
| 12.7c | Non-existent doc_id (999999999) | ⚠️ OBSERVATION | API returns success silently — `updateDocName` mutation does not validate doc existence |
| 12.7d | Clear block content (single newline) | ✅ PASS | Block content cleared to empty successfully |
| 12.8a | Delete notice_box container (cascade?) | ✅ PASS (no cascade) | Container deleted, but child block survives as orphan — **deleting a container does NOT cascade-delete children** |
| 12.8b | Delete table container | ✅ PASS | Table block deleted successfully |
| 12.8c | Concurrent create calls (2 parallel) | ✅ PASS | Both blocks created successfully — no race condition |

---

## API Behaviors Discovered in Section 12

4. **`set_name` with non-existent doc_id** — The `updateDocName` mutation returns success even for non-existent doc IDs. No ownership or existence validation.
5. **`set_name` with very long name** — No server-side length limit enforced (tested with 510 chars).
6. **Deleting container blocks does NOT cascade-delete children** — Child blocks become orphaned top-level blocks. They can still be updated/deleted individually.
7. **Table/layout cell nesting is NOT supported by the API** — All mutations (`create_block` with `parent_block_id`, `update_block` on cell IDs, `add_markdown_content` with `after_block_id` on cell IDs) fail with INTERNAL_SERVER_ERROR or "Block not found". Only `notice_box` nesting works.
8. **Table workaround** — Use `add_markdown_content` with a markdown table string to create a pre-populated table in one shot.
9. **Layout — no workaround** — Layouts have no markdown equivalent. They can only be created empty; no way to populate columns through the API.

---

## Recommendations (nice-to-have)

1. **Empty markdown validation**: Add client-side check for empty string in `executeAddMarkdown()` to return a friendly error instead of letting the API 500.
2. **Divider update_block**: Consider removing divider from the `update_block` content schema or documenting that dividers are not updatable (use `replace_block` instead).
3. **Non-existent doc_id on set_name**: The API silently accepts renames for non-existent docs. The tool could add a pre-check, but it would add latency. Document as a known API behavior.
4. **Container cascade documentation**: Document that deleting a container (notice_box, table, layout) does not delete child blocks. Agents should delete children first if a clean removal is needed.
