# Agent Tools Expansion — Design Spec

**Date:** 2026-05-13  
**Package:** `packages/agent-toolkit`  
**Location:** `src/core/tools/platform-api-tools/agents-tools/`

---

## Problem

The existing agent tools (`get_agent`, `create_agent`, `delete_agent`) cover only basic CRUD. The agents subgraph exposes a much richer surface — skills, triggers, state management, knowledge/resource access — that agents cannot yet use via the toolkit.

The core challenge is discoverability: consumers never know available skill IDs, trigger `block_reference_id` values, or the required `field_values` shape for a given trigger type. The catalog queries exist precisely to solve this, and the tool descriptions must encode the lookup-first workflow so agents know to consult them before acting.

---

## Scope

6 new tools covering all remaining agents subgraph operations:

| Tool | Type | Operations |
|------|------|-----------|
| `get_agent_catalog` | READ | `agent_skills_catalog`, `agent_triggers_catalog` |
| `manage_agent_triggers` | WRITE | `agent_active_triggers` (list), `add_trigger_to_agent`, `remove_trigger_from_agent` |
| `manage_agent_skills` | WRITE | `add_skill_to_agent`, `remove_skill_from_agent` |
| `update_agent` | WRITE | `update_agent` |
| `manage_agent_state` | WRITE | `activate_agent`, `deactivate_agent`, `run_agent` |
| `manage_agent_knowledge` | WRITE | `agent_knowledge` (list), `add_agent_resource_access`, `remove_agent_resource_access`, `update_agent_resource_access` |

Out of scope: `get_agent` is unchanged — the subgraph will be enhanced in a future iteration to include more fields (active triggers, knowledge) directly on the Agent type.

---

## File Structure

Each tool is co-located with its own `.graphql.dev.ts` file. The `shared/` directory keeps only the `AgentFields` fragment (used by the existing get/create/delete tools).

```
agents-tools/
├── shared/
│   └── agents.graphql.dev.ts                        ← AgentFields fragment only (unchanged)
├── get-agent-catalog/
│   ├── get-agent-catalog-tool.ts
│   └── get-agent-catalog.graphql.dev.ts
├── manage-agent-triggers/
│   ├── manage-agent-triggers-tool.ts
│   └── manage-agent-triggers.graphql.dev.ts
├── manage-agent-skills/
│   ├── manage-agent-skills-tool.ts
│   └── manage-agent-skills.graphql.dev.ts
├── update-agent/
│   ├── update-agent-tool.ts
│   └── update-agent.graphql.dev.ts
├── manage-agent-state/
│   ├── manage-agent-state-tool.ts
│   └── manage-agent-state.graphql.dev.ts
└── manage-agent-knowledge/
    ├── manage-agent-knowledge-tool.ts
    └── manage-agent-knowledge.graphql.dev.ts
```

---

## Tool Designs

### `get_agent_catalog` (READ)

**Purpose:** Account-wide discovery of available trigger types and skills. Always call this before adding a trigger or skill to an agent.

**Input schema:**
```typescript
{
  type: z.enum(['triggers', 'skills']),
  // For triggers only — fetches specific entries much faster than full catalog
  block_reference_ids: z.array(z.string()).optional()
}
```

**Behavior:**
- `type: 'triggers'` → calls `agent_triggers_catalog`. Returns entries with `block_reference_id`, `name`, `description`, `field_schemas`, `required_fields`. `field_schemas` describes the shape of `field_values` required when adding (e.g. `{ board_id: <ID> }`). `required_fields` lists fields the user must supply.
- `type: 'skills'` → calls `agent_skills_catalog`. Returns entries with `id`, `name`, `description`.

**Description preamble:**
> Call this tool first before adding a trigger or skill to an agent. For triggers: inspect `field_schemas` and `required_fields` to know what to collect from the user (e.g. board_id, column_id) before calling `manage_agent_triggers`. For skills: use the returned `id` to call `manage_agent_skills`.

---

### `manage_agent_triggers` (WRITE)

**Purpose:** List, add, and remove triggers on a specific agent.

**Input schema (discriminated by `action`):**
```typescript
{
  action: z.enum(['list', 'add', 'remove']),
  agent_id: z.string(),
  // add only
  block_reference_id: z.string().optional(),
  field_values: z.record(z.unknown()).optional(),
  // remove only
  node_id: z.string().optional()
}
```

**Behavior:**
- `list` → calls `agent_active_triggers(agent_id)`. Returns active triggers with `node_id`, `block_reference_id`, `name`, `description`, `field_summary`.
- `add` → calls `add_trigger_to_agent`. Requires `block_reference_id` (from catalog) and optional `field_values` (shape determined by `field_schemas` in the catalog entry).
- `remove` → calls `remove_trigger_from_agent`. Requires `node_id` (from `action: list`).

**Description — add workflow:**
> To add: first call `get_agent_catalog` with `type: triggers` to find the right entry by name/description. Inspect `field_schemas` and `required_fields` to know what information to collect from the user (e.g. which board, which column). Only then call this tool with `action: add`.

**Description — remove workflow:**
> To remove: first call this tool with `action: list` to see the active triggers by name and `field_summary`. Match the trigger the user described, get its `node_id`, then call this tool with `action: remove`.

---

### `manage_agent_skills` (WRITE)

**Purpose:** Attach and detach skills from an agent.

**Input schema:**
```typescript
{
  action: z.enum(['add', 'remove']),
  agent_id: z.string(),
  skill_id: z.string()
}
```

**Behavior:**
- `add` → calls `add_skill_to_agent`
- `remove` → calls `remove_skill_from_agent`

**Description preamble:**
> Always call `get_agent_catalog` with `type: skills` first to discover available skills and resolve the correct `skill_id` — never guess or invent a skill ID.

---

### `update_agent` (WRITE)

**Purpose:** Update an agent's profile or execution plan. Creates a new draft internally and publishes in one call.

**Input schema:**
```typescript
{
  id: z.string(),
  name: z.string().optional(),
  role: z.string().optional(),
  role_description: z.string().optional(),
  plan: z.string().optional(),       // markdown
  agent_model: z.string().optional() // discourage unless user explicitly named a model
}
```

**Behavior:** Calls `update_agent`. All profile fields are optional — only provided fields are changed. Mirrors the same `agent_model` guidance as `create_agent` (strongly discourage setting it; omit unless user explicitly named a model).

---

### `manage_agent_state` (WRITE)

**Purpose:** Activate, deactivate, or manually trigger a run for an agent.

**Input schema:**
```typescript
{
  action: z.enum(['activate', 'deactivate', 'run']),
  agent_id: z.string(),
  // deactivate only
  inactive_reason: z.enum(['DEACTIVATED_BY_USER', 'ACCOUNT_LEVEL_BLOCKING']).optional()
}
```

**Behavior:**
- `activate` → calls `activate_agent`. Agent transitions to ACTIVE and can receive triggers.
- `deactivate` → calls `deactivate_agent`. `inactive_reason` defaults to `DEACTIVATED_BY_USER` if omitted.
- `run` → calls `run_agent`. Fire-and-forget async operation. Returns `trigger_uuid` for downstream correlation. Success means the run was enqueued, not that it completed.

---

### `manage_agent_knowledge` (WRITE)

**Purpose:** List, grant, update, and revoke an agent's access to monday.com boards and docs.

**Input schema (discriminated by `action`):**
```typescript
{
  action: z.enum(['list', 'add', 'update', 'remove']),
  agent_id: z.string(),
  // add, update, remove
  resource_id: z.string().optional(),
  scope_type: z.enum(['BOARD', 'DOC']).optional(),
  // add, update
  permission_type: z.enum(['READ', 'READ_WRITE']).optional()
}
```

**Behavior:**
- `list` → calls `agent_knowledge(agent_id)`. Returns current resources (boards/docs) with `resource_id`, `scope_type`, `permission_type`, plus uploaded files.
- `add` → calls `add_agent_resource_access`. Grants agent access to a board or doc with the specified permission level.
- `update` → calls `update_agent_resource_access`. Changes the permission level on an already-granted resource.
- `remove` → calls `remove_agent_resource_access`. Revokes access entirely.

**Description preamble:**
> Call with `action: list` first to see the agent's current resource access before adding, updating, or removing. For `add`/`update`, `permission_type: READ` allows the agent to read the resource; `READ_WRITE` also allows writing.

---

## Key Design Decisions

**Catalog-first descriptions:** Tool descriptions are the primary mechanism for guiding agent behavior. Every WRITE tool that requires an ID from a catalog or list operation explicitly names the prerequisite call. This is more reliable than trying to enforce it in code.

**`field_values` as record:** `add_trigger_to_agent` takes `field_values: JSON` in the schema. The Zod type is `z.record(z.unknown())` — flexible enough to accommodate any trigger type's shape. The `field_schemas` from the catalog entry describes the expected shape at runtime.

**`manage_agent_triggers` and `manage_agent_knowledge` are typed WRITE:** Both include a `list` action that is read-only in effect, but the tools are typed WRITE because their primary purpose is mutation and the list actions exist specifically to support the write workflow (get `node_id` before remove, inspect resources before update). In `readOnlyMode`, WRITE tools are filtered out — this means `list` is unavailable in read-only configurations, which is an accepted trade-off. If this becomes a problem in practice, the list operations can be split into `get_agent` in a future iteration when the subgraph enhances the Agent type to include active triggers and knowledge directly.

---

## GraphQL Operations (per tool)

### `get-agent-catalog.graphql.dev.ts`
- `query getAgentTriggersCatalog($block_reference_ids: [ID!])`
- `query getAgentSkillsCatalog`

### `manage-agent-triggers.graphql.dev.ts`
- `query getAgentActiveTriggers($agent_id: ID!)`
- `mutation addTriggerToAgent($agent_id: ID!, $block_reference_id: ID!, $field_values: JSON)`
- `mutation removeTriggerFromAgent($agent_id: ID!, $node_id: ID!)`

### `manage-agent-skills.graphql.dev.ts`
- `mutation addSkillToAgent($agent_id: ID!, $skill_id: ID!)`
- `mutation removeSkillFromAgent($agent_id: ID!, $skill_id: ID!)`

### `update-agent.graphql.dev.ts`
- `mutation updateAgent($id: ID!, $input: UpdateAgentInput!)`

### `manage-agent-state.graphql.dev.ts`
- `mutation activateAgent($id: ID!)`
- `mutation deactivateAgent($id: ID!, $inactive_reason: InactiveReason)`
- `mutation runAgent($id: ID!)`

### `manage-agent-knowledge.graphql.dev.ts`
- `query getAgentKnowledge($agent_id: ID!)`
- `mutation addAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!, $permission_type: KnowledgePermission!)`
- `mutation removeAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!)`
- `mutation updateAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!, $permission_type: KnowledgePermission!)`

---

## Registration

In `src/core/tools/platform-api-tools/index.ts`:
- 6 new imports
- 6 additions to `allGraphqlApiTools` array (grouped under existing agents comment)
- 6 new `export *` lines

---

## Error Handling

All tools use `rethrowWithContext(error, '<operation name>')` in a try/catch, consistent with existing agent tools.

---

## Testing

One `.test.ts` per tool, co-located, using `createMockApiClient()`. Each test file covers:
- Happy path for each action
- Validation errors (missing required fields for wrong action)
- API error propagation via `rethrowWithContext`

---

## Post-Implementation

After all tool files are written:
1. Run `npm run fetch:generate dev` to regenerate dev types from new GraphQL operations
2. Run `npm test` to verify all tests pass
3. Run `npm run build` to verify compilation
4. Bump version in `package.json`
