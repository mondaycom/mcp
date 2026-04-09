# Changelog

## 5.1.0

### Workforms tools — 2026-07 schema update

All workforms tools now target API version `2026-07` via `versionOverride: '2026-07'`.

**New capabilities in `form_questions_editor` (create action):**
- `block_type` (`FormBlockKind`) — create content blocks in addition to question types. `DISPLAY_TEXT` adds a rich-text content block; `PAGE_BLOCK` inserts a page divider for multi-page forms.
- `insert_after_question_id` — position a new question after a specific existing question instead of appending to the end.
- `page_block_id` — assign a new question to a specific page block in a multi-page form.
- `existing_column_id` — link a new question to an existing board column instead of creating a new one.

**New question settings fields (create and update):**
- `labelLimitCount` — MultiSelect: max options a respondent can select.
- `label_limit_count_enabled` — MultiSelect: enable the selection limit.
- `default_answer` — ShortText/LongText/Name/Link: pre-filled default value.

**Reorder (`updateQuestionOrder` action):**
- `page_block_id` on each question entry — assign questions to page blocks during reorder.

**Description updates:**
- `selectOptions`: clarified that options are now supported on both create and update (PUT semantics).
- All new fields documented with usage constraints and type-specific context.
