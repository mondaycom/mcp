# get_board_items_page — agents reuse a sibling board's column ids

> **Method:** use the `investigate-tool-errors` skill. Index: [README.md](README.md).

Investigated 2026-10-13. Data window: 24 hours, caller `monday-agents`, `sourceType=internal`.
The tool is now served by the federated `query-api` service (full cutover ~2026-10-12 12:00 UTC).
Dedupe used: `app = 'platform-mcp-gateway'` rows only, `LIMIT 1 BY RequestId, args_hash`.

## First, the rate is already under 1%

The ~2% on a 7-day view is a rollout wave that has ended:

| day | calls | error rate | INTERNAL_SERVER_ERROR |
|---|---|---|---|
| 10-07 | 104,137 | 2.40% | 1,228 |
| 10-08 | 93,699 | 2.22% | 1,329 |
| 10-09 | 84,421 | 2.06% | 1,148 |
| 10-10 | 25,939 | 2.42% | 388 |
| 10-11 | 32,333 | 1.11% | 136 |
| 10-12 | 90,341 | 0.82% | 8 |
| 10-13 (partial) | 28,028 | 0.53% | 3 |

The 500s came from `query-api` during the split rollout (2–4% of its calls) and stopped around
10-11 12:00 UTC. Last 24h: **0.82%**, 699 errors of 84,944 calls.

| code | errors | accounts |
|---|---|---|
| INVALID_TOOL_ARGS | 294 | 75 |
| NOT_FOUND | 185 | 28 |
| FORBIDDEN | 162 | 27 |
| FIELD_MINUTE_RATE_LIMIT_EXCEEDED | 93 | **1** |
| InvalidArgumentException | 14 | 10 |
| everything else | ~25 | |

## The error

`INVALID_TOOL_ARGS` with `Column "<id>" does not exist on board <N>` — 202 of the 294. The rest are
compareValue shape errors (`any_of` with an empty array, `between` without two items), a few each.
All 202 bad ids are in `filters`. None in `orderBy` or `columnIds`.

Not the double-underscore cause from
[filter-guidelines-teach-bad-column-ids.md](filter-guidelines-teach-bad-column-ids.md) — none of these
ids are underscored virtual columns.

## Why it happens

Agents work across several boards in one session. Boards made from the same template share column
ids, so an id that worked on board A usually works on board B. The agent learns that, and applies it
to a sibling board that does **not** share the id.

| bucket | failures | accounts | sessions |
|---|---|---|---|
| id was used successfully on **another board** in the same session | **158 (78%)** | 45 | 65 |
| generated-looking id seen nowhere else in the session | 29 | 13 | 28 |
| generic guess (`status`, `email`, `text4`, `date`) | 15 | 10 | 15 |

Top copied ids: `text32`, `project_status`, `status`, `project_timeline`, `phone_13`, `timeline__1`.
So even `status` is mostly a real id from the wrong board, not a guess.

The precondition already exists, and is skipped: 87% of failures (177 of 202) come from sessions that
never read that board's columns first. The description says to read columns "if you are not familiar
with the board structure" — and after reading three identical sibling boards, the agent is sure it is.
Nothing tells it that ids are per board even across boards that look the same.

Ours vs the caller's: the reuse is the model's choice, but the trap is predictable and undocumented.

## The effect

| | value |
|---|---|
| share of INVALID_TOOL_ARGS | 202 of 294 (69%) |
| share of all calls | 0.24% (0.19% for the copied bucket alone) |
| rate on filtered calls | 0.90% (202 of 22,449) |
| accounts | 54 |

What happens after the failure, per session+board, for the 174 that had not read the board first:

| next | session+boards |
|---|---|
| read the columns, then succeeded | 56 |
| did not read, later succeeded | 33 |
| read the columns, still no success on that board | 32 |
| **did not read, never succeeded — gave up on the board** | **53** |

Agents almost never retry with a new guess (about 1.0 failure per session+board). So the error count is
small, but about half the sessions silently drop the board from their answer. That cost is invisible
on the error dashboard.

Caveats: "used successfully on another board" does not check order, so a few successes may come after
the failure. "Gave up" means no later successful `get_board_items_page` on that board in the session. The
agent may have used another tool for it.

## Example to look at

`RequestId = 6663d844-4580-42de-9775-5768de79d4d8` — account 34821217, board 5103432047,
session `conv_3671373909c3dd1bab61229eef6a8c71`, 2026-10-13 06:02:10 UTC.
`Attributes.request_id` is empty; use the top-level `RequestId` column.

| time | tool | board | note |
|---|---|---|---|
| 06:00:52 | get_board_info | 5097936148 | columns only |
| 06:01:16 | get_board_info | 5103007942 | columns only |
| 06:01:20 | get_board_info | 5101051963 | columns only |
| 06:01:20 | get_board_info | 5102971523 | columns only |
| 06:01:50 | get_board_items_page | 5103432047 | no filter, ok — columns never read |
| 06:01:51 | get_board_items_page | 5101051963 | filter `timerange_mm5mf6bx`, ok |
| 06:01:55 | get_board_items_page | 5103007942 | filter `color_mm41r91e`, `timerange_mm41y0m8`, ok |
| 06:02:10 | get_board_items_page | **5103432047** | filter **`timerange_mm5mf6bx`** — the id from board 5101051963 → **fails** |
| 06:02:10 | get_board_items_page | 5097936148 | `color_mm41r91e` again, ok — shared with 5103007942 |
| 06:02:11 | get_board_items_page | 5104250489 | `color_mm41r91e` again, ok — never read, worked by luck |
| 06:02:49 | create_updates | | posts its summary. Board 5103432047 never retried |

## Code references

All in `DaPulse/query-api`, `src/domains/mcp/get-board-items-page/`, read at master `21a740246`
(2026-10-13). The description is one static constant, the same for every caller. Master also has a
newer `[SEARCH]` sentence (#326) that the live tool did not show yet, so production lags master
slightly. The parts quoted here match the live tool word for word.

- `description.ts` — `[REQUIRED PRECONDITION]`: "if new columns were added to the board or if you are
  not familiar with the board structure ... first use get_board_info with filters.columns.only ...
  Column ids are board-specific".
- `schema.ts:266-272` — JSON schema for `filters[].columnId`: "Ordinary column ids are
  board-specific. Use get_board_info with filters.columns.only to get them for the current board."
- `validation.ts` `validateColumnReferences` — raises this error. It checks filter and orderBy ids
  against the board schema before the query, because items_page would silently drop the rule and
  return an unfiltered page. It already has `boardColumns` in hand (cached) when it fails.
  - Top-level message: `Unknown column id(s) on board N: "x". Use get_board_info with
    filters.columns.only to list this board's column ids.`
  - Per-rule `errors[].message`: `Column "x" does not exist on board N` — this is what our
    `error_message` field shows, so the logs hide the get_board_info hint.
- `tool.ts:144-149` — logs it as `rejected:unknown_column` with the caller, kept out of query-api's own
  error rate.

## Fix

Descriptions first, alone, then re-measure:

1. In `filters[].columnId` (`schema.ts:266-272`) — the surface in front of the model when it picks
   the id — name the trap once: boards that look alike, even copies of one template, can have
   different column ids, so read each board's columns before reusing an id from another board.
   "Column ids are board-specific" is already there and is not enough.
2. Make the error recoverable in one step: add the board's column ids, titles and types to the
   `validateColumnReferences` error. They are already loaded there, so it costs no extra call. The
   error already tells the agent to call get_board_info, and 53 sessions still gave up, so the hint
   alone is not working. This does not lower the count, but goes after the give-ups.

Re-measure the copied bucket and the give-up count 24h after release.

Deliberately not done: matching a missing id to a sibling column by title on the server. That rewrites
caller intent with nothing logged.

Not investigated yet: `NOT_FOUND` (185, 28 accounts), `FORBIDDEN` (162, 27 accounts), and the single
account behind all 93 `FIELD_MINUTE_RATE_LIMIT_EXCEEDED`.
