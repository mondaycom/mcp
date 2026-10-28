# MCP tool error investigations

**Method: use the `investigate-tool-errors` skill.** It holds the dashboard, the datasource uids,
the ClickHouse field names, the parameterised queries, the checks a finding has to survive, and the
write-up format. Invoke it before continuing any file here or starting a new one.

These files are deliberately **uncommitted** — they exist on disk, not in git history.

One file per *cause*, not per error code. A single code usually splits into several unrelated causes.

## Status

| file | error code | status |
|---|---|---|
| [get-board-items-page-group-filter.md](get-board-items-page-group-filter.md) | `ResourceNotFoundException` | **Shipped** — descriptions only, `agent-toolkit` 5.68.0, PR #481 merged 2026-09-06. Next: re-measure to see whether documentation alone was enough. |
| [filter-guidelines-teach-bad-column-ids.md](filter-guidelines-teach-bad-column-ids.md) | `ResourceNotFoundException` | **In progress.** Re-measured 2026-09-07: the original "agents copy our example ids" conclusion did not survive denominators. Real driver is the double-underscore ids, mostly in `orderBy`. |
| [error-messages-carry-the-graphql-document.md](error-messages-carry-the-graphql-document.md) | any | **Assigned elsewhere** — being fixed MCP-server-side by returning `structuredContent` only. Note `structuredContent.message` also carries the dump. |
| [internal-server-errors-monolith-500s.md](internal-server-errors-monolith-500s.md) | `INTERNAL_SERVER_ERROR` + `DOWNSTREAM_SERVICE_ERROR` | **Incomplete.** One cause confirmed (malformed filter rules 500 instead of 400). ~54% of the 500s carry no filters and are unexplained — blocked on monolith-side logs. Has a retracted-claims section. |
| [dangling-workspace-internal-server-error.md](dangling-workspace-internal-server-error.md) | `INTERNAL_SERVER_ERROR` | **Implemented locally across data-structure, column_values, and dapulse.** The original Workspace 404 body now reaches GraphQL and becomes `ResourceNotFoundException` with workspace/board ids. Trace `0d4c6ab571de29fbeba5a52e8b8e9623`. |
| [get-board-items-page-fabricated-cursors.md](get-board-items-page-fabricated-cursors.md) | `CursorException` | **Shipped** — descriptions only, `agent-toolkit` 5.70.0. Cause proven by recomputing the cursor CRC32: 126 of 129 `monday-agents` events send a cursor the API never issued. Next: re-measure before writing any code. |
| [get-board-items-page-unsupported-filter-operators.md](get-board-items-page-unsupported-filter-operators.md) | `InvalidArgumentException` | **PR open** — guidelines only, PR #491. 62% of failures came from users who *had* called `get_column_type_info`, so the gap was content, not enforcement: 13 of 42 column types had any guidance. Retracted three of its own claims under source reading, including "remove `between`", which would have been a regression. Next: propagate `supported_operators` from `data-core` instead of hand-maintaining. |

| [get-updates-blank-optional-args.md](get-updates-blank-optional-args.md) | `TOOL_EXECUTION_FAILED` | **Mostly fixed in 5.75.0, not deployed.** App 813181 sends `""` for every optional field, 44% of its `get_updates` calls fail, 85% of the tool's errors. 5.75.0 fixes ~72%. Risk: it removes `objectId`, which 88% of calls use today. |

| [get-board-items-page-cross-board-column-ids.md](get-board-items-page-cross-board-column-ids.md) | `INVALID_TOOL_ARGS` | **Investigated, nothing shipped.** Now on `query-api`. Tool already at 0.82% for `monday-agents` — the 7-day 2% was the rollout 500 wave. 78% of the bad column ids were used fine on a sibling board in the same session. Fix is a description line plus a recoverable error, in `query-api`. |

| [create-items-subitem-lock-contention.md](create-items-subitem-lock-contention.md) | `ColumnValueException` | **Plan agreed and validated, nothing shipped.** Subitem creates on one parent hit two parent locks: the counter limit `itemLinkMaxLocksExceeded` (109/24h, 286/7d, 12 accounts) and a Redlock on the parent's subitems column, `failed to acquire lock` (446/7d, 19 accounts). The lock serializes creates per parent. Plan: report bulk outcomes, per-parent cap of **5** (benchmarked, see [create-items-subitem-cap-benchmark.md](create-items-subitem-cap-benchmark.md)) plus a wait hint and a usage hint, monolith counter-leak fix behind Ignite. The 429 mapping is deferred. |

## Not yet investigated

By volume for `get_board_items_page` / `monday-agents` over 2 days, re-measured 2026-09-07:
`USER_ACCESS_DENIED` (821), `FIELD_MINUTE_RATE_LIMIT_EXCEEDED` (259),
`FIELD_LIMIT_EXCEEDED` (32), `InvalidColumnTypeException` (27),
`REQUEST_TIMEOUT` (23). Complexity errors last — they are largely a symptom of the others.

`InvalidArgumentException` has moved out of this list — see the table above. Note the count there
(680 over 48h, all callers) is much higher than the 82 recorded here for `monday-agents` alone.

Also open, split out of the `CursorException` work: **genuinely API-issued cursors rejected as
expired**, ~97/day, 92 of them from external callers, some only 6–15s after the cursor was issued.
Owned by the query-response cache behind `query_response_id`, not by us.

Also unexamined: the runaway tenant `10028338`, which alone produced ~47% of
`ResourceNotFoundException` by looping three hardcoded column ids across 18 boards. Caller-side, not
a code fix.
