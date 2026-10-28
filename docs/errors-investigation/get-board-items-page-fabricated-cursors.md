# get_board_items_page — CursorException from cursors the API never issued

> **Method:** use the `investigate-tool-errors` skill. Index: [README.md](README.md).

Investigated 2026-09-07. Data window: **24 hours**. Caller `monday-agents`, `sourceType=internal`,
unless a table says otherwise.

## The error

`CursorException` on this tool means the monolith refused the `cursor` argument. It is raised in one
place, `ItemLinkCursorService`, with three distinct messages:

| message | meaning |
|---|---|
| `Invalid or corrupted cursor provided...` | base64 decode failed, or the CRC32 checksum did not match |
| `CursorExpiredError: ...has expired...` | checksum was fine, but the `query_response_id` is gone from the query cache |
| `The provided cursor does not correspond to the given board_id` | checksum fine, board segment disagrees with `boardId` |

## Why it happens

A real cursor is not opaque noise — it has a **verifiable structure**, which makes this case unusually
easy to prove. `ItemLinkCursorService.encode` builds:

```
data = "1,<board_id>,<query_response_id>,<total_results>,<offset>,<group_id>"
cursor = urlsafe_base64( data + "|" + crc32(data) )
```

So a genuine cursor decodes to six comma-separated fields followed by `|` and a CRC32 that I can
**recompute myself in ClickHouse**. A model cannot forge that checksum. Any cursor whose CRC32 does
not match was not issued by the API.

Recomputing it over every `CursorException` in 24h (all callers) splits them cleanly, and the split
agrees with the server's own verdict — which is what makes this a proof rather than a guess:

| my CRC32 verdict | events | got `CursorExpiredError` | got `Invalid or corrupted` |
|---|---|---|---|
| checksum **valid** — genuinely API-issued | 97 | 88 | 0 |
| checksum **invalid** / no checksum segment / not base64 | 296 | **0** | 152 |

Zero crossover. Checksum-valid cursors are only ever rejected as expired, checksum-invalid ones never
are. For `monday-agents` the two causes are not evenly split at all:

| caller | fabricated cursor | real cursor, expired |
|---|---|---|
| `monday-agents` (internal) | **126** (97.7%) | 3 |
| external / unattributed | 142 | 92 |
| `ai-agent` (internal) | 28 | 2 |

**For monday-agents this is one cause: the agent supplies a cursor that never existed.** The expiry
problem is almost entirely an external-caller phenomenon and is a separate matter (see
"Out of scope").

### What the agent actually sends

126 fabricated cursors for `monday-agents`, by shape. A real cursor is 70–76 characters:

| shape | events | accounts | length |
|---|---|---|---|
| base64 of a JSON object it wrote itself (`eyJ...`) | 64 | 50 | 20–1398 |
| right 6-field shape, wrong checksum — a mis-copied real cursor | 39 | 15 | 70–76 |
| a literal placeholder word, e.g. the string `null` | 17 | 14 | 4–9 |
| not decodable as base64 at all | 5 | 3 | 73–5410 |
| truncated mid-shape | 1 | 1 | 72 |

The largest group is the model **inventing a pagination scheme**. Decoded examples, each from a
different account:

```json
{"board_id":9433540085,"last_item_id":10763974362}
{"board_id":1639198746,"from_index":25,"to_index":50}
{"board_id":18398110481,"last_id":12887860287, ...}
{"board_id":8386095362,"exclude_ids":["8386095...", ...]}
{"board_id":6221243067,"exclude_id":null,"order_by": ...}
```

`from_index`, `last_item_id`, `last_id`, `exclude_ids` are all plausible pagination keys, and none of
them are monday's. Some are wrapped in a fake JWT — `{"alg":"HS256"}` with a filler signature of
`Wr3Wr3Wr3...`. The board ids and item ids inside are **real**, taken from the page that succeeded,
so the model is reconstructing state it has rather than echoing training data wholesale. Several of
these are 64 characters — shorter than a real cursor, so it is synthesizing, not truncating.

### It is ours, not the caller's

The obvious defence would be that the agent never had a cursor to copy. It did:

| | scopes | errors |
|---|---|---|
| session+board that also had a **successful** call | 86 | **88** |
| session+board with no successful call | 0 | 0 |

88 of 88. Every fabricated cursor followed a successful call on the same board in the same session,
and 105 of 129 failures land **within 60 seconds** of that success. The agent had a fresh, valid
`nextCursor` in its context and did not use it.

So the precondition in the description was honoured, and the existing sentence *"use the nextCursor
from the previous response"* was read and not obeyed. What the description never said is that the
value is **opaque and unconstructable**. A model that writes `{"board_id":...,"from_index":25}` has
concluded cursors are semantic objects it may build. That belief is the bug, and nothing in the tool
contradicted it.

The literal-`null` subset is additionally a plain gap in our code:
`get-board-items-page-tool.ts:200` guards `input.cursor || undefined`, which catches `''` but passes
the string `"null"` straight through to the API.

## The effect

Share, for `monday-agents` over 24h:

| | calls | CursorException | rate |
|---|---|---|---|
| calls with a `cursor` | 9,440 | 129 | **1.37%** |
| calls without a `cursor` | 76,320 | 0 | 0% |
| all calls to the tool | 85,760 | 129 | 0.15% |

76 accounts affected. `CursorException` is 7th of 14 error codes on this tool (177 over 2 days,
against 2,435 for `COMPLEXITY_BUDGET_EXHAUSTED` and 2,001 for `ResourceNotFoundException`), so this
is a **small** error code. Be honest about that: the value here is the mechanism being fully proven
and the fix being free, not the volume.

The downstream cost is where it actually hurts (121 session+board scopes with a failure):

| behaviour after the failure | scopes | share |
|---|---|---|
| restarted from page 1, unfiltered | 52 | 43% |
| retried with a cursor at all | 8 | 7% |
| did neither — abandoned the board | 61 | 50% |

Extra bytes re-read after a failure: **5 MB / day**. Small. The real damage is that **93% never
retry the cursor**: pagination is abandoned, the remaining pages are never read, and the agent
answers the user from page 1 only. That produces a silently incomplete answer with no error visible
to anyone downstream.

**What these numbers do not prove.** The 5 MB and the 43% restart rate are correlational — a
page-1 re-read in the same session could have other causes, and I cannot see response bodies, so I
cannot confirm the successful page actually had a `nextCursor` to copy in every case. It is possible
some of these boards had only one page and the agent invented a cursor to fetch a page that never
existed. Either way the correct behaviour is the same: copy `nextCursor` or stop.

## Example to look at

`RequestId = ef4ce300-b588-4d1c-8d8b-f7ba68b0ce42` — account 1210910, board 9433540085,
session `run_7d1f5376944cae314a73d9c0026e9125`, 2026-09-07 13:03:47 UTC.
(`Attributes.request_id` is empty on these — this is the top-level `RequestId` column.)

The whole session is four calls:

| time (UTC) | tool | cursor | result |
|---|---|---|---|
| 13:03:05 | `get_board_info` | — | ok, 5,205 B |
| 13:03:28 | `get_board_items_page` limit 100 | — | ok, 35,317 B |
| 13:03:47 | `get_board_items_page` limit 100 | `eyJib2FyZF9pZCI6OTQzMzU0MDA4NSwibGFzdF9pdGVtX2lkIjoxMDc2Mzk3NDM2Mn0=` | **CursorException** |
| 13:03:48 | `list_users_and_teams` | — | ok, 203 B |

That cursor decodes to exactly:

```json
{"board_id":9433540085,"last_item_id":10763974362}
```

19 seconds after a successful page 1, it invented a cursor, was refused, and moved on without ever
reading page 2. It also called `get_board_info` first, so it was following the tool's stated
preconditions.

For contrast, a genuine cursor from the same window decodes to:

```
1,18399682854,mxrd7yXTHSOKoXWHVm_Lc,99,60,|2599522506
```

## Code references

- `mcp/packages/agent-toolkit/src/core/tools/platform-api-tools/get-board-items-page-tool/get-board-items-page-tool.ts:84-89`
  — the `cursor` field description.
- same file `:200` — `cursor: input.cursor || undefined`, which lets the string `"null"` through.
- same file `:180` — `canIncludeFilters = !input.cursor`, so filters and orderBy are silently dropped
  whenever a cursor is present. Correct, since the cursor encodes them, but undocumented.
- `dapulse/app/services/column_values/item_link_cursor_service.rb` — `encode` / `decode`, the CRC32
  checksum, and all three error messages. `handle_error_if_expired` maps the query-cache miss
  `"QueryResponseId does not exist"` to `CursorExpiredError`.

## Fix

**Shipped: description only, `agent-toolkit` 5.70.0.** The `cursor` field now says the value is an
opaque token, that it must be copied from `nextCursor` character for character, that it must never be
constructed or edited, and that the field should be omitted rather than set to `"null"`. Nothing was
added to `getDescription()` — the routing fact ("use nextCursor when has_more is true") is already
there, and per the one-fact-one-place rule the accepted *shape* of the value belongs only on the
field.

Next step is to **re-measure this error code after release** before writing any code.

### Deliberately left out

- **Normalizing placeholder cursors** (`"null"`, `"undefined"`, `"none"` → treat as absent). 17
  events/day. Held back because the new sentence tells the model to omit the field instead, and if
  that works the repair is unnecessary. A server-side repair also rewrites caller intent with nothing
  logged.
- **Validating the cursor locally** by recomputing the CRC32 and returning an actionable error
  instead of a round-trip to a confusing `Invalid or corrupted cursor`. This is the strongest fix and
  would catch all 126, but it duplicates a platform invariant in our code and would break silently if
  the platform changes the cursor format. Only worth it if the description change does not move the
  number.
- **The expiry cause** — 97 events/day of genuinely API-issued cursors rejected as expired, 92 of
  them from external callers. Different cause, different owner (the query-response cache behind
  `query_response_id`), needs its own doc and its own measurement. Worth noting for whoever picks it
  up: 2 of the 3 `monday-agents` cases were only 6–15 seconds after the cursor was issued, which is
  far too fast to be an ordinary TTL and is the interesting thread to pull.

### Also noticed, not acted on

`error_message` is the string `"Unknown error"` on 148 of 393 of these events, spread across every
bucket rather than concentrated in one, so the real API message is being lost somewhere in our error
shaping. It does not change any conclusion here — the `error_codes` array and `operationArgs` were
enough — but it makes these failures much harder to read from logs than they need to be. Probably
related to [error-messages-carry-the-graphql-document.md](error-messages-carry-the-graphql-document.md),
which is being handled MCP-server-side.
