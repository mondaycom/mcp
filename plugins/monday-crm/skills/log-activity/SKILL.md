---
name: log-activity
description: Log calls, meetings, notes, and other activities to CRM item timelines — structured records with attendees, outcomes, and follow-ups. Use when someone says "log my call with", "add a note to the deal", "what activities happened on", "record this meeting", "update my note on", "track a call with", "log a meeting with", "what's the activity history for", "add meeting notes to", "I just spoke with", "note on the account", or "update the activity I logged".
argument-hint: "[activity description — 'call with Acme about renewal', 'note on Globex deal: demo next week', 'activities on TechCorp this week']"
user-invocable: true
allowed-tools: [Read, AskUserQuestion, mcp__monday__get_user_context, mcp__monday__list_workspaces, mcp__monday__search, mcp__monday__get_board_info, mcp__monday__get_board_items_page, mcp__monday__get-custom-activities, mcp__monday__get-timeline-items, mcp__monday__create-timeline-item, mcp__monday__update-timeline-item, mcp__monday__create-timeline-note, mcp__monday__all_monday_api]
---

# Log Activity

Flow: **Trigger → Detect intent (log / read / update) → Resolve CRM item → Gather activity details → Execute → Confirm**.

## Input
- Optional: activity description via argument (e.g., "call with Acme about renewal").
- Optional: CRM item name or identifier if mentioned.

## Output
- **Log (create):** structured activity record (call, meeting, note) on the target item's timeline, with confirmation.
- **Read:** formatted activity history for the specified item and time range.
- **Update:** edited timeline entry with confirmation of changes.

## Knowledge
- Timeline = the activity feed on any CRM item (deal, contact, lead, account).
- Activity types: calls, meetings, notes, emails (read-only from timeline), custom types per account.
- `get-activity-insights` is Sidekick-only — not available on the public connector. Skip it; surface raw timeline data instead.
- Timeline items are append-only in the UI; the API allows updates to existing entries.
- `update-timeline-item` visibility on external connector is unconfirmed — degrade gracefully if it fails.

## Tools (MCP)
- `get-custom-activities` — list activity types configured on the account (call, meeting, note, custom).
- `get-timeline-items` — read an item's timeline (activities, emails, notes).
- `create-timeline-item` — log a structured activity (call, meeting) with type, date, attendees, notes.
- `update-timeline-item` — edit an existing timeline activity's content.
- `create-timeline-note` — add a free-text note to an item's timeline.
- `get_user_context` — user identity for attribution.
- `search` / `get_board_info` / `get_board_items_page` — resolve CRM items by name or company.

## Cross-skill handoffs
- **From meeting-to-opportunity:** after a meeting recap, suggest logging the meeting as a structured activity on the deal.
- **From run-sequence:** when a sequence triggers a manual call step, suggest logging the call outcome.
- **To morning-briefing:** logged activities feed the daily brief's "recent activity" section.
- **From daily-briefing:** brief surfaces items with no activity in N days → suggest logging.

---

## Step 0: Connector check + activity types

**Goal:** Confirm connector works and cache available activity types.

1. Try `mcp__monday__get_user_context`. On error → print install prompt, stop.
2. Try `mcp__monday__get-custom-activities`.
3. If successful → cache the list of activity types (id, name, icon) for use in Step 3. Set `activities_available: true`.
4. If permission error or tool unavailable → set `activities_available: false`. The skill can still operate with `create_timeline_note` (free-text notes don't require activity-type resolution), but structured activities (calls, meetings) will degrade to notes. Print: *"Activity types couldn't be loaded — I can still add notes to timelines. Structured call/meeting logging may be limited."*

---

## Step 1: Detect intent

Parse the user's argument to classify:

| Intent | Trigger signals |
|---|---|
| **log** | "log", "record", "add", "note on", "track", "I just spoke with", default |
| **read** | "what activities", "activity history", "what happened on", "show timeline" |
| **update** | "update the note", "edit the activity", "change the meeting note", "correct" |

If ambiguous and no CRM item mentioned, ask:
> *"Would you like to (a) log a new activity, (b) view activity history, or (c) update an existing entry?"*

---

## Step 2: Resolve CRM item

**Goal:** Find the specific deal, contact, lead, or account the activity relates to.

1. Extract item identifier from the argument:
   - Company name ("Acme", "Globex", "TechCorp")
   - Contact name ("Johnson", "Sarah at Acme")
   - Deal name ("Q2 renewal", "enterprise upgrade")
   - Item ID (if explicitly given)

2. If name extracted → `mcp__monday__search({ query: "<name>", objectTypes: ["ITEM"] })`.
   - Single result → use it.
   - Multiple results → present top 5 with board context: *"Found multiple matches: (1) Acme Corp [Deals board] (2) Acme Inc [Leads board] (3) Acme - renewal [Deals board]. Which one?"*
   - Zero results → broaden: try partial name, try `get_board_items_page` on likely boards (Deals, Contacts, Leads). Still zero → ask user.

3. If no name in argument → ask: *"Which CRM item should I log this activity on? (company name, deal name, or contact name)"*

4. Once resolved, note the `itemId` and `boardId` for subsequent calls.

---

## Step 3: Execute — Log (Create)

### 3a: Determine activity type

If `activities_available: true`:
1. Parse the user's description for type signals:
   - "call", "spoke with", "phoned", "rang" → call
   - "meeting", "met with", "demo", "presentation" → meeting
   - "note", "add a note", "reminder", "FYI" → note (free-text)
2. If unclear, present available types: *"What type of activity? (call / meeting / note / <custom types from account>)"*

If `activities_available: false`:
- Default to free-text note via `create_timeline_note`.

### 3b: Gather details

Based on type, collect (ask only what's missing from the argument):

**Call:**
- Date/time (default: now)
- Duration (optional)
- Attendees/contacts (optional)
- Outcome/summary (required — at least one line)
- Follow-up action (optional)

**Meeting:**
- Date/time (default: now)
- Duration (optional)
- Attendees (optional)
- Summary/key points (required)
- Next steps (optional)

**Note:**
- Content (required)
- That's it — notes are lightweight.

Parsing heuristic: extract as much as possible from the original argument before asking.

### 3c: Confirm and write

> **HITL GATE:** Present the structured activity:
> *"Log this to <item name>?"*
> ```
> Type: Call
> Date: 2026-06-23 10:00
> Summary: They want to renew but need pricing by Friday
> Follow-up: Send pricing by Friday
> ```
> *(yes / edit / cancel)*

On "yes":
- For structured activities: `mcp__monday__create-timeline-item({ itemId, activityType, date, content: { summary, attendees, followUp } })`.
- For notes: `mcp__monday__create-timeline-note({ itemId, content: "<note text>" })`.

Report: *"Logged <type> on <item name>. Timeline updated."*

If the tool call fails, fall back to `create_timeline_note` with the same content formatted as text. Inform: *"Couldn't log as a structured <type> — added as a timeline note instead."*

---

## Step 4: Execute — Read

1. `mcp__monday__get-timeline-items({ itemId })`.
2. Parse time filter from argument (this week / last 7 days / today / default last 10).
3. Format output as a table with Date, Type, Summary columns.
4. If zero activities: *"No activities on <item name> in <window>. Want to log one now?"*
5. Do NOT call `get-activity-insights` — it's Sidekick-only.

---

## Step 5: Execute — Update

1. Retrieve timeline: `mcp__monday__get-timeline-items({ itemId })`.
2. Present recent entries; resolve which to update from context or by asking.
3. Collect the edit.

> **HITL GATE:** *"Update this entry on <item name>?"*
> ```
> Before: "Demo scheduled for next week"
> After: "Demo scheduled for next week. Decision moved to July."
> ```
> *(yes / edit / cancel)*

4. `mcp__monday__update-timeline-item({ timelineItemId, content: <updated content> })`.
5. If tool fails: surface error and suggest editing directly in monday CRM.

---

## Shared patterns

- **HITL gates on all writes and updates.**
- **Parse-first, ask-second.**
- **Graceful type degradation** — if structured activity creation fails, fall back to `create-timeline-note`.
- **No deletes** — timeline entries cannot be removed via MCP.
- **Attribution** — entries carry the user's identity from `get_user_context`.

---

## Error handling reference

| Failure | Behavior |
|---|---|
| Connector missing | Step 0 stops; print install link. |
| Activity types unavailable | Degrade to notes; inform user. |
| CRM item not found | Broaden search; ask user. |
| Create fails (invalid type) | Fall back to `create-timeline-note`; inform user. |
| Update fails | Surface error; suggest editing in monday CRM UI. |
| Timeline empty on read | Offer to log a new activity. |
| Tool unavailable (Gateway) | *"Activity logging tools aren't available on the connector yet — use the monday CRM UI for now."* |
| `get-activity-insights` called | Never call it — Sidekick-only boundary. |

---

## Completion criteria

- [ ] Step 0 connector check passed; activity types cached or degraded gracefully.
- [ ] Intent correctly classified (log / read / update).
- [ ] CRM item resolved before any write.
- [ ] Every write/update went through HITL confirmation.
- [ ] Structured activities used when available; notes as fallback.
- [ ] No timeline entries deleted (hard rail).
- [ ] Errors surfaced with actionable guidance.
- [ ] `get-activity-insights` never called.