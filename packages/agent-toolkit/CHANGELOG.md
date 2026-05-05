# Changelog

## 5.3.2

### Asset upload MCP tools

- Added `get_asset_upload_url` — requests a presigned S3 upload URL for a file. Returns `upload_id`, `upload_url`, and expiry. Includes inline `curl` example for the upload step and ETag capture guidance.
- Added `finalize_asset_upload` — finalizes the upload via `complete_upload` and attaches the asset to a file column on a board item using `change_column_value` (append semantics). Returns `asset_id`, `filename`, `content_type`, `file_size`, `url`, and `filelink`.
- Both tools use `versionOverride: 'dev'` as `create_upload` / `complete_upload` are currently dev-schema-only.

## 5.3.1

### Workforms tools — return full option data from GraphQL queries

- Added `value`, `visible`, and `active` fields to the `QuestionOptionsFragment` GraphQL fragment
- `get_form`, `create_form_question`, and `update_form_question` now return complete option data
- Previously only `label` was returned, preventing safe updates on questions with existing submissions

## 5.1.1

### Workforms tools — options schema and description updates

**`form_questions_editor` options schema:**
- `value` (optional) — internal option identifier. Required when updating options already assigned to board items.
- `visible` (optional) — whether the option is visible to respondents.

**`update-form-tool` schema:**
- `page_block_id` on question order entries — assign questions to page blocks during reorder.

**Description improvements:**
- `selectOptions`: added max limits (SingleSelect: 40, MultiSelect: 500) and PUT semantics clarification.
- `pageBlockId`: clarified that passing `null` removes the page block association.
- Added descriptions for `selectOptionsValue`, `selectOptionsVisible`, `blockType`, `insertAfterQuestionId`, `existingColumnId`, `labelLimitCount`, `labelLimitCountEnabled`, `defaultAnswer`.
