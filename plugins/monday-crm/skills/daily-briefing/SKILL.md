---
name: daily-briefing
description: "Prioritized CRM briefing for today — what needs attention now across deals, contacts, accounts or leads, with tasks due today, deals closing or slipping, contacts going cold, and a summary of recent meetings and activity. Works on any monday CRM setup, or with no board at all. Use when someone says 'morning briefing', 'daily brief', 'what's on my plate today', 'catch me up on my deals', 'what needs my attention', 'anything urgent in my deals', 'what should I focus on today', 'start my day', or 'daily standup prep'. Not for period forecasts or commit-vs-best-case views (use forecast)."
argument-hint: "[optional: board name or ID, e.g. 'Deals', 'Contacts', or '12345678']"
user-invocable: true
allowed-tools: [Read, AskUserQuestion, mcp__monday__get_user_context, mcp__monday__search, mcp__monday__get_board_info, mcp__monday__get_column_type_info, mcp__monday__get_board_items_page, mcp__monday__board_insights, mcp__monday__explore_meetings, mcp__monday__get_meetings_content, mcp__monday__get_board_activity, mcp__monday__get_updates, mcp__monday__get-timeline-items, mcp__monday__get-custom-activities, mcp__monday__create_update, mcp__monday__create_doc, mcp__monday__read_docs, mcp__monday__update_doc, mcp__monday__create_notification, mcp__monday__list_users_and_teams]
---

# Daily Briefing

Builds a prioritized brief over the user's monday CRM data. By default the brief is shown **in chat only**; it is posted to monday only when the user asks.

Board type drives the content: pipeline boards get deal buckets and totals, contacts/accounts boards get follow-up queues and relationship health, leads boards get inbound status. With no CRM board, the skill asks a couple of questions and builds a brief from the answers.

Reference files (read when the step says so):
- `references/output-config.md` — destination, verbosity, sections, style, saved preferences.
- `references/templates.md` — brief templates per board type.
- Worked runs: `examples/01-default-mode-admin.md`, `examples/02-non-admin-fallback.md`.

Flow: **Connector check → Mode + config → Boards → Board type → Schema → Pull → Synthesize → Render → Publish (opt-in) → Share (opt-in) → Proactive (opt-in) → Close**.

## Input
- Optional: board name or ID.
- Optional: mode (Default / Silent / Proactive) and output config in the prompt or saved preferences.

## Output
- **Chat brief (default):** rendered from `references/templates.md`.
- **monday artifact (opt-in):** an update on the user's "My Morning" item, or a private doc `Morning Briefing — <weekday>, <Mon DD>, <YYYY>`.
- **Share (opt-in):** notification to a teammate pointing at the posted brief.
- **Proactive (opt-in):** nudge updates on going-cold records and notifications for items due today.

## Where activity lives (what this skill reads)
- **Timeline** (`get-timeline-items`) — calls, meetings, emails and notes logged on the CRM item, including everything log-activity writes and synced emails.
- **Updates feed** (`get_updates`) — team comments and the meeting recaps meeting-to-deal posts.
- **Board activity** (`get_board_activity`) — column changes such as stage moves.
The brief reads all three; none of them alone gives the full picture.

## Cross-skill handoffs
- **To forecast:** for period views (this quarter, by close month, commit vs best case), suggest `/monday-crm:forecast`.
- **To data-cleanup:** if more than 30% of records are unowned or core fields are missing on most items, suggest `/monday-crm:data-cleanup`.
- **To log-activity:** for a record in Going cold, offer `/monday-crm:log-activity` to log the latest touch.
- **To meeting-to-deal:** if recent Notetaker meetings are not linked to any deal, suggest `/monday-crm:meeting-to-deal`.

---

## Step 0: Connector check

`get_user_context`. If the tool is missing, errors with an auth error, or the user has no workspace: print *"I don't see the monday connector active on this session. Install it from https://monday.com/mcp, then run this skill again."* and stop. Otherwise cache the user id and name.

No write happens before Step 8. With the default `chat` destination nothing is written to monday except Share (Step 9) or Proactive (Step 10) actions the user explicitly approved.

## Step 1: Mode and output config

**Output config:** read `references/output-config.md` and resolve destination (default `chat`), verbosity, sections and style.

**Write mode** (only matters when something will be written):
- **Default** — one confirmation before each publish, share or proactive batch.
- **Silent** — no confirmations; only the brief itself is posted (when the destination asks for it). No shares, no proactive writes.
- **Proactive** — ask once: *"Proactive mode will post a nudge update on going-cold records and notify owners about items due today. Approve all / review each / deny?"* Cache the answer. Triggers: "morning briefing proactive", "mode: proactive".

Hard rail in every mode: no deletes, no column-value edits of any kind (this skill only posts briefs, updates and notifications), no cross-workspace moves.

## Step 2: Resolve board(s)

1. Argument given: numeric → board id; text → `search({ searchType: "BOARD", searchTerm: <arg>, strategy: "SPEED" })`. One match → use it; several → `AskUserQuestion`.
2. No argument: scan `get_user_context` favorites and relevant boards for names matching
   - pipeline: `deal|opportunit|pipeline|sales`
   - contacts/accounts: `contact|account|client|customer`
   - leads: `lead|prospect|inbound`
   - relationships: `partner|renewal|relationship`
   - tasks (kept for Step 5f): `task|to-do|action|follow-up`
3. Nothing found → `search` for `"crm"`, then `"deals"`, then `"contacts"`.
4. Still nothing → **standalone** (Step 2c).
5. Several boards of the **same** type → `AskUserQuestion` with the board names plus "all of them". Remember the choice for the session.
6. Boards of **different** types (e.g. a pipeline and a contacts board) → brief both in one output, one section group per board.

## Step 2b: Classify board type

`get_board_info({ boardId, filters: { columns: { only: true } } })`, then:

| Type | Signals |
|---|---|
| `pipeline` | a `status` column with stage-like labels (an `is_done: true` or Won/Lost label) + a `numbers` column with a currency unit |
| `leads` | a `status` column without `is_done` and lead-like labels (New, Contacted, Qualified, Disqualified) |
| `contacts` | mostly `text` / `email` / `phone` columns, no Won/Lost pattern |
| `accounts` | company-named items with `numbers` (revenue/ARR) and `status` columns |
| `general` | anything else — treat as `accounts` |

## Step 2c: Standalone (no board)

Ask in one `AskUserQuestion` call: *"What meetings or calls do you have today?"* and *"Which deals, accounts or relationships need your attention this week?"*. Build the Standalone template from the answers (Step 6d), print it in chat, and skip Steps 3–10 except the Step 10 chat line.

## Step 3: Resolve columns by type

Columns are resolved by type, with titles only as hints (boards are often not in English). Use `get_column_type_info` when a column is ambiguous; a missing concept is skipped and noted under Data hygiene.

| Concept | Type | Title hints | Board types |
|---|---|---|---|
| Stage / status | `status` | stage, status | all |
| Owner | `people` | owner, rep, assigned | all |
| Value | `numbers` (currency) | value, amount, revenue | pipeline, accounts |
| Probability | `numbers` (%) | probability, % | pipeline |
| Close date | `date` | close, expected, target | pipeline |
| Last touch | `date` | touch, interaction, contacted | all |
| Next follow-up | `date` | follow-up, next step | contacts, accounts |
| Company | `text` | company, account, organization | contacts, leads |

## Step 4: Terminal labels (pipeline and leads)

From the stage column's labels: Won = `is_done: true`; Lost = text containing lost / perdido / verloren / perdu; for leads also Disqualified / Converted. No `is_done` label on a pipeline board → ask which label means Won. Cache the label `id`s. Status filters compare against each label's `id` from `get_board_info`, not its `index` (the `index` is display order; filtering on it silently returns the wrong items).

## Step 5: Pull data

Window for "recent" = the last 24h (72h on Mondays, so the weekend is covered).

### 5a — Items
- **Pipeline:** `get_board_items_page({ boardId, includeColumns: true, filters: [{ columnId: <stage>, operator: "not_any_of", compareValue: [<terminal label ids>] }], limit: 500 })`; follow `nextCursor` while `has_more`, up to 2,000 items (above that, add a sampling note). Use `board_insights` for totals when the board has more active items than you pulled.
- **Contacts / accounts:** same call without the stage filter.
- **Leads:** same as pipeline with the leads terminal labels; order by `__creation_log__` desc for recent additions.

### 5b — Board activity
`get_board_activity({ boardId, fromDate: <window start ISO>, toDate: <now ISO>, includeData: true })` — stage moves and other column changes. Without `includeData` the entries carry no item, column or value, so they can't be read; on busy boards pass `itemIds` for the active items to keep the payload small. **Yesterday's movements** = stage changes into a Won or Lost label inside the window (not "updated in the last 24h", which also catches edits to old deals). For leads boards use a 7-day `fromDate` instead, so Going stale (no status change in 7 days) can be computed; movements still use only the recent window.

### 5c — Updates feed
`get_updates({ objectType: "Board", objectIds: ["<boardId>"], includeItemUpdates: true, fromDate: <window start>, toDate: <now>, limit: 100 })` — team comments and meeting recaps (recognize meeting-to-deal recaps by their `ref meeting-to-deal/` line).

### 5d — Timeline for the items that matter
After a first synthesis pass (Step 6) has picked the items in **Needs you today**, call `get-timeline-items({ item_id: <id>, limit: 10 })` for up to 10 of them, Going cold, Follow-up and Slipping candidates first (those are the buckets a newer touch can change). Entries come newest first, so one page is enough. A deal's timeline also shows activity from its linked contact on other deals: count it as a relationship touch, and say "last contact touch" when the newest entry isn't about this deal. Emails, meetings and calls often come back with type `custom` and a `custom_activity_id`: call `get-custom-activities` once and map ids to names (Email, Meeting, Call, …) to classify them. Use the entries to:
- correct "last touch" when the timeline is newer than the date column (a call logged yesterday means the deal is not going cold), and
- count calls, emails, meetings and notes in the window for the activity line, labelled "among the <N> items checked".
A meeting-to-deal recap from 5c (an update with `ref meeting-to-deal/`) also counts as a touch on its deal, dated by the meeting date in its second line. Items not checked keep their date-column value and get `(timeline not checked)` when they land in Going cold.
Skip this step in `tldr` verbosity.

### 5e — Notetaker meetings
Only if `recent_meetings` or `activity_summary` is on: `explore_meetings({ start_time_from: <window start>, start_time_to: <now>, limit: 20 })`, then `get_meetings_content({ ids: [...], include_summary: true, include_action_items: true })`. Match each meeting first by an existing recap in 5c whose ref line carries the meeting id (reuse its first key point as the takeaway), then by attendee domain or item name; keep unmatched meetings for the "not linked to a deal" line. Any error → leave the section out.

### 5f — Tasks due today
If a tasks board was found in Step 2: its items whose due date is today (filter on its date column). Otherwise: pulled items with a `date` column other than the close date equal to today.

### Permissions and rate limits
- A 403 on 5b or 5c → add to Data hygiene: *"Activity log unavailable — your monday account can't read this board's activity. A board owner can check your access."* and continue.
- 429 → back off 3 times (1s, 2s, 4s); then *"monday is rate-limiting right now. Retry in a minute, or narrow to one board."* and stop.

## Step 6: Synthesize

Each bucket below maps to the section of the same name in `references/templates.md`. Apply verbosity and section filters first, then de-duplicate: a record shows in its highest-priority **printed** bucket only; other signals are added as text (`— also going cold (19 days)`). Header counts are the counts actually printed.

### 6a — Pipeline
Priority: **Tasks due today > Closing today > Slipping > Going cold > Follow-up > On track > New this week**.

| Section | Rule |
|---|---|
| Tasks due today | in the Step 5f list |
| Closing today | close date = today, not terminal |
| Slipping | close date in the past, not terminal |
| Going cold | last touch (after the 5d correction) more than 14 days ago |
| Follow-up | last touch more than 7 days ago and probability ≥ 50% |
| On track | probability ≥ 70%, last touch within 7 days, close date within 30 days |
| New this week | created in the last 7 days |
| Recent meetings | Step 5e meetings, matched first |
| Yesterday's movements | Step 5b stage changes into Won / Lost |

Totals: active pipeline Σ value; weighted Σ value × probability; closing this week count and Σ value. Activity line: counts from 5d (and 5c recaps) in the window.

### 6b — Contacts / accounts
Priority: **Tasks due today > Overdue follow-ups > Follow up today > Going cold > Recently active > New this week**. Overdue = next follow-up in the past; Follow up today = next follow-up today; Going cold = last touch more than 21 days ago and no follow-up date; Recently active = updated in the window. No money totals; show counts, unowned share and records without a follow-up date.

### 6c — Leads
**Unassigned** (owner empty), **Hot leads** (early or qualified status, created in the last 7 days), **Going stale** (created more than 14 days ago and no status change in 7 days), **Recent additions** (created in the window). Totals: open, unassigned, conversion rate if terminal labels exist.

### 6d — Standalone
1. Meetings today with something at stake. 2. Items the user called urgent. 3. Other deals or relationships the user mentioned.

## Step 7: Render

Apply verbosity, sections and style from Step 1, then fill the matching template in `references/templates.md`. Always print the brief in chat.

## Step 8: Publish (when the destination is `monday` or `doc`, or Step 9 needs a posted brief)

1. **Target:**
   - `monday` (or a Share request): `search({ searchType: "ITEMS", searchTerm: "My Morning", strategy: "SPEED" })`, keeping items whose board (`get_board_info`) lists the user as owner or subscriber. One → post there. None or several → fall back to a doc.
   - `doc`, or the fallback: a private doc in the CRM board's workspace.
2. **Idempotency (one brief per day per target):**
   - Item: `get_updates({ objectType: "Item", objectIds: ["<item id>"], limit: 25 })`; if an update contains `daily-briefing · <today YYYY-MM-DD>`, post the new brief as a reply (`create_update` with `parentId` of that update) instead of a new top-level update.
   - Doc: `read_docs({ type: "workspace_ids", ids: ["<workspace id>"], order_by: "created_at", limit: 5 })` and look for the exact title — results are newest first and carry each doc's full body, so keep the page small; DOCUMENTS search can miss a doc created minutes ago; if today's exact title exists, append with `update_doc` (`add_markdown_content`, starting with `## Refreshed at <HH:MM>`).
3. **Confirm (Default mode):** *"I'll post this brief as <an update on 'My Morning' | a private doc 'Morning Briefing — …'>. OK? (yes / no)"*. Silent and Proactive skip it.
4. **Write:**
   - Item: `create_update({ itemId, body: <brief as HTML> })`.
   - Doc: `create_doc({ location: "workspace", workspace_id: <board's workspace id>, doc_kind: "private", doc_name: "Morning Briefing — <weekday>, <Mon DD>, <YYYY>", markdown: <brief> })`.
5. Permission error → try the doc; if that fails too, say *"Couldn't post to monday (permission error). The brief above is complete."*

## Step 9: Share (opt-in)

Only when the user asked ("share with my manager", "post to the team") and a brief was posted in Step 8 (post it first if needed, with its confirmation).
1. Resolve the recipient: `list_users_and_teams({ name: "<name>" })`; if no name was given, ask.
2. Confirm in Default mode, then `create_notification({ user_id: "<recipient>", target_id: "<item id of the 'My Morning' item, or the update id>", target_type: <"Project" for the item | "Post" for the update>, text: "Morning briefing for <Mon DD>" })`. A doc has no notification target: share the doc link in chat instead.

## Step 10: Proactive (opt-in) and close

**Proactive** (approved in Step 1): first `get_updates({ objectType: "Item", objectIds: [<candidate ids, up to 25>], limit: 25 })` and skip any record that already has a `Claude nudge:` update from the last 7 days. Then, for **Going cold** records, `create_update({ itemId, body: "<b>Claude nudge:</b> No activity in <X> days. What's the next step?" })`; for **Closing today** and **Overdue follow-ups**, `create_notification({ user_id: "<owner>", target_id: "<item id>", target_type: "Project", text: "Action due today on <name>" })`.
- "Review each" → one line per action; yes / no / stop.
- More than 20 actions → list them in chat and ask once whether to run all.
- Only items the user owns, unless they are a board owner and approved Proactive this session.

**Close** — print one line that matches what happened:
- chat only: `Brief for <date>: <N> items scanned, <M> need attention.`
- posted: `Posted Morning Briefing — <date>: <url>. <K> proactive actions, <P> pending.`
If any write failed, list what was written. Never attempt compensating deletes.

---

## Error handling

| Failure | Behavior |
|---|---|
| Connector missing | Step 0 stops with the install message |
| No CRM board | Standalone brief (Step 2c) |
| Board over 2,000 active items | Cap, note the sampling, totals from `board_insights` |
| Activity / updates 403 | Note in Data hygiene; continue |
| Timeline call fails for an item | Use the date column for that item |
| Notetaker unavailable | Leave out Recent meetings |
| 429 | Back off 3 times, then stop with a retry message |
| Publish permission error | Doc, then chat only |
| Same-day brief already posted | Reply (item) or append (doc); never a second copy |

## Completion criteria

- [ ] Step 0 passed; board type detected (or standalone).
- [ ] Brief printed in chat; nothing written to monday unless the destination was `monday` / `doc` or the user asked.
- [ ] Every section in the output exists in the template, and every header count equals its line count.
- [ ] Up to 10 Needs-you-today items (Going cold / Follow-up / Slipping first) had their last touch checked against the timeline (except `tldr`); unchecked ones are marked.
- [ ] No record got a second Claude nudge within 7 days.
- [ ] At most one brief per target per day (reply or append on re-runs).
- [ ] Notifications used `user_id`, `target_id`, `target_type`; no column values were changed.
- [ ] Failed writes listed in the closing message.
