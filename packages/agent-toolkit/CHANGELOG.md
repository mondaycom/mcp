# Changelog

## 5.24.0

### manage_automations — rename from manage_workflows

- Renamed `manage_workflows` tool to `manage_automations` for consistency with `list_automations` and `create_automation`
- Updated tool title and description accordingly; removed the now-unnecessary "Terminology: workflows = automations" note
- No functional changes — activate, deactivate, and delete behaviour is unchanged

### automations-tools — directory restructure

- Renamed `workflows-tools/` → `automations-tools/` and `list-workflows/` → `list-automations/` to align directory names with tool naming convention
- Removed stale note from `publish_workflow` description that incorrectly referenced `manage_automations` as a way to retrieve draft IDs

## 5.22.0

### plan_workflow — new tool

- Adds `plan_workflow` MCP tool that calls the `workflow-planner` platform-agent proxy (`/platform-ai-gateway/agents/workflow-planner`)
- Takes a single `prompt` (max 2000 chars) describing a process and returns a structured markdown plan: workflow breakdowns, block IDs, Mermaid diagrams, resource definitions, and assumption/gap notes
- Use before `create_workflow` to understand how to decompose a complex process into individual workflows and which resources to create first
- Adds `WORKFLOW_PLANNER_AGENT_URL` constant to `workflow-builder-tools/constants.ts`

## 5.21.0

### get_board_activity — add user_ids filter

- Added optional `userIds` parameter to filter activity logs to actions performed by specific users
- Updated GraphQL query (`GetBoardActivity`) to pass `user_ids` argument to `activity_logs`
- Updated `getDescription()` to reflect the new filtering capabilities

## 5.20.0

### Add agent management tools

Five new tools enabling agents to create and manage monday.com platform agents end-to-end:

- `manage_agent` — full lifecycle management: `create` (AI mode via prompt), `create_blank` (manual mode), `get`, `update`, `delete`, `activate`, `deactivate`, `run`
- `manage_agent_triggers` — manage per-agent triggers (when it runs): `list`, `add`, `remove`
- `manage_agent_skills` — full skill lifecycle: `create` a new skill in the catalog, `add` to agent, `remove` from agent
- `manage_agent_knowledge` — grant, update, or revoke an agent's access to boards and docs
- `agent_catalog` (READ) — browse the account-wide catalog of available trigger types and skills before wiring them to an agent

## 5.19.0

### publish_workflow — surface validation error details

- `rethrowWithContext` now includes GraphQL `extensions` data in the error message when present, so structured errors like `WORKFLOW_VALIDATION_FAILED` (with step-level issue details) are passed through to the LLM instead of being dropped

## 5.11.0

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
