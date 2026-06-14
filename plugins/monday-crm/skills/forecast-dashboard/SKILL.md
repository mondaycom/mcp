---
name: forecast-dashboard
description: Build a forecast dashboard in monday — committed, best-case, and pipeline views by close month, rendered as real dashboard widgets. Use when someone says "build me a forecast", "show me Q2 pipeline", "Salesforce-style forecast", "forecast dashboard", "commit vs best-case", "what's our number this quarter", "how are we tracking to quota", "weighted pipeline", "deal rollup", "Clari-style", "pipeline by month", or "what's in commit".
argument-hint: "[optional: board name or ID, e.g. 'Deals' or '12345678'; optionally add period, e.g. 'Q2 2026' or 'next 90 days']"
user-invocable: true
allowed-tools: [Read, AskUserQuestion, mcp__monday__get_user_context, mcp__monday__list_workspaces, mcp__monday__search, mcp__monday__get_board_info, mcp__monday__get_column_type_info, mcp__monday__get_board_items_page, mcp__monday__board_insights, mcp__monday__create_dashboard, mcp__monday__create_widget, mcp__monday__create_doc, mcp__monday__create_notification, mcp__monday__create_column, mcp__monday__change_item_column_values, mcp__monday__list_users_and_teams, mcp__monday__all_monday_api]
---

# Forecast Dashboard

Builds a native monday dashboard that renders the pipeline as a forecast — committed / best-case / pipeline / closed-won, grouped by stage × close month. Replaces the "export to CSV and pivot it" pattern that sales ops leaders do manually every Monday.

Flow: **Trigger → Gather → Synthesize → Publish (α, default) → Share (β, opt-in) → Proactive extension (opt-in, hygiene fix)**.

## Input
- Optional: board name / ID + forecast period (e.g., "Q2 2026", "next 90 days").
- Optional: pre-declared mode (Default / Silent / Proactive).

## Output
- **α (default):** A native monday `create_dashboard` with widgets per bucket + URL.
- **β (Share):** Viewer-permission grant to sales leader via `all_monday_api` + `create_notification`.
- **Proactive extension:** Hygiene fix — if a non-closed deal is missing close date, `change_item_column_values` (with batched user confirm) to set a placeholder OR post a prompt update asking the owner to fill it. Missing-amount items are flagged in the dashboard description and a hygiene update is posted on the item, but the amount column itself is never written (forecast integrity rail).

## Knowledge
- Bucket definitions: closed-won / committed / best-case / pipeline (§ Step 5).
- Shared artifact conventions (see Shared patterns section below).

## Tools (MCP)
- `get_user_context`, `list_workspaces`, `search` — board resolution.
- `get_board_info`, `get_column_type_info` — schema + column types (stage/amount/close-date/forecast-category).
- `get_board_items_page` — paginated pull.
- `board_insights` — aggregate fallback.
- `create_dashboard`, `create_widget` — α publish.
- `create_doc` — fallback for non-admins (see Error handling).
- `create_notification`, `list_users_and_teams` — β share.
- `create_column` — add a forecast-category column only if required to render the dashboard.
- `change_item_column_values` — proactive hygiene fix.
- `all_monday_api` — escape hatch for dashboard permissions, idempotency GraphQL query, and doc updates.

## Cross-skill handoffs
- **From morning-briefing:** If the briefing surfaces forecast-hygiene issues (missing close date or amount on >10% of deals), the user may jump here to build the structured view.
- **To board-diagnosis:** If >25% of deals are missing core forecast fields, suggest `/monday-crm:board-diagnosis` before publishing.

---

## Step 0: Connector check

**Goal:** Fail fast if the user has no monday MCP connection.

1. Try `mcp__monday__get_user_context`.
2. If the tool is missing, returns auth-style error, or the user has no accessible workspace:
   - Print exactly: *"I don't see the monday connector active on this session. Install it from https://monday.com/mcp, then run this skill again."*
   - Stop. Do not proceed.
3. If connector works, cache `user.id` and `user.name` for artifact metadata.

**PAUSE**: Do not call `create_dashboard`, `create_widget`, `create_column`, or `change_item_column_values` before Step 0 passes and the user has confirmed the publish step in Step 6.

---

## Step 1: Detect mode + confirm forecast period

**Goal:** Know write-confirmation policy AND lock the forecast window.

1. Detect Default / Silent / Proactive per shared pattern.
2. If no period declared, `AskUserQuestion`: "Which period? (a) this quarter, (b) next 90 days, (c) custom." Store `period_start`, `period_end`.

---

## Step 2: Resolve the deals board (Gather)

**Goal:** Land on one (or user-confirmed multi) board. Same resolution path as morning-briefing Step 2. Use `mcp__monday__get_user_context` → `list_workspaces` → `search("deal")`.

---

## Step 3: Read board schema (Gather)

**Goal:** Resolve columns by type — stage (`status`), amount (`numbers` with `$`), close date (`date` with "close"/"expected"), forecast category (`status` with commit/best-case/pipeline labels, if present).

1. `get_board_info(boardId)`.
2. `get_column_type_info` for any ambiguous column.
3. If no forecast-category column exists AND the user wants commit vs best-case split: prompt the user — "I can add a `Forecast Category` column (Commit / Best-case / Pipeline / Omit). OK?" Only create via `create_column` in Proactive mode or after explicit user approval.

---

## Step 4: Pull deal data (Gather)

**Goal:** Paginated pull over the forecast window.

`get_board_items_page` with `filters` = close_date in `[period_start, period_end]`. Paginate via `cursor` up to 2K items (same cap as morning-briefing). Same 429 / rate-limit handling.

---

## Step 5: Synthesize (Synthesize)

**Goal:** Group deals into forecast buckets × close month.

Buckets:
- **Closed-won** — stage `is_done: true` (won label).
- **Committed** — forecast category = Commit OR (probability ≥ 80% AND stage in late-funnel).
- **Best-case** — forecast category = Best-case OR (probability in 50-79% AND stage in mid-funnel).
- **Pipeline** — everything else active.

**Empty-category guard:** If a forecast-category column exists but fewer than 20% of active deals have a non-empty value, surface this warning before synthesizing:

> The Forecast Category column exists but 80%+ of deals haven't been categorized. I'll derive all buckets from probability + stage for now. Want to: (a) continue anyway, (b) run hygiene to prompt owners to fill it, or (c) remove the column from the forecast logic?

Wait for user choice before proceeding.

Group by close month within the period. Compute Σ amount per (bucket × month).

---

## Step 6: Publish α — build the dashboard (Publish)

**Goal:** Produce a native monday dashboard with widgets per bucket, not a markdown brief.

Core call pattern:
1. **Idempotency:** Before creating, query for an existing `Forecast — <period>` dashboard using `all_monday_api` with a GraphQL `dashboards` query (filtered by name where the API supports it), then check each result's `description` client-side for the `<!-- claude-skill-id: forecast-dashboard -->` comment. Note: `mcp__monday__search` does not cover dashboard descriptions and must not be used for this check. If a matching dashboard is found, update widgets via that dashboard ID instead of duplicating.
2. `create_dashboard(workspaceId, name: "Forecast — <period>", description: "Generated by Claude · <ISO timestamp> · <!-- claude-skill-id: forecast-dashboard -->")`.
3. For each bucket × month: `create_widget(dashboardId, ...)` — see Widget call shapes below.
4. Return dashboard URL. Print it as the last line in chat.

### Widget call shapes

Required fields for each widget type:

**Number widget** (per-bucket total):
```json
{
  "type": "numbers",
  "board_ids": ["<boardId>"],
  "column_ids": ["<amountColumnId>"],
  "filter": { "rules": [{ "column_id": "<bucketFilterColumnId>", "compare_value": ["<label>"] }] }
}
```

**Chart widget** (buckets × close month stacked bar):
```json
{
  "type": "chart",
  "board_ids": ["<boardId>"],
  "column_ids": ["<amountColumnId>"],
  "grouping_column_id": "<closeDateColumnId>"
}
```

**Table widget** (deal detail for committed + best-case):
```json
{
  "type": "table",
  "board_ids": ["<boardId>"],
  "column_ids": ["<nameCol>", "<amountColumnId>", "<stageColuumnId>", "<closeDateColumnId>"],
  "filter": { "rules": [{ "column_id": "<bucketFilterColumnId>", "compare_value": ["Commit", "Best-case"] }] }
}
```

### Non-admin fallback (§7 spec)
Non-admin users can't call `create_dashboard`. On permission error, ask:
> I can't create dashboards on this workspace (your account lacks admin rights). Want me to: (a) publish a doc-version with the same forecast (summary tables), (b) stop so you can ask your admin to install the dashboard, or (c) try a different board?

Route to `create_doc` on option (a).

---

## Step 7: Share β — viewer access for sales leader (opt-in)

**Goal:** Grant dashboard viewer permission + notify.

1. `list_users_and_teams` → resolve sales leader.
2. Before granting access, ask: "Share this dashboard with [name]? They'll get a notification and viewer access. (yes / no)"
3. On confirmation: `all_monday_api` GraphQL mutation to grant viewer permission on the dashboard.
4. `create_notification({ userId, itemId: <dashboard ref>, text: "Forecast dashboard for <period>" })`.

---

## Step 8: Proactive extension — forecast hygiene fix (opt-in)

**Goal:** Fix hygiene gaps on deals blocking forecast accuracy — WITHOUT editing stage or amount.

Hygiene gap = deal in a non-closed stage that's missing **either** close date **or** amount.

Core pattern:
- For each gap deal with missing close-date: `change_item_column_values` — set a placeholder (e.g., end-of-current-quarter) OR post a prompt update asking the owner to fill it. **Stage edits are only permitted if the user typed an explicit instruction to move deals to a specific stage in this session. Do not infer stage-edit intent from context or from the hygiene gap summary.** All writes happen inside the batched-confirm plan.
- For each gap deal with missing amount: post a prompt update only — **never write to the amount column** (forecast integrity rail).
- If >20 gap deals: batch into one `Forecast hygiene — <period>` review doc (with `<!-- claude-skill-id: forecast-dashboard -->` in body) rather than 20 individual writes.

---

## Step 9: Close the loop

**Goal:** Summary line with dashboard URL + counts.

Print: `Published Forecast — <period>. <N> deals, <N> widgets, <N> hygiene gaps flagged.`

---

## Shared patterns
- **No title prefix.** Artifact discoverability is via the `Generated by Claude · <ISO timestamp>` footer and the embedded `<!-- claude-skill-id: forecast-dashboard -->` HTML comment in dashboard descriptions and doc bodies.
- **Idempotency before create.** Always query existing dashboards via `all_monday_api` GraphQL and check description client-side for the skill-id comment. Update widgets, don't duplicate the dashboard.
- **Safety rail.** No deletes, no amount-column writes, no cross-workspace moves. Close-date placeholder writes OK in a batched-confirm plan. Stage edits only on explicit user instruction.
- **Ask once per session**, not per deal, when entering Proactive mode.
- **Type-based column resolution**, not name-based — global teams have non-English columns.

## Error handling

| Error | Behaviour |
|---|---|
| Connector missing / auth error | Print install URL, stop immediately. |
| No board found matching query | Ask user to specify board name or ID directly. |
| No admin perms (`create_dashboard` fails) | Ask: (a) doc version, (b) stop, (c) different board. |
| No deals found in period | Surface count = 0, ask if period or board is correct before stopping. |
| 429 rate limit | Pause 2 s, retry up to 3× with exponential backoff; surface if still failing. |
| `create_widget` partially fails | Keep the dashboard, list failed widgets, offer retry. |
| Same-day artifact already exists | Idempotency check should have caught this; surface dashboard URL and ask if user wants to rebuild or update. |

---

## Completion criteria

- [ ] Step 0 (connector check) ran and passed.
- [ ] PAUSE gate respected — no write tools called before Step 0 passes and user confirmed publish in Step 6.
- [ ] Exactly one α dashboard was created or updated (no duplicate — verified via GraphQL dashboards query + skill-id comment in description).
- [ ] Dashboard description carries `Generated by Claude · <ISO timestamp>` + `<!-- claude-skill-id: forecast-dashboard -->`.
- [ ] Chat output ends with dashboard URL.
- [ ] Safety rail held: no deletes, no amount-column writes, no cross-workspace moves, no uninstructed stage edits.
- [ ] Non-admin fallback correctly routed to doc version if dashboard failed on perms.
- [ ] Empty-category guard evaluated if forecast-category column present.
- [ ] Step 7 share confirmation prompt shown before any permission grant.
