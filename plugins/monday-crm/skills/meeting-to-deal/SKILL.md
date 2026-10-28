---
name: meeting-to-deal
description: Turn recorded monday Notetaker meetings (or a pasted transcript) into deal recaps — key points, commitments and next steps posted as updates on the matching CRM deals (confirmed per your mode), with optional stage edits and new contacts for unknown attendees. Use when someone says "log my recorded meetings to deals", "sync notetaker", "update CRM from my recorded calls", "add notes from my Notetaker meetings", "update my deals from this transcript", "what did I commit to in meetings", or "what did I promise in yesterday's calls". Not for dictating a single call or note onto one item (use log-activity).
argument-hint: "[optional: time window — 'today', 'yesterday', 'last 7 days', or 'since 2026-05-20']"
user-invocable: true
allowed-tools: [Read, AskUserQuestion, mcp__monday__get_user_context, mcp__monday__search, mcp__monday__get_board_info, mcp__monday__get_column_type_info, mcp__monday__get_board_items_page, mcp__monday__explore_meetings, mcp__monday__get_meetings_content, mcp__monday__get_updates, mcp__monday__create_update, mcp__monday__create_item, mcp__monday__change_item_column_values, mcp__monday__create_doc, mcp__monday__read_docs, mcp__monday__update_doc, mcp__monday__create_notification]
---

# Meeting to Deal

Flow: **Connector check → Mode → Window → Pull meetings → Resolve boards → Match → Synthesize → Confirm → Write recaps → Column edits → Contacts (opt-in) → Nudges (opt-in) → Sync doc**.

Recap and sync-doc templates live in `references/templates.md`. Worked runs: `examples/01-daily-meeting-sync.md`, `examples/02-notetaker-missing.md`, `examples/03-ambiguous-match.md`, `examples/04-proactive-with-contacts.md`.

## Input
- Optional: time window via argument (default = last 24h).
- Optional: mode (Default / Silent / Proactive) in the prompt.
- Optional: a pasted transcript or notes for one meeting (goes straight to Step 3b).

## Output
- **Recaps:** one `Meeting recap` update per matched deal (key points, commitments, open questions, stage signal), each carrying a `ref meeting-to-deal/<meeting-ref>` line for idempotency.
- **Column edits (Default and Proactive only):** high-confidence stage changes and last-touch dates, applied only after the batched confirmation.
- **Contacts (opt-in):** new Contacts items for unknown external attendees, linked to the deal.
- **Nudges (Proactive only):** notifications to deal owners for commitments due within 7 days.
- **Sync doc:** a private `Meeting sync — <date>` doc listing matched, ambiguous, unmatched and skipped meetings.
- **Read-only branch:** questions like "what did I commit to" get a chat answer and no writes.

## Where this skill writes (activity data model)
- Meeting recaps go to the deal's **updates feed** (`create_update`), where the team discusses the deal and where nudges can point to them.
- Single dictated calls, meetings and notes go to the item **timeline** — that is log-activity's job, not this skill's. Do not also write a timeline entry for a recap.
- daily-briefing reads both stores, so recaps written here appear in the next brief.

## Cross-skill handoffs
- **To log-activity:** if the user asks to log a call, meeting or note on an item ("log my call with Acme") rather than to sync or recap meetings, hand off to `/monday-crm:log-activity`. Free-text descriptions in Step 3b are accepted only when this skill was invoked to sync meetings and Notetaker had none.
- **To data-cleanup:** if more than 30% of external attendees match no deal or contact, suggest `/monday-crm:data-cleanup`.
- **To workspace-builder:** if there is no Deals board, suggest `/monday-crm:workspace-builder`.

---

## Step 0: Connector check, Notetaker, internal domain

1. `get_user_context`. On error print *"I don't see the monday connector active on this session. Install it from https://monday.com/mcp, then run this skill again."* and stop.
2. **Internal domain:** take the domain of the user's email. If the email is missing, or the domain is a public mail provider (gmail.com, googlemail.com, outlook.com, hotmail.com, live.com, yahoo.com, icloud.com, me.com, aol.com, proton.me, protonmail.com, gmx.com and similar), set `internal_domain = none`. Never fall back to a vendor domain. With `internal_domain = none`, only the user's own address counts as internal.
3. `explore_meetings({ limit: 1 })`. Results → `notetaker_available: true`. Auth, permission or not-enabled error → `notetaker_available: false` and continue (Step 3b collects notes from the user). Do not stop.

No write happens before Step 7.

## Step 1: Detect intent and mode

**Read-only questions** ("what did I commit to", "what did I promise"): run Steps 2–3, extract commitments from every pulled meeting (no matching needed), print them grouped by meeting, then offer *"Want me to log these recaps to the matching deals?"*. No writes unless the user says yes; on yes continue from Step 4 in Default mode.

**Modes for logging:**

| Mode | Writes | Confirmation |
|---|---|---|
| **Default** (if undeclared) | recaps, sync doc, plus confirmed stage edits, last-touch dates and opt-in contacts | one batched confirmation (Step 7) |
| **Silent** | recaps and sync doc only. Stage edits, last-touch, contacts and nudges are never written; they are listed under "Pending your review" in the sync doc | none |
| **Proactive** | everything in Default plus nudges | asked once up front (below), then no confirmation prompts (questions about boards, windows or ambiguous matches still apply) |

Proactive prompt, asked once with `AskUserQuestion`: *"Proactive mode will (a) write recaps to matched deals, (b) create missing contacts, (c) apply high-confidence stage and last-touch edits, (d) notify deal owners about commitments due this week. Amount columns stay untouched. Approve all / approve all except stage edits (last-touch dates still apply) / switch to Default?"*

Hard rail in every mode: no deletes, no amount-column writes, no cross-workspace moves, never create a status label. Ambiguous matches are never written without the user's pick.

## Step 2: Resolve time window

1. Parse the argument: "today", "yesterday", "last N days", "since YYYY-MM-DD". Default: last 24h.
2. If no window was given, say once: *"Using last 24h. Add 'yesterday', 'last 7 days' or 'since YYYY-MM-DD' to change the range."*
3. Window over 14 days → confirm with `AskUserQuestion` and state the cost: it may pull up to 200 meetings and take several minutes.

## Step 3: Pull meetings

### 3a — Notetaker (`notetaker_available: true`)

1. `explore_meetings({ start_time_from: <ISO>, start_time_to: <ISO>, limit: 20 })` — newest first. If exactly 20 come back, split the window into smaller ranges and repeat, up to 200 meetings; above that, cap and add a sampling note to the sync doc.
2. `get_meetings_content({ ids: [...], include_summary: true, include_action_items: true })`. Do **not** request transcripts here. Ids reported as not returned are logged as "not accessible". Content dropped for size → request that meeting alone.
3. Transcripts are fetched only in Step 6, one meeting at a time.

0 meetings in the window → print *"No Notetaker meetings found in <window>. You can paste meeting notes or describe what happened instead."* and go to 3b. 429 → back off 3 times, then go to 3b.

### 3b — Manual input (Notetaker unavailable, empty, or the user pasted notes)

If the user already pasted a transcript or notes, use them. Otherwise ask once with `AskUserQuestion`: *"No Notetaker recordings available. How do you want to provide the meeting?"* — (a) paste notes here, (b) give a file path (read with `Read`), (c) describe it in free text, (d) skip. (d) → stop with *"No meetings logged."*

Build one meeting entry: `title` (first line, or ask), `date` (today unless stated), `attendees` (from the notes, or ask once for emails), `content` (the full text), `source: manual`, `meeting-ref: manual-<YYYYMMDD>-<title slug>`.

## Step 4: Resolve boards and active deals

1. **Deals board:** scan `get_user_context` favorites and relevant boards for `deal|deals|opportunit|pipeline|sales`. One → use it; several → `AskUserQuestion`; none → `search({ searchType: "BOARD", searchTerm: "deals", strategy: "SPEED" })`, then `"pipeline"`. Still none → skip recaps, write only the sync doc with a "no Deals board found" header, and hand off to workspace-builder.
2. **Contacts board** (only if contacts may be created): same scan for `contact|contacts|people`. Missing while contacts were approved → tell the user in chat *"Contacts were approved but I couldn't find a Contacts board, so none were created."* and continue.
3. `get_board_info({ boardId, filters: { columns: { only: true } } })` on each. Resolve columns by type, not title:
   - Deals: keep the board's workspace id (for the Step 10 doc), `email` (optional), company — a `text` column, or a `mirror` column showing the linked account or company (use its displayed text); many boards have neither, so the deal name is also used for company matching — owner `people`, stage `status`, last-touch `date` (title hint touch / contact / interaction; skip if none), value `numbers` (read only), and any `board_relation` column pointing at Contacts.
   - Contacts: `email`, company `text`, `phone`, owner `people`, a `board_relation` column pointing at the Deals board (optional), a source `status` column (optional).
4. **Stage labels:** from the stage column's labels, Won = labels with `is_done: true`; Lost = label text containing lost / perdido / verloren / perdu. No `is_done` label → ask which label means Won. Keep every label's `index` and text — Step 6 may only propose, and Step 7c only write, labels from this list.
5. **Active deals:** `get_board_items_page({ boardId, includeColumns: true, filters: [{ columnId: <stage>, operator: "not_any_of", compareValue: [<won idx>, <lost idx>] }], limit: 500 })`; follow `nextCursor` while `has_more`, up to 2,000 deals (above that, add a sampling note). Check the filter shape with `get_column_type_info({ columnType: "status", fetchMode: "guidelines" })` if the call is rejected.

## Step 5: Match meetings to deals

For each meeting:

1. **External attendees** = attendees whose domain is not `internal_domain` and who are not the user. No external attendees → **skipped: internal-only**. Classify by attendees only: a 1:1 with one external person is a normal sales call and is in scope.
   - **Manual meetings** (Step 3b): if the user named a deal, or there are no attendee emails, find candidate deals by name and confirm the deal with `AskUserQuestion` ("Log this to <deal>? / pick another / skip"); a confirmed deal counts as matched.
2. **Score every active deal:**
   - +5 per external attendee email equal (case-insensitive) to the deal's email column, or to the email of a contact linked to the deal (when the Deals board links to Contacts, read those contacts' email column once for all active deals).
   - +5 once if an external attendee's domain matches the deal's company (company column, mirrored account name, or — if neither exists — the deal name). Normalize both sides first: lowercase, drop `www.` and the public suffix (`.com`, `.io`, `.co.uk`, `.com.au`…), remove spaces and punctuation (`helixbio.com` → `helixbio`, "Helix Bio" → `helixbio`). Match when they are equal (`helixbio` = `helixbio`), when the domain equals the company's first word and that word has 4+ characters (`spindrift` ↔ "Spindrift Labs"), when the domain has 6+ characters and the company (or deal name) starts with it (`vertexcap` ↔ "Vertex Capital", `helixbio` ↔ "Helix Bio — renewal"), or when the domain is the company plus a trailing `corp`, `inc`, `hq`, `group`, `labs`, `app` or `team` (`acmecorp` ↔ "Acme"). Anything looser does not count (`applebees` is not "Apple"). Public mail domains never score.
   - +2 if the normalized meeting title contains the normalized deal name (or its company part), 4+ characters.
   - Expect misses on small-business accounts: contacts often use free-mail addresses that differ from the address stored in CRM, and public mail domains never score. Do not loosen the rules to force a match; unmatched meetings are listed in the sync doc so the user can link them.
3. **Decide:**
   - Best score < 5 → **unmatched**.
   - Best ≥ 5 and at least 3 ahead of the runner-up → **matched**.
   - Two or more deals ≥ 5 within 2 points → **ambiguous**. In Default and Proactive ask with `AskUserQuestion` (candidates with owner and stage, plus "skip this meeting"); batch all ambiguous meetings into one question. In Silent, do not write; list under "Ambiguous, not logged".
4. **Multi-deal meeting:** when the summary or title names another active deal that also scores ≥ 5 for this meeting, write the recap to each such deal with an "also discussed" line. A deal named but scoring below 5 is not written; mention it in the recap text only. A score tie alone is not a multi-deal meeting.
5. **Same deal, several meetings in one run:** write one recap per meeting, but merge the column edits per deal — latest meeting date for last touch; if stage signals disagree, treat both as `low`.

## Step 6: Synthesize

For each matched meeting, work from the summary and action items. If the summary suggests a stage change but gives no verbatim phrase, fetch that one meeting's transcript: `get_meetings_content({ ids: [<id>], include_transcript: true })`.

- **Key points** — 3 to 5 factual bullets.
- **Commitments** — who → what → by when ("I'll send…", "we'll follow up by…").
- **Open questions** — open items, "TBD", "we need to figure out".
- **Stage signal** — map to an existing stage label only. `high` = an explicit, unambiguous phrase that names the outcome ("they signed today", "we agreed to open the redline") and maps to exactly one label; anything inferred is `low`. Moving to procurement or legal review is not a win. Only `high` signals enter the plan; `low` ones appear in the recap as "Suggested (not applied)".
- **Last touch** — the meeting date, proposed only if later than the deal's current last-touch value.

## Step 7: Confirm, then write recaps

### 7a — Idempotency scan (before the confirmation)

`get_updates({ objectType: "Item", objectIds: [<matched deal ids, up to 25 per call>], limit: 100 })` (the limit applies per item; if a deal returns 100 updates, call again for that deal with `page: 2` until updates predate the earliest meeting in the run). An existing recap is a hit when its text contains `ref meeting-to-deal/<meeting-ref>` followed by a non-alphanumeric character or the end of the line, or — for recaps posted by older versions, whose markers were HTML comments — its text starts with `Meeting recap — <same meeting title>` and it was created on or after the meeting date. Hits are not rewritten (the connector cannot edit an update); they go under "Already logged" and their stage and last-touch edits are dropped.

**Contacts lookup** (only if contacts may be created and a Contacts board exists): for each external attendee email of a matched meeting, `get_board_items_page({ boardId: <contacts>, searchTerm: <email> })`. Emails with no hit are the missing contacts `<C>`; Step 8 creates them.

### 7b — Batched confirmation (Default mode)

One message, then one answer:

*"I'll write <N> recaps · <S> stage edits (high confidence) · <L> last-touch dates. <K> suggested stage changes stay as text. <U> unmatched, <D> already logged. Proceed? (yes / show details / skip column edits / no)"*

- If `<C>` > 0, ask the contact opt-in as a **separate** question in the same `AskUserQuestion` call: *"Also create <C> missing contacts on <Contacts board>?"* Above 25, say: *"<C> new contacts found; I'll create 25 and list the rest in the sync doc."*
- "show details" → list every stage edit as `<deal> · <old> → <new> ("<evidence phrase>")` and one sample recap, then ask again.

Proactive skips this prompt (approval came in Step 1). Silent skips it and writes recaps only.

### 7c — Write

For each matched meeting–deal pair that is not a hit:

1. **Column edits first** (only if approved — not in Silent, not after "skip column edits"): one `change_item_column_values` call per deal carrying both edits:
   `{ boardId, itemId, columnValues: "{\"<stage col>\": {\"label\": \"<existing label>\"}, \"<last-touch col>\": {\"date\": \"YYYY-MM-DD\"}}" }`. Never pass `createLabelsIfMissing`. Never write the value column. If the call fails, list the edit under "Pending your review".
2. **Then the recap:** `create_update({ itemId: <deal id>, body: <recap HTML from references/templates.md, one line, no newlines between tags> })`. The Stage signal line says "Applied" only for an edit that succeeded in step 1; every other proposed edit is written as "Suggested (not applied)". Updates cannot be edited afterwards, so never write the recap before its edit has settled. Keep the returned update id for Step 9.

## Step 8: Create missing contacts (opt-in)

Runs only when contacts were approved (Step 1 Proactive or the 7b opt-in). For each missing contact found in 7a, up to 25 (name from the Notetaker participant name; if only an email is known, use the part before `@`, capitalized):

`create_item({ boardId: <contacts>, name: "<First Last>", columnValues: "{\"<email col>\": {\"email\": \"<email>\", \"text\": \"<email>\"}, \"<company col>\": \"<company>\", \"<relation col>\": {\"item_ids\": [<deal id>]}, \"<source col>\": {\"label\": \"Claude\"}}" })`

- Leave `groupId` out — the board's default group is used.
- Include the relation key only if a `board_relation` column to the Deals board exists, and the source key only if a source status column already has a `Claude` label. If a source column is missing, create the contact without it and note "source not tracked" in the sync doc; do not create columns.
- If the call fails because of the relation value, retry once without it and list the contact under "Contacts pending manual link".

## Step 9: Commitment nudges (Proactive only)

For commitments due within 7 days on deals that got a recap in this run:

`create_notification({ user_id: "<deal owner id>", target_id: "<recap update id from 7c>", target_type: "Post", text: "Commitment due <date> on <deal>: <commitment>" })`

More than 20 nudges → send none; list them under "Commitments due this week" in the sync doc and tell the user in chat.

## Step 10: Sync doc and chat summary

1. `read_docs({ type: "workspace_ids", ids: ["<workspace id>"], order_by: "created_at", limit: 25 })` and look for the exact title (DOCUMENTS search can miss a doc created minutes ago). If a doc titled exactly `Meeting sync — <Mon DD, YYYY>` exists, append to it with `update_doc` (see `references/templates.md`).
2. Otherwise `create_doc({ location: "workspace", workspace_id: <workspace id from the Deals board's get_board_info>, doc_kind: "private", doc_name: "Meeting sync — <Mon DD, YYYY>", markdown: <sync doc> })`.
3. No Deals board (Step 4), or both calls fail → print the sync doc in chat instead.
4. Last line: the chat summary from `references/templates.md`. If more than 30% of external attendees matched no deal and no contact, add the data-cleanup suggestion.

---

## Error handling

The failure → behavior table is in `references/templates.md` (Error handling). Rule of thumb: skip the one meeting, deal or contact that failed, keep going, and list it in the sync doc; stop only when the connector is missing or monday keeps rate-limiting.

## Completion criteria

- [ ] Step 0 passed; `internal_domain` set from the user's email, or `none` for public mail providers — never a guessed vendor domain.
- [ ] No write before the Step 7b confirmation (Default) or the Step 1 approval (Proactive); Silent wrote recaps and the sync doc only.
- [ ] Every recap is HTML and carries `ref meeting-to-deal/<meeting-ref>`; no meeting got a second recap on the same deal.
- [ ] Ambiguous meetings were asked about or left unwritten — never written to two deals on a tie.
- [ ] Stage edits used existing labels only and were high confidence; no amount column was written.
- [ ] Contacts (if any) capped at 25; failed links listed in the sync doc.
- [ ] Nudges (if any) pinned to the recap update with `target_type: "Post"`.
- [ ] Sync doc created or appended once, or printed in chat on failure.
