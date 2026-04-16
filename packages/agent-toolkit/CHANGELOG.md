# Changelog

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
