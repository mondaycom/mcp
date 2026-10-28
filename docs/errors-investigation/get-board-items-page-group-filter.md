# get_board_items_page — ResourceNotFound from group filtering

> **Method:** use the `investigate-tool-errors` skill. Index: [README.md](README.md).

Investigated 2026-09-06. Data window: 2 days, caller `monday-agents`, `sourceType=internal`.

## The error

`ResourceNotFoundException`, which on this tool always means **"Column not found"**.

## Why it happens

The agent wants the items of one group. There is no group parameter on the tool, so the
only field that accepts an id is `filters[].columnId` — and the agent puts the group id there.

Typical call:

```json
{ "boardId": 1345595850, "filters": [{ "columnId": "group_mm6wsvcc", "compareValue": "group_mm6wsvcc" }] }
```

Two things make this our problem, not the agent's:

1. We **hand the agent the group id ourselves** — `includeGroup: true` returns `group.id` in the response.
   The agent is echoing back an id we gave it.
2. `columnId` is a plain `z.string()`, so we cannot tell a group id from a column id. The filter is
   schema-valid, we forward it, and the API correctly rejects it.

The platform does accept a magic `columnId: "group"` with the group id as `compareValue`, but we
document that nowhere — not in the schema, not in the tool description, and `get_board_info` does
not return it as a column.

### Getting it right depends on the model's prior knowledge, not on us

A model that produced the correct call was asked how it knew, and said:

> I didn't look it up in this session. The `get_board_items_page` schema you saw only says: use
> `get_board_info` for column ids, and preferably `get_column_type_info` for filter rules. It does
> not say `"columnId": "group"`. I used that from prior knowledge of monday's items filtering
> (group is filtered like a special column id). That's a guess from experience, not something this
> conversation's tool docs spelled out.

So there are three populations, and only the middle one shows up in error dashboards:

| model behaviour | outcome | visible? |
|---|---|---|
| Recalls `columnId: "group"` from training data | succeeds | no, and fine |
| Guesses, puts the group id in `columnId` | "Column not found" | yes, 21% of RNF |
| Does not attempt a filter | silent full-board scan | no, 90% error-free |

Correctness should not depend on whether a model memorized a monday API quirk. It also means the
numbers below are a floor on the "did not know how" population, not its size.

## The effect

| | |
|---|---|
| Share of all `ResourceNotFound` on this tool | **21%** (500 of 2,367 events) |
| Same, excluding one runaway tenant | **40%** |
| Accounts affected | 191 |
| Share of all `get_board_items_page` calls | 0.43% (487 of 114,387) |

The error count understates the cost. After the filter fails the agent gives up on filtering and
pages through the whole board:

| | |
|---|---|
| Scopes (session + board) where a group filter failed | 431 |
| Of those, then did unfiltered board scans | **351 (81%)** |
| Average extra unfiltered calls per scope | 2.87 |
| Estimated extra calls, 2 days | ~1,200–1,700 (~1.5% of all traffic, ~3.5x the error count) |
| Bytes returned by those scans | ~40 MB |

That wasted payload also feeds the complexity and response-size problems.

### The error count is a floor, not the cost

Some models never attempt the filter at all. They download the board and pick the items they
wanted, which produces **no error and no trace of the intent**. Observed live on board
18393273833 asking for one group: `limit: 500` unfiltered, then a second call with
`itemIds: [2 ids]`. Two round trips and 500 items to return 2.

The "scan then pick" shape — an unfiltered `get_board_items_page` with `limit >= 100`, followed by
an `itemIds` call on the same board in the same session:

| | |
|---|---|
| Scopes (session + board) | 1,112 |
| Of those, with no error logged | **1,001 (90%)** |
| Scan payload returned | 148 MB |

Caveat: this is not all group intent. Scan-then-pick also happens for name lookups and
cross-referencing, and the arguments do not say why. Treat 148 MB as the size of the pattern,
not of this bug. The point is that error-rate dashboards cannot see this class at all.

## Example to look at

`RequestId = 8d892ada-12e8-4835-a800-357455715553` (query as `RequestId` in `monday.logs`, not the
API `request_id`, which is empty here).

Account 19612541, board 1345595850, session `run_6f196323e12d6d3206a4b102d32bd095`, 2026-09-06 09:55 UTC.

The session in order:

| time | call | result |
|---|---|---|
| 09:55:14 | `get_board_items_page` `itemIds=[3208003201]`, `includeGroup:true` | ok — response gives the agent `group.id = "group_mm6wsvcc"` |
| 09:55:14 | `get_board_info` `columns.only` | ok, 17 KB of columns |
| 09:55:25 | `get_board_items_page` with the group id in `filters[].columnId` | **ResourceNotFoundException** |
| 09:55:29 | same call, filter dropped, `limit:50` | ok, 13 KB |
| 09:55:41 | `cursor=…`, `limit:50` | ok, 13 KB |
| 09:55:51 | `cursor=…`, `limit:100` | ok, 27 KB |

One failed filter turned into three full-board pages, ~53 KB.

## Code references

Ours (`mcp` repo):

- `packages/agent-toolkit/src/core/tools/platform-api-tools/get-board-items-page-tool/get-board-items-page-tool.ts`
  — `includeGroup` returns the group id the agent then tries to filter on.
- `packages/agent-toolkit/src/core/tools/platform-api-tools/get-board-items-page-tool/items-filter-schema.ts`
  — `columnId: z.string()`. Shared with `get_full_board_data` and `board_insights`, and copied to
  `hosted-mcp/src/components/table/items-filter-schema.ts`.

Platform (`dapulse` repo) — where the error is raised, and the accepted non-column ids:

- `app/services/filter_rules_service.rb:241-271`
- `app/graphql/resolvers/paginated_board_items.rb:226-248` (older path, same logic)

Both also accept `Group.items_page` natively — `boards(ids:).groups(ids:).items_page` — which
scopes by group without any filter rule.

## Fix

Shipped in `agent-toolkit` 5.68.0 (PR #481, merged 2026-09-06) — **descriptions only**:

- `get_board_items_page` description gained a GROUP FILTERING section with the exact rule to use.
- `filters[].columnId` states that `group` is accepted and that a group id is never a valid `columnId`.
- `get_column_type_info` returns filter guidelines for `columnType: "group"`, which previously
  returned `filter: null` even though `group` is a member of the column-type enum.

### Deliberately not shipped

There is **no** `groupIds` parameter, and **no** server-side repair of misplaced group ids. Both
were written and then cut:

- A parameter is a permanent API commitment while a description is free to change, the capability
  already exists in `filters`, and `groupIds` sitting next to `columnIds` reads like a projection
  rather than a filter.
- A repair rewrites caller intent with nothing logged, and its value on top of the descriptions was
  unmeasured.

If a repair is ever revisited, the signal to use is `columnId === compareValue` — shape-independent,
which matters because group ids are not all `group_`-prefixed (`topics`, `new_group29179`,
localized variants). Do not key on the prefix.

### Next step

**Re-measure this error code on the dashboard.** The descriptions are the whole fix so far. If
group failures persist after release, add a parameter or a repair then, with the new data behind it.

Not done, tracked separately:

- The `hosted-mcp` copy of `items-filter-schema.ts`.
- The other non-column ids (`__item_id__`, `__creation_log__`, `__last_updated__`) — see
  [filter-guidelines-teach-bad-column-ids.md](filter-guidelines-teach-bad-column-ids.md).
- The oversized error message — see
  [error-messages-carry-the-graphql-document.md](error-messages-carry-the-graphql-document.md).
