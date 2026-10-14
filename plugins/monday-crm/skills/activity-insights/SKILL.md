---
name: activity-insights
description: >
  Analyze CRM activity data — rep performance, call and email volume, team activity breakdowns, and engagement stats. Use when someone says "how many calls did the team make", "show me rep activity", "who's the most active rep", "activity breakdown this week", "how is the team performing", "what's our outreach volume", "compare rep activity", "call stats", "email volume by rep", "activity report", or "team engagement stats".
argument-hint: "[team / rep name / date range — 'rep activity this week', 'call breakdown for John', 'team performance last month']"
user-invocable: true
allowed-tools: [Read, mcp__monday__get_user_context, mcp__monday__search, mcp__monday__get_board_info, mcp__monday__get_board_items_page, mcp__monday__get-activity-insights, mcp__monday__get-timeline-items, mcp__monday__list_users_and_teams]
---

# Activity Insights

Flow: **Trigger → Connector check → Resolve board → Build query → Fetch insights → Synthesize**.

## Input
- Optional: argument describing the analysis (e.g., "rep activity this week", "call breakdown for the team").
- Optional: rep name, date range, or grouping preference.

## Output
A synthesized summary with specific numbers and rep-level breakdowns. Never raw JSON.

## Knowledge

- `get-activity-insights` returns **aggregated counts** — not individual activity records. For activity history with content, use `get-timeline-items`.
- **Default time range is 7 days** — no need to pass a date if the user asks about "recent" or "this week".
- **groupBy accepts 1–2 fields:** `["type"]` for activity breakdown; `["userId", "type"]` for per-rep breakdown; `["userId"]` for rep totals only.
- `board_id` is required — always resolve it before calling the tool.
- Present results as natural language insights — never dump the raw results array.

## Tools (MCP)

- `get-activity-insights` — aggregated activity stats (counts, duration) grouped by rep, type, or item.
- `get_user_context` — user identity and account info.
- `search` / `get_board_info` / `get_board_items_page` — resolve boards and items.
- `list_users_and_teams` — resolve rep names to user IDs for filtering.
- `get-timeline-items` — fallback for item-level activity detail (content, not aggregates).

## When to use each groupBy

| User says | groupBy | Notes |
|---|---|---|
| "How many calls did each rep make?" | `["userId", "type"]` | Per-rep breakdown |
| "What's the activity breakdown this week?" | `["type"]` | Team totals by type |
| "Who's the most active rep?" | `["userId"]` | Rep totals only |
| "How many emails did John send?" | `["type"]` | + `userIds` filter |
| "Activity on the Acme deal?" | `["type"]` | + `itemIds` filter — or use `get-timeline-items` for content |
| "Compare rep performance last month" | `["userId", "type"]` | Set `fromDate`/`toDate` |

---

## Step 0: Connector check

1. Call `mcp__monday__get_user_context`. On error → print connector install prompt, stop.

---

## Step 1: Resolve board

`get-activity-insights` requires a `board_id`.

1. If a board name is clear from the argument → `mcp__monday__search` or `mcp__monday__get_board_info` to resolve the ID.
2. If multiple CRM boards exist → ask: *"Which board should I analyze — Deals, Contacts, or Leads?"*
3. No board context → `mcp__monday__search({ query: "deals" })` to find the most likely CRM board. Still ambiguous → ask.

---

## Step 2: Build query parameters

Parse the argument:

**groupBy:**
- Reps, "who", "by rep", "each rep" → `["userId", "type"]`
- "breakdown", "by type", "what kind" → `["type"]`
- Default → `["userId", "type"]`

**Date range:**
- "this week" → 7-day default (no params needed)
- "last month" → `fromDate`: 30 days ago
- "today" → `fromDate`: start of today
- Explicit dates → parse and pass `fromDate` / `toDate`

**Filters:**
- Rep name mentioned → resolve via `mcp__monday__list_users_and_teams`, pass `userIds`
- Item/deal name mentioned → resolve item ID, pass `itemIds` (or redirect to `get-timeline-items` for content)

**aggregationType:** default `count`. Use `sum` / `avg` for duration questions ("how long were the calls").

---

## Step 3: Fetch and synthesize

1. Call `mcp__monday__get-activity-insights` with resolved parameters.
2. If `total_results === 0`:
   *"No activities found on \<board\> in the last \<window\>. The team may not have logged activities yet, or try a wider date range."*
3. Synthesize results:
   - Lead with the headline: *"Your team logged 92 activities this week."*
   - Break down by type: *"42 emails, 28 calls, 15 meetings, and 7 notes."*
   - Call out top performers if grouped by rep: *"Alex led with 34 activities, followed by Sam (28) and Jordan (19)."*
   - Flag low activity if relevant: *"4 reps logged fewer than 5 activities this week."*

---

## Cross-skill handoffs

- **To log-activity:** insights show a rep with zero activity → *"Want to log a recent call or meeting for them?"*
- **To run-sequence:** low outreach volume → suggest enrolling contacts in a sequence.
- **From daily-briefing:** briefing surfaces activity gaps → this skill provides the full breakdown.
- **To get-timeline-items:** user asks for actual content (what was said, meeting notes) rather than counts.

---

## Error handling reference

| Failure | Behavior |
|---|---|
| Connector missing | Stop; print install prompt. |
| Board not resolved | Ask user to specify the board. |
| Tool unavailable | *"Activity insights aren't available on the connector for your account yet."* |
| No results | Confirm date range; suggest widening. |
| Rep name not found | Ask for clarification or list available reps via `list_users_and_teams`. |
| Item-level content request | Redirect to `get-timeline-items`; `get-activity-insights` operates at board level. |

---

## Completion criteria

- [ ] Connector check passed.
- [ ] `board_id` resolved before calling the tool.
- [ ] Query parameters derived from context — not hardcoded defaults.
- [ ] Results synthesized into natural language — no raw JSON.
- [ ] Zero-result case handled gracefully.
- [ ] Item-level content requests redirected to `get-timeline-items`.
