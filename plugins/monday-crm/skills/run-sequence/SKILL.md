---
name: run-sequence
description: Manage CRM sequences end-to-end — list, create, enroll contacts, activate/deactivate, duplicate, and track performance. Use when someone says "what sequences do I have", "create a welcome sequence", "enroll this contact in a sequence", "add these leads to my nurture sequence", "deactivate the cold outreach sequence", "activate my new sequence", "how is my nurture sequence doing", "show me sequence analytics", "create a drip campaign", "who is enrolled in", "duplicate this sequence", "set up a new outreach flow", "check this contact's sequence history", or "what sequences is this lead in".
argument-hint: "[optional: action + target — 'list sequences on Leads board', 'enroll Acme in welcome sequence', 'analytics for Q2 nurture', 'duplicate cold outreach']"
user-invocable: true
allowed-tools: [Read, AskUserQuestion, mcp__monday__get_user_context, mcp__monday__list_workspaces, mcp__monday__search, mcp__monday__get_board_info, mcp__monday__get_board_items_page, mcp__monday__get-board-sequences, mcp__monday__get-sequence-analytics, mcp__monday__get-contact-journey, mcp__monday__enroll-item-in-sequence, mcp__monday__activate-sequence, mcp__monday__deactivate-sequence, mcp__monday__duplicate-sequence, mcp__monday__create-sequence, mcp__monday__get-connected-email-accounts, mcp__monday__all_monday_api]
---

# Run Sequence

Flow: **Trigger → Detect intent → Resolve board/sequence/contact → Execute → Confirm + report**.

## Input
- Optional: action + target via argument (e.g., "enroll Acme in welcome sequence").
- If no argument: ask what they want to do.

## Output
- **List:** sequences on a board with status, step count, enrollment counts, analytics.
- **Create:** new sequence scaffolded via the tool's built-in gate flow (board → steps → email sender if needed), starts INACTIVE.
- **Enroll:** one or more CRM items enrolled in a sequence; returns succeeded/failed counts.
- **Activate/Deactivate:** sequence state toggled with confirmation. Deactivate does NOT stop existing enrollments — only blocks new ones.
- **Duplicate:** copy of a sequence created in INACTIVE state.
- **Analyze:** per-run + level + step funnel (reply rate, open rate, click-through).
- **Contact journey:** all sequences a contact is enrolled in, sorted by most recent.

## Knowledge
- Sequence states: ACTIVE (enrolling + running), INACTIVE (not enrolling; existing runs continue).
- `deactivate-sequence` ≠ pause — enrolled contacts keep progressing; only new enrollments are blocked.
- No sequence editing tool exists — steps cannot be added/modified via MCP. Direct users to Tools → Sequences in the UI.
- `get-board-sequences` requires a `board_id` — always resolve the board first.
- `create-sequence` has a built-in gate system: call it with what you have; if anything's missing the tool returns `CONFIRMATION_REQUIRED` with exact instructions — follow them verbatim, never pre-empt the gates.
- `enroll-item-in-sequence` takes `board_id`, `sequenceId`, and `itemIds` (array of string IDs).

## Tools (MCP)
- `get-board-sequences` — list sequences on a board (needs `board_id`).
- `get-sequence-analytics` — per-run, level, and step analytics for one sequence.
- `get-contact-journey` — all sequences a contact/item is enrolled in (needs `board_id` + `item_id`).
- `enroll-item-in-sequence` — enroll one or more items in a sequence.
- `activate-sequence` — INACTIVE → ACTIVE.
- `deactivate-sequence` — ACTIVE → INACTIVE (existing enrollments continue).
- `duplicate-sequence` — copy a sequence; new copy starts INACTIVE.
- `create-sequence` — create a new sequence; call directly with whatever args you have.
- `get-connected-email-accounts` — list linked Gmail/Outlook accounts; used when `create-sequence` gate requires a sender.
- `get_user_context` — user identity + account.
- `search` / `get_board_info` / `get_board_items_page` — resolve boards and items by name.

## Cross-skill handoffs
- **From daily-briefing:** brief can surface sequences with low engagement → suggest `/monday-crm:run-sequence analytics for <name>`.
- **From meeting-to-opportunity:** after logging a new lead, suggest enrolling them in an onboarding sequence.
- **To log-activity:** after enrolling a contact in a sequence whose first step is a manual call, suggest logging the call outcome.

---

## Step 0: Connector check

1. Try `mcp__monday__get_user_context`. On error → print install prompt, stop.
2. This skill does not pre-check sequence tools — if a sequence tool fails with a permission error in later steps, print: *"Sequences may not be enabled on your account. Check Tools → Sequences in monday CRM."*

---

## Step 1: Detect intent

Parse the argument/prompt to classify:

| Intent | Trigger signals |
|---|---|
| **list** | "what sequences", "show sequences", "list", no argument |
| **create** | "create", "set up", "build", "new sequence", "drip campaign" |
| **enroll** | "enroll", "add to sequence", "put in sequence", "start on sequence" |
| **activate** | "activate", "turn on", "enable sequence" |
| **deactivate** | "deactivate", "turn off", "disable sequence", "stop new enrollments" |
| **duplicate** | "duplicate", "copy sequence", "clone" |
| **analyze** | "analytics", "how is", "performance", "open rate", "funnel", "reply rate" |
| **contact-journey** | "what sequences is", "sequence history for", "enrolled in", "contact journey" |

If ambiguous, ask once:
> *"What would you like to do with sequences? (list / create / enroll / activate or deactivate / duplicate / analyze / check a contact's history)"*

---

## Step 2: Resolve board

**Required for:** list, enroll, contact-journey. Optional for create (let the gate handle it).

1. If user named a board → `mcp__monday__search` or `get_board_info` to resolve it. On ambiguity, present top results and ask.
2. If no board named:
   - For **list**: ask *"Which board's sequences do you want to see?"*
   - For **create**: proceed to Step 4 and let the tool's gate request it.
   - For **enroll**: ask *"Which board is this contact/lead on?"*
   - For **contact-journey**: ask *"Which board is this contact on?"*

---

## Step 3: Execute — List

`mcp__monday__get-board-sequences({ board_id })`.

Format as table:

```
Sequences on Leads board:

| # | Name | Status | Steps | Enrolled | Reply Rate |
|---|------|--------|-------|----------|------------|
| 1 | Cold outreach Q2 | ACTIVE | 5 | 120 | 12.4% |
| 2 | Welcome — new leads | INACTIVE | 3 | 0 | — |
```

If empty: *"No sequences on this board yet."*

---

## Step 4: Execute — Create

Call `mcp__monday__create-sequence` directly with whatever you have from the user's message. The tool's built-in gates handle missing fields:

- **`board_not_specified`** gate → follow the returned instructions verbatim: use `search` to list boards, present as-is, ask user to pick, retry.
- **`steps_not_specified`** gate → follow the returned instructions verbatim: ask user to build steps one at a time or create empty. Never invent steps.
- **`connections_not_specified`** gate (triggered when `automatic_email` steps need sender/emailColumnId) → resolve via `get-connected-email-accounts` for sender and `get_board_info` for the email column, then retry.

On success: *"Sequence '<name>' created (INACTIVE). Activate it? (yes / later)"*. If yes → `activate-sequence`.

> **Important:** Never pre-empt the gates by asking all questions upfront. Call the tool first.

---

## Step 5: Execute — Enroll

1. Resolve the sequence: `mcp__monday__get-board-sequences({ board_id })` → present list, ask which sequence if not named.
2. Resolve the items: extract from the argument (company/contact names) or ask *"Which contacts or leads do you want to enroll?"*. Use `search` or `get_board_items_page` to get `item_id`s.
3. Confirm sequence is ACTIVE. If INACTIVE: *"'<name>' is currently inactive — new enrollments are blocked. Activate it first? (yes / cancel)"*

> **HITL GATE:** *"Enroll <N> item(s) in '<sequence name>'?"* List the items by name. *(yes / cancel)*

4. `mcp__monday__enroll-item-in-sequence({ board_id, sequenceId, itemIds: ["<id>", ...] })`.
5. Report: *"Enrolled <N> items. Succeeded: <list>. Failed: <list if any>."*

---

## Step 6: Execute — Activate / Deactivate

1. Resolve the sequence (board → `get-board-sequences` → pick by name).
2. Check current state. Warn on no-ops:
   - Activating an ACTIVE sequence → *"'<name>' is already active."*
   - Deactivating an INACTIVE sequence → *"'<name>' is already inactive."*

> **HITL GATE:**
> - Activate: *"Activate '<name>'? This enables new enrollments. (yes / cancel)"*
> - Deactivate: *"Deactivate '<name>'? New enrollments will be blocked — contacts already enrolled will keep progressing. (yes / cancel)"*

3. `mcp__monday__activate-sequence({ sequenceId })` or `mcp__monday__deactivate-sequence({ sequenceId })`.
4. Report the new state.

---

## Step 7: Execute — Duplicate

1. Resolve the sequence (board → list → pick).

> **HITL GATE:** *"Duplicate '<name>'? The copy will start as INACTIVE. (yes / cancel)"*

2. `mcp__monday__duplicate-sequence({ sequenceId })`.
3. Report: *"Created '<new name>' (INACTIVE). Activate it? (yes / later)"*

---

## Step 8: Execute — Analyze

1. Resolve the sequence (board → list → pick).
2. `mcp__monday__get-sequence-analytics({ sequenceId })`.
3. Format:

```
Sequence: "Cold outreach Q2" (ACTIVE)

Level: 450 events · 69% open rate · 23% reply rate · 5.6% click-through

Per-step:
| Step | Sent | Open % | Reply % | CTR % |
|------|------|--------|---------|-------|
| 1 — Email | 450 | 69% | 10% | 2.7% |
| 2 — Email | 405 | 66% | 9.4% | 2.0% |
| 3 — Email | 360 | 55% | 6.1% | 1.4% |

Runs: 12 active · 380 completed · 58 terminated
```

4. Flag drop-offs: if open rate drops >15pp between consecutive email steps, surface it.
5. If analytics are empty: *"No analytics yet — this sequence hasn't sent any messages."*

---

## Step 9: Execute — Contact journey

1. Resolve the contact item (search by name → `item_id`; ask for board if unclear).
2. `mcp__monday__get-contact-journey({ board_id, item_id })`.
3. Format:

```
Sequence history for Acme Corp:

| Sequence | Status | Steps done | Enrolled | Termination |
|----------|--------|-----------|----------|-------------|
| Welcome Q2 | Completed | 5/5 | Jun 10 | Replied |
| Cold outreach | Active | 2/5 | Jun 20 | — |
```

4. If empty: *"<item name> isn't enrolled in any sequences."*

---

## Shared patterns

- **HITL gates on all writes** (create, enroll, activate, deactivate, duplicate).
- **No sequence editing via MCP.** If asked to add/edit/remove steps, say: *"Step editing isn't available through MCP yet — go to Tools → Sequences in the monday CRM UI."*
- **Board-first for list/enroll/journey.** Always resolve the board before calling tools that need `board_id`.
- **Follow create-sequence gates verbatim.** Call first, handle gates as they come.

---

## Error handling reference

| Failure | Behavior |
|---|---|
| Connector missing | Step 0 stops; print install link. |
| Permission error on sequence tools | Suggest checking CRM Sequences is enabled in account settings. |
| Board not found | Broaden search; ask user to confirm board name. |
| Sequence not found | List all on board; ask user to pick. |
| Enroll — sequence INACTIVE | Offer to activate first. |
| Enroll — partial failure | Report succeeded and failed item IDs. |
| Analytics empty | Inform no sends yet. |
| Tool unavailable on connector | *"Sequence tools aren't on the connector yet — check back or use the monday UI."* |
| Edit/add-step request | Redirect to UI; no MCP tool exists for this. |

---

## Completion criteria

- [ ] Step 0 connector check passed.
- [ ] Intent correctly classified and executed.
- [ ] Board resolved before any `board_id`-requiring tool call.
- [ ] All writes (create, enroll, activate, deactivate, duplicate) went through HITL confirmation.
- [ ] `create-sequence` gates followed verbatim; no pre-emption.
- [ ] No sequence editing attempted (hard rail — redirect to UI).
- [ ] Analytics formatted with level + per-step breakdown and drop-off flags.
- [ ] Errors surfaced with actionable guidance.