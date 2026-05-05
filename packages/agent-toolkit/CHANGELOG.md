# Changelog

## 5.9.1

### Asset upload MCP tools

- Added `get_asset_upload_url` — requests a presigned S3 upload URL for a file. Returns `upload_id`, `upload_url`, and expiry. Includes inline `curl` example for the upload step and ETag capture guidance.
- Added `finalize_asset_upload` — finalizes the upload via `complete_upload` and attaches the asset to a file column on a board item using `change_column_value` (append semantics). Returns `asset_id`, `filename`, `content_type`, `file_size`, `url`, and `filelink`.
- Both tools use `versionOverride: 'dev'` as `create_upload` / `complete_upload` are currently dev-schema-only.

## 5.7.1

### form_questions_editor — fix ConditionOperator and remove existing_column_id

- Removed `existing_column_id` from the tool schema — this field caused 38% of all tool errors (ColumnNotFound / QuestionTypeIncompatibleWithColumnType) because agents passed arbitrary board column IDs not linked to the form
- Fixed misleading `show_if_rules` description that incorrectly stated AND was used between conditions — all operators must be OR per the GraphQL schema
- Removed `And` from the local `ConditionOperator` enum to align with the GraphQL schema constraint

## 5.7.0

### Add account context to get_user_context tool

- Extended `get_user_context` to include account-level data: plan tier, active member count, trial status, and active products
- Added account fields to the getUserContext GraphQL query (dev API version)
- Updated search tool routing hints to direct account-level queries to `get_user_context`
- Removed standalone `get_account_context` tool (functionality merged into `get_user_context`)

## 5.3.3

### Workforms tools — trim MCP tool descriptions by ~79% to reduce token cost

- Removed descriptions that restate the field name, type, or enum values
- Removed container object descriptions (`"Object containing X configuration"`)
- Rewrote remaining descriptions to be terse and actionable
- Added non-obvious constraints: type immutability on update, safe option update workflow (call `get_form` first), `page_block_id` null vs omit distinction, `existing_column_id` usage guidance
- `update_form` action description now explains each action requires different fields — check field descriptions
- Net result: ~4,591 → ~963 tokens per request across all 4 form tools

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
