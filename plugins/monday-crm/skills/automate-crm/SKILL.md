---
name: automate-crm
description: Set up, view, and manage automations on monday CRM boards using natural language — no block IDs or technical knowledge required. Use when someone says "set up an automation", "automate this", "when a deal is won notify me", "remind me when a date passes", "move deals automatically", "what automations do I have", "turn off automation", "create a workflow", "automate my pipeline", or "set up a rule".
argument-hint: "[automation description — 'notify owner when deal is won and move to Closed Won group', 'remind me 3 days before close date', 'what automations are on my deals board']"
user-invocable: true
allowed-tools: [Read, AskUserQuestion, mcp__monday__get_user_context, mcp__monday__get_board_info, mcp__monday__search, mcp__monday__get_board_items_page, mcp__monday__create_automation, mcp__monday__list_automations, mcp__monday__manage_automations]
---

# Automate CRM

Flow: **Detect intent → Resolve board → Describe automation → Create / List / Manage → Confirm**

## Input
- Optional: automation description via argument (e.g., "notify owner when Stage = Won").
- Optional: board name or type (Deals, Contacts, Leads).

## Output
- **Create:** active automation on the target board, confirmed with a summary of what it does.
- **List:** formatted table of automations currently active on the board.
- **Manage:** automation activated, deactivated, or deleted, with confirmation.

## Knowledge

### Most common CRM automations (by account usage)

| Trigger | Action | Accounts |
|---------|--------|----------|
| Status changes to something | Move item to group | 9,821 |
| Status changes to something | Notify someone | 6,482 |
| Status changes to something | Set date | 6,341 |
| Item created | Notify someone / assign / set date | 10,019 |
| Date arrives | Notify / change status | 4,972 |
| Button clicked | Any action | 3,015 |
| Status changes from X to Y | Move / notify | 1,721 |

**The dominant CRM pattern:** status change → move to group. When in doubt, this is what most users want.

### Automations vs. Workflows
- **Automations** (`create_automation`) — board-scoped trigger/action rules. Active immediately on creation. **Use for CRM daily operations.**
- **Workflows** (`create_workflow`) — workspace-level, cross-board objects. Start as drafts; must be published. Use only when explicitly asked.

### Known limitations
- **No date arithmetic.** Engine only accepts static dates — cannot compute "7 days from today". Offer `today` as fallback or a periodic trigger.
- **Column resolution.** Tool matches columns by semantic similarity. If a column doesn't exist, the tool returns `needs_clarification`.
- **One trigger per automation.**
- **Legacy automations are read-only** — `list_automations` returns them but they cannot be modified via MCP.

### `needs_clarification` response
When `create_automation` returns `needs_clarification`, present each `unresolvedField` with available options, collect the answer, then retry.

---

## Step 0: Connector check

1. `mcp__monday__get_user_context`. On error → print install prompt, stop.

---

## Step 1: Detect intent

| Intent | Trigger signals |
|--------|----------------|
| **create** | "set up", "create", "automate", "when X then Y", default |
| **list** | "what automations", "show automations", "which rules" |
| **manage** | "turn off", "disable", "delete", "activate", "remove automation" |

---

## Step 2: Resolve board

1. Extract board reference from argument (Deals, Contacts, Leads, or specific name).
2. If mentioned → `mcp__monday__search` or `get_user_context` favorites.
3. If not mentioned → ask: *"Which board? (e.g. Deals, Contacts, Leads)"*

---

## Step 3: Create automation

### 3a: Clarify if vague

If the user says something generic, present top 3 patterns:
> *"What should trigger it? Common CRM automations:*
> *1. Stage = Won → notify owner + move to Closed Won group*
> *2. New deal created → assign + set close date*
> *3. Close date arrives → notify owner*
> *Or describe what you want."*

### 3b: HITL gate before creating

> *"Create this automation on [board name]?"*
> ```
> When: Stage → Won
> Action 1: Notify [deal owner]
> Action 2: Move item to Closed Won group
> ```
> *(yes / edit / cancel)*

On "yes" → `mcp__monday__create_automation({ boardId, userPrompt })`.

### 3c: Handle `needs_clarification`

If returned: parse `unresolvedFields`, present options to user, incorporate answer, retry once.

### 3d: Confirm

On `status: "activated"`:
> *"Done. Automation is live on [board name].*
> *From now on: when Stage = Won → [owner] is notified + item moves to Closed Won."*

---

## Step 4: List automations

1. `mcp__monday__list_automations({ boardId })`.
2. Format as table: Name, Trigger, Status.
3. Note legacy automations as read-only.
4. Offer next action: *"Want to turn any off, or set up a new one?"*

---

## Step 5: Manage (activate / deactivate / delete)

1. Resolve ID via `list_automations` if needed.
2. For **delete**: explicit irreversibility warning: *"Delete '[name]'? This can't be undone. (yes / cancel)"*
3. `mcp__monday__manage_automations({ workflowId, action })`.
4. Confirm: *"Done. '[name]' is now [state]."*

---

## Cross-skill handoffs

- **From workspace-builder:** after building a workspace, suggest top-3 automations.
- **From meeting-to-opportunity:** after converting a meeting to a deal, suggest a follow-up automation.
- **From log-activity:** if a user mentions repeating a notification manually, suggest automating it.

---

## Error handling reference

| Failure | Behavior |
|---------|----------|
| Connector missing | Step 0 stops; print install prompt. |
| Board not found | Broaden search; ask user. |
| `needs_clarification` | Present unresolved fields; gather answers; retry once. |
| Date arithmetic requested | Explain limitation; offer `today` or periodic trigger. |
| Legacy automation on manage | *"This automation was set up in an older way and can't be modified here."* |
| Delete on legacy | Same as above. |
| Create fails after retry | Surface error; suggest monday.com UI as fallback. |

---

## Completion criteria

- [ ] Connector check passed.
- [ ] Intent classified (create / list / manage).
- [ ] Board resolved before any tool call.
- [ ] User confirmed automation via HITL before `create_automation`.
- [ ] `needs_clarification` handled: fields presented, user answered, retried.
- [ ] Date arithmetic limitation surfaced if relevant.
- [ ] Delete: explicit irreversibility warning shown.
- [ ] Legacy automations flagged as read-only.