---
name: log-activity
description: Log one call, meeting or note that the user describes onto a single CRM item's timeline, read that item's activity history, or add a correction. Use when someone says "log my call with", "add a note to the deal", "record this meeting with", "log a meeting with", "track a call with", "I just spoke with", "I just had a call with", "note on the account", "what activities happened on this deal", "what's the activity history for", "correct the activity I logged", or "add to my note on". Not for turning recorded Notetaker meetings or pasted transcripts into deal recaps (use meeting-to-deal), and not for team or rep activity totals (use activity-insights).
argument-hint: "[activity description — 'call with Acme about renewal', 'note on Globex deal: demo next week', 'activities on TechCorp this week']"
user-invocable: true
allowed-tools: [Read, AskUserQuestion, mcp__monday__get_user_context, mcp__monday__search, mcp__monday__get_board_info, mcp__monday__get_board_items_page, mcp__monday__get-custom-activities, mcp__monday__get-timeline-items, mcp__monday__create-timeline-item, mcp__monday__create-timeline-note]
---

# Log Activity

Flow: **Trigger → Detect intent (log / read / correct) → Resolve CRM item → Gather activity details → Execute → Confirm**.

## Input
- Optional: activity description via argument (e.g., "call with Acme about renewal").
- Optional: CRM item name or identifier if mentioned.

## Output
- **Log (create):** structured activity record (call, meeting, note) on the target item's timeline, with confirmation.
- **Read:** formatted activity history for the specified item and time range.
- **Correct:** a correction note appended to the item's timeline that references the original entry by type and date. Existing entries are not edited.

## Knowledge
- Timeline = the activity feed on any CRM item (deal, contact, lead, account).
- Activity types: calls, meetings, notes, emails (read-only from timeline), custom types per account.
- For aggregated stats (team totals, rep comparisons), use the **activity-insights** skill — `get-activity-insights` is more efficient than counting raw timeline items.
- **Where this skill writes:** the item's timeline only. Meeting recaps built from Notetaker recordings or transcripts are meeting-to-deal's job and go to the deal's updates feed; daily-briefing and win-loss-review read both, so nothing logged here is lost to them.
- Timeline items are append-only through the connector: there is no tool to edit an existing entry. To change one, add a correction note; the user can edit the original in the monday CRM UI.

## Tools (MCP)
- `get-custom-activities` — list activity types configured on the account (call, meeting, note, custom).
- `get-timeline-items` — read an item's timeline (activities, emails, notes).
- `create-timeline-item` — log a structured activity (call, meeting) with type, date, attendees, notes.
- `create-timeline-note` — add a free-text note to an item's timeline.
- `get_user_context` — user identity for attribution.
- `search` / `get_board_info` / `get_board_items_page` — resolve CRM items by name or company.

## Cross-skill handoffs
- **From run-sequence:** when a sequence triggers a manual call step, suggest logging the call outcome.
- **From daily-briefing:** records in the brief's Going cold section → offer to log the latest touch.
- **To meeting-to-deal:** if the user pastes a full transcript or asks to sync recorded meetings, hand off to `/monday-crm:meeting-to-deal` instead of logging it here.
- **To activity-insights:** when the user asks about team totals or rep comparisons rather than a specific item's history.

---

## Step 0: Connector check + activity types

**Goal:** Confirm connector works and cache available activity types.

1. Try `mcp__monday__get_user_context`. On error → print install prompt, stop.
2. Try `mcp__monday__get-custom-activities`.
3. If successful → cache the list of activity types (id, name, icon) for use in Step 3. Set `activities_available: true`.
4. If permission error or tool unavailable → set `activities_available: false`. The skill can still operate with `create-timeline-note` (free-text notes don't require activity-type resolution), but structured activities (calls, meetings) will degrade to notes. Print: *"Activity types couldn't be loaded — I can still add notes to timelines. Structured call/meeting logging may be limited."*

---

## Step 1: Detect intent

Parse the user's argument to classify:

| Intent | Trigger signals |
|---|---|
| **log** | "log", "record", "add", "note on", "track", "I just spoke with", default |
| **read** | "what activities", "activity history", "what happened on", "show timeline" |
| **correct** | "update the note", "edit the activity", "change the meeting note", "correct" |

If ambiguous and no CRM item mentioned, ask:
> *"Would you like to (a) log a new activity, (b) view activity history, or (c) correct an existing entry?"*

---

## Step 2: Resolve CRM item

**Goal:** Find the specific deal, contact, lead, or account the activity relates to.

1. Extract item identifier from the argument:
   - Company name ("Acme", "Globex", "TechCorp")
   - Contact name ("Johnson", "Sarah at Acme")
   - Deal name ("Q2 renewal", "enterprise upgrade")
   - Item ID (if explicitly given)

2. If name extracted → `mcp__monday__search({ searchType: "ITEMS", searchTerm: "<name>", strategy: "SPEED" })` (retry with `strategy: "BALANCED"` if nothing comes back).
   - Single result → use it.
   - `search` returns `boardId` but no board name: resolve names from `get_user_context` relevant boards, or `get_board_info` for unknown ids. Drop results from activity-log boards (boards whose items are named like "<contact> - Email" or "<contact> - Meeting"); keep deals, contacts, accounts and leads.
   - Multiple results → present top 5 with board context: *"Found multiple matches: (1) Acme Corp [Deals board] (2) Acme Inc [Leads board] (3) Acme - renewal [Deals board]. Which one?"*
   - Zero results → broaden: try partial name, try `get_board_items_page` on likely boards (Deals, Contacts, Leads). Still zero → ask user.

3. If no name in argument → ask: *"Which CRM item should I log this activity on? (company name, deal name, or contact name)"*

4. Once resolved, note the item id and board id for subsequent calls (CRM timeline tools take `item_id`).

---

## Step 3: Execute — Log (Create)

### 3a: Determine activity type

If `activities_available: true`:
1. Parse the user's description for type signals:
   - "call", "spoke with", "phoned", "rang" → call
   - "meeting", "met with", "demo", "presentation" → meeting
   - "note", "add a note", "reminder", "FYI" → note (free-text)
2. Map the type to the closest entry returned by `get-custom-activities` by name (e.g. "Call", "Phone call", "Meeting"). If unclear, present the returned types: *"What type of activity? (<types from the account> / note)"*
3. If no returned type fits (many accounts have no "Call" type — e.g. only Email, Meeting, Task), log it as a note prefixed `Call:` or `Meeting:` and say so in the confirmation preview, before the write.

If `activities_available: false`:
- Default to free-text note via `create-timeline-note`.

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
> Title: Call with Acme — renewal
> Date: 2026-06-23 10:00 (Europe/London)
> Summary: They want to renew but need pricing by Friday
> Follow-up: Send pricing by Friday
> ```
> *(yes / edit / cancel)*

On "yes":
- For structured activities: `mcp__monday__create-timeline-item({ item_id, custom_activity_id, title, summary, content, timestamp })` — `item_id` is numeric; `custom_activity_id` is the `id` from `get-custom-activities` (not the name); `timestamp` is ISO 8601; put attendees and follow-up in `content` as text. For meetings with a duration, add `start_timestamp` + `end_timestamp`.
- For notes: `mcp__monday__create-timeline-note({ item_id, content: "<note text>" })`.

Report: *"Logged <type> on <item name>. Timeline updated."*

If the tool call fails, fall back to `create-timeline-note` with the same content formatted as text. Inform: *"Couldn't log as a structured <type> — added as a timeline note instead."*

---

## Step 4: Execute — Read

1. `mcp__monday__get-timeline-items({ item_id, limit: 25 })`; entries come newest first, so follow `cursor` only until entries predate the requested window.
2. Parse time filter from argument (this week / last 7 days / today / default last 10).
3. Format output as a table with Date, Type, Summary columns.
4. If zero activities: *"No activities on <item name> in <window>. Want to log one now?"*
5. For team-wide aggregated stats (totals by rep or type), use the **activity-insights** skill instead.

---

## Step 5: Execute — Correct

Editing an existing timeline entry is not available through the connector. Append a correction instead.

1. Retrieve timeline: `mcp__monday__get-timeline-items({ item_id, limit: 25 })`.
2. Present recent entries; resolve which one is being corrected from context or by asking.
3. Collect the correction.

> **HITL GATE:** *"Add this correction to <item name>'s timeline?"*
> ```
> Correcting: "Demo scheduled for next week" (<date>)
> Correction: "Decision moved to July."
> ```
> *(yes / edit / cancel)*

4. `mcp__monday__create-timeline-note({ item_id, content: "Correction to <type> from <date>: <correction>" })`.
5. Tell the user the original entry is unchanged and can be edited directly in monday CRM.

---

## Shared patterns

- **HITL gates on all writes and corrections.**
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
| Correction note fails | Surface error; suggest editing in monday CRM UI. |
| Timeline empty on read | Offer to log a new activity. |
| Tool unavailable (Gateway) | *"Activity logging tools aren't available on the connector yet — use the monday CRM UI for now."* |

---

## Completion criteria

- [ ] Step 0 connector check passed; activity types cached or degraded gracefully.
- [ ] Intent correctly classified (log / read / correct).
- [ ] CRM item resolved before any write.
- [ ] Every write and correction went through HITL confirmation.
- [ ] Structured activities used when available; notes as fallback.
- [ ] No timeline entries deleted (hard rail).
- [ ] Errors surfaced with actionable guidance.
