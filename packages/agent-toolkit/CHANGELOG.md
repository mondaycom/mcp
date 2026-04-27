# Changelog

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
