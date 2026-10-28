# INTERNAL_SERVER_ERROR — real monolith 500s, cause only partly identified

> **Method:** use the `investigate-tool-errors` skill. Index: [README.md](README.md).

Investigated 2026-09-07. Data window: **24 hours** (2 days times out on these queries).
Caller mix noted per table — some numbers are all callers, some `monday-agents` only.

> **Status: incomplete.** The dominant cause is not identified. See "What is still unknown".

## The error

`INTERNAL_SERVER_ERROR` and `DOWNSTREAM_SERVICE_ERROR` are **the same event**, not two problems.
They always arrive together — 76 of 76 events in a 3h sample carried both codes, neither ever alone.

The dashboard panel counts codes, not events, so one failure draws two equal bars. The "546 + 546"
on the original board is 546 failures, not 1,092.

Cause is `transformErrors` in
`platform-api-gateway/internal/graphql/processors/response_subrequest_error.go:104-113`: it replaces
the first sanitizable error with a generic `INTERNAL_SERVER_ERROR`, and a second error whose message
lacks `"Failed to fetch from Subgraph"` passes through still coded `DOWNSTREAM_SERVICE_ERROR`.

## What the platform actually reports

From the API gateway log (`Tag='graphql'`), `original_errors` before sanitizing:

```
HTTP fetch failed from 'monolith-v2026-10': 500: Internal Server Error
  code: SUBREQUEST_HTTP_ERROR, service: monolith-v2026-10, http.status: 500
```

with `time_spent_in_subgraphs: 5120` ms and gateway `status_code: 200`. So the monolith returned a
real HTTP 500 after ~5s. This is not a gateway timeout and not a caller problem in itself.

## Confirmed cause #1 — malformed filter rules 500 instead of 400

`RequestId = c50cd76e-4ad2-9b26-9f2d-35caa8a7594c`, board 5092854157, 2026-09-07 07:54:53 UTC.
The variables that produced the 500:

```json
"rules": [
  {"operator": "within_the_next", "column_id": "date_mm18nytw", "compare_value": 0},
  {"column_id": "date_mm18nytw", "compare_value": 7, "operator": "any_of", "compare_attribute": ""}
]
```

`within_the_next` with `compare_value: 0`, and `any_of` with a bare `7` on a date column. The
monolith crashes on this rather than rejecting it. A validation gap, and it belongs to the API team.

Filters do raise the rate, but do not dominate (all callers, 24h):

| | calls | 500s | rate |
|---|---|---|---|
| no `filters` | 193,752 | 179 | **0.09%** |
| with `filters` | 69,310 | 151 | **0.22%** |

2.4x higher with filters — but **54% of the 500s carry no filters at all**.

## Confirmed — it is the items_page path, not broken boards

On the same set of boards that 500 on items_page (24h):

| | calls | 500s | rate |
|---|---|---|---|
| `get_board_items_page` | 506 | 172 | **34%** |
| every other tool | 504 | 11 | **2.2%** |

15x. `get_board_info`, `board_insights` and `get_board_activity` read those boards fine. That points
at `PaginatedItemsQueryService.query_items` → `QueryService.query_item_links` and the items-query
service behind it, rather than the board's data being unreadable.

## The effect — smaller than it looks

Overall 500 rate on `get_board_items_page`: **0.13%** (330 of 263,062 calls, all callers, 24h). That
is roughly an order of magnitude below the ResourceNotFound rate, so this should probably rank below
the argument-shaped errors.

Toolkit-wide, ~650 500s in 24h across 22 tools (`monday-agents`, internal):

| tool | 500s | accounts |
|---|---|---|
| `get_board_items_page` | 172 | 45 |
| `board_insights` | 112 | 25 |
| `all_api_write` | 67 | 26 |
| `all_monday_api` | 54 | 4 |
| `undo_action` | 53 | 5 |
| `create_widget` | 39 | 7 |
| `change_item_column_values` | 30 | 6 |
| `create_notification` | 24 | 21 |
| 14 more | ~100 | |

## What is still unknown

**The cause of the ~54% with no filters.** Not identified. Blockers:

- Monolith-side errors do not appear in `monday.logs` for these request ids — only
  `platform-api-gateway` (`Tag='graphql'`) and `platform-mcp-gateway` entries do.
- `otel_traces` has no span matching `SpanAttributes['request_id']`, so the attribute name is
  different or the monolith is not traced there.
- A full-text search of `monday.logs` for a board id times out.

Next step is production Coralogix or the monolith/API team, with the request ids below.

### Claims retracted

An earlier version of this doc concluded the failures were **transient** and that the fix was a
**retry in the toolkit**. That was based on boards which both succeed and fail within 24h — which is
confounded, because the same board succeeds with valid filters and 500s with malformed ones (cause #1
above). Nothing here establishes a transient subset. Do not act on the retry recommendation until
the monolith-side cause is known.

Still true and worth knowing: there is **no retry anywhere** in `packages/agent-toolkit/src` or in
`@mondaydotcomorg/api`. If a transient subset is ever demonstrated, note that the affected tool list
includes writes (`all_api_write`, `change_item_column_values`, `create_item`, `undo_action`,
`create_widget`), so any retry must be gated on `type === ToolType.READ` or
`annotations.idempotentHint`.

## Request ids to hand to the API team

Query as `RequestId` in `monday.logs` (`Tag='graphql'` has the gateway view with `original_errors`).

| RequestId | board | note |
|---|---|---|
| `c50cd76e-4ad2-9b26-9f2d-35caa8a7594c` | 5092854157 | malformed date rules, cause #1 |
| `77bcd825-3ce9-996c-ba1d-46397c91b6ff` | 2040299303 | |
| `01d590bf-84c0-9484-9418-a2e06499552a` | 2040299303 | same board, repeat |
| `a328d4d1-ae80-99bc-8326-ae392b89bb3e` | 3167836682 | |
| `7c7a5b86-70b1-9e00-a360-348b0d7b3366` | 18429958520 | |
| `09125595-0f28-9159-a0c9-613aa9683d7c` | 18411697232 | |

Boards that failed every attempt in a 3h window while other tools succeeded on them:
`18390513514` (6/6, incl. `limit: 1`), `6435391581` (4/4), `5094423624` (3/3).

## Code references

- `platform-api-gateway/internal/graphql/processors/response_subrequest_error.go:104-113` — doubled code.
- `dapulse/app/graphql/services/paginated_items_query_service.rb:54-62` — `query_items` rescues only
  403 and a specific 429 message, re-raising everything else.
- `mcp/packages/agent-toolkit/src/utils/error.utils.ts` — `isRateLimitError` for 429, nothing for 5xx.

## Fix

Nothing to ship from the MCP side yet. Two items that are ready:

1. **API team**: the monolith should reject malformed filter rules with a 400 rather than 500.
   Reproducible from cause #1.
2. **Ours, small**: the dashboard panel counts codes rather than events, so any multi-code event
   inflates its bar. Dedupe codes per event in the panel SQL, or count events and break down by code.
