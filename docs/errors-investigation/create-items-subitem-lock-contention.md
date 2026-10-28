# create_items — parallel subitem creates under one parent hit two parent locks

> **Method:** use the `investigate-tool-errors` skill. Index: [README.md](README.md).

Investigated 2026-10-14. Independently re-validated 2026-10-14. See [Validation](#validation-2026-10-14).
Caller `monday-agents`, `sourceType=internal`.

Windows (UTC), used by every number below unless a row says otherwise:

| name | start | end |
|---|---|---|
| 24h | 2026-10-13T06:45:00Z | 2026-10-14T06:45:00Z |
| 48h | 2026-10-12T07:00:00Z | 2026-10-14T07:00:00Z |
| 7d | 2026-10-07T07:00:00Z | 2026-10-14T07:00:00Z |
| burst A | account 3733858, 2026-10-13T20:38:00Z | 2026-10-13T20:50:00Z |
| burst B | account 36682035, 2026-10-12T08:30:00Z | 2026-10-12T08:40:00Z |
| burst C | account 24103312, 2026-10-08T12:35:00Z | 2026-10-08T12:45:00Z |

Dedupe: MCP log rows with `app = 'platform-mcp-gateway'`, `LIMIT 1 BY RequestId, args_hash`. Gateway log
rows (`Tag='graphql'`) `LIMIT 1 BY RequestId`. Always use the top-level `RequestId`.

## The error

`ColumnValueException` on `create_items`. On this tool the code is **not** always a bad column value.
The MCP log carries only the code. The real error is in the API gateway log (`Tag='graphql'`,
`operation_name='createSubitem'`), and for subitems it is one of two different lock failures:

| | A. counter limit | B. parent column lock |
|---|---|---|
| message | `Item link max locks exceeded` | `failed to acquire lock on '<parent>\|subitems__1'` |
| marker | `error_data.column_validation_error_code = itemLinkMaxLocksExceeded` | the message. `error_data` not checked |
| what it is | more than 20 updates in flight on the parent item | Redlock on the parent's subitems column, gave up waiting |
| fails after | fast: p50 1.3s, p95 2.1s (7d) | slow: p50 16.5s, p95 17.9s (7d) |

Only a gateway match proves a lock error. An MCP `ColumnValueException` alone can be a value error.

The inner API call has its own `RequestId`. Join by account, `variables.parentItemId` and time, or by
`agent_run_uuid` in `attributions.baggage`.

## Why it happens

Every subitem create writes to its **parent** item, and that write takes two locks on the parent:

1. **A counter.** +1 on a Redis counter per parent item. Above 20 the write is rejected (A).
2. **A Redlock on the parent's subitems column.** Only one write holds it at a time, so creates on one
   parent **run one after another**, about 0.5–0.8s each. A waiter gives up after 50 retries of
   200ms plus up to 200ms jitter, roughly 10–20s (B).

`create_items` starts up to 15 items at once (`CONCURRENCY_LIMIT`), with no grouping by parent.
Agents also run several `create_items` calls at once on the same parents. So many creates pile up on
one parent: past 20 they hit A, and deep in the queue they time out on B.

```json
{"boardId": 7855128447, "items": [
  {"name": "...", "parentItemId": 13277228282},
  ... 16 items, all with parentItemId 13277228282
]}
```

Ours: the caller asked for something valid. Our tool turns it into a burst on a single parent.

## The effect

ColumnValueException on item creation, `monday-agents` via MCP, gateway log, 24h:

| cause | errors | accounts |
|---|---|---|
| **A. counter limit (`itemLinkMaxLocksExceeded`)** | **109 (44.5%)** | 5 (11 parents) |
| **B. parent column lock (`failed to acquire lock`)** | **8 (3.3%)** | 4 |
| status / dropdown label missing or deactivated | 49 | 20 |
| person id cannot be assigned | 42 | 15 |
| rating value shape | 19 | 4 |
| location, phone, email, text shape | 11 | 5 |
| linked to a deleted item, other | 7 | 4 |
| total | 245 | |

Seven days, gateway log:

| | errors | accounts | parents | top account |
|---|---|---|---|---|
| A. counter limit | 286 | 12 | 20 | 36682035: 70 (24.5%) |
| B. parent column lock | 446 | 19 | 28 | not measured |

B is bursty: 8 in the 24h window, 446 over 7 days. Both are spread over accounts, not one runaway
tenant.

`create_items`, MCP log, 24h:

| | value |
|---|---|
| calls / items | 9,583 / 40,973 |
| calls with ColumnValueException | 89 (238 items, 51 accounts) |
| calls with `is_error = true` | 0. The tool never sets it, even when every item fails |

ColumnValueException rate by how many subitems share one parent in a single call, MCP log, 24h:

| subitems on the same parent | items | ColumnValueException | rate |
|---|---|---|---|
| 1 | 2,099 | 1 | 0.05% |
| 2–5 | 2,090 | 0 | 0% |
| 6–10 | 4,198 | 8 | 0.19% |
| **11+** | 5,983 | 109 | **1.82%** |
| plain items, no parent | 26,603 | 120 | 0.45% (value causes) |

These are MCP `ColumnValueException` rates, not proven lock errors. Joining by parent and time does
find gateway A errors on the same parents for the 6–10 and 11+ calls. The join double-counts across
overlapping calls, so this is **not** a 1:1 mapping, and 109 here matching 109 A errors is not proof.

### Measured: concurrency on the parent at each A error

Gateway, `createSubitem` from every caller, grouped by `variables.parentItemId`, bursts A, B, C.
A request runs over `[Timestamp - duration, Timestamp]`. The exact count at the moment of the check
cannot be measured, so two bounds:

- **upper bound:** requests overlapping the failing one at any point, including itself
- **lower bound:** other requests already running when the failing one started

| A errors in 3 bursts (183) | ≤15 | 16–19 | 20 | >20 |
|---|---|---|---|---|
| upper bound | 0 | 0 | 1 | 182 |
| lower bound | 42 | 15 | 3 | 123 |

What holds under both:

- Every parent with an A error peaked at **31 or more** overlapping creates (A: 31, B: 90, C: 40–42).
- Every parent that peaked at **20 or fewer** had **zero** A errors (A: 38 parents, B: 1, C: 6). In C,
  two parents peaked at 23 and 27 and also had zero.

So A errors happen only on heavily loaded parents. "Every A error at 20 or more in flight" holds only
under the upper bound. It is not proven.

Latency, burst A: successful `createSubitem` averaged 4.23s (p50 3.6s, p95 8.9s, n=1,364). The 63 A
failures averaged 0.97s. Creates are slow because they queue on lock B.

## Example to look at

`Attributes.request_id` is empty. Use the top-level `RequestId` column.

### Example of B (parent column lock): `RequestId = e6225928-fdf7-4c5a-a597-baac68ddca15`

MCP log. Account 26506539, board 7855128447, parent item 13277228282, session
`conv_b1eae8c50811fb5685bbe0b53b7b306f`, 2026-10-13 UTC.

| time | RequestId | call | items | result |
|---|---|---|---|---|
| 14:50:57 | `c1c12344-f92b-4d40-bed7-4df3949478dd` | create_items | 1 subitem | ok |
| 14:51:21 | `2fd37dcc-f705-4d52-bbfd-012e9797dae8` | create_items | 20 subitems, one parent | ok, 12.8s |
| 14:51:47 | `e6225928-fdf7-4c5a-a597-baac68ddca15` | create_items | 16 subitems, one parent | 15 ok, 1 ColumnValueException, 17.2s |
| 14:51:54 | `c2d43447-e6f0-457b-8f02-d3da1a745de8` | create_items | 1 | ok, the retry |

Gateway log, `AccountId=26506539`, `createSubitem`:

- The 15 creates of `2fd37dcc` all started at about 14:51:08.76. They finished **one at a time**,
  about 0.5–0.8s apart, with durations growing from 1.6s to 12.8s. That is lock B serializing them.
- The only failure is `37f86dbc-c7cf-434d-936f-25bb7c99aa99` at 14:51:46.70, after 16.4s:
  `failed to acquire lock on '13277228282|subitems__1'`. It is **B, not A**.

### Example of A (counter limit): `RequestId = 450437df-62d4-4768-aa03-55e742ea00d8`

Gateway log. Account 3733858, parent item 13281732502, 2026-10-13 20:42:58.99 UTC, duration 794ms,
`Item link max locks exceeded`. In burst A this parent had 42 creates and peaked at 31 overlapping.

## Code references

Paths below are relative to each repo's root. Local clones:

| repo | local path |
|---|---|
| `mondaycom/mcp` (toolkit) | `~/Development/mcp` |
| `DaPulse/dapulse` (monolith) | `~/Development/dapulse` |
| `DaPulse/ai-toolbox` (MCP gateway, `log.ts`) | `~/Development/ai-toolbox` |

Ours:

- `packages/agent-toolkit/src/core/tools/platform-api-tools/create-items-tool/constants.ts:2` —
  `CONCURRENCY_LIMIT = 15`
- `.../create-items-tool/create-items-tool.ts:114-127` — every item becomes a task, run with
  `runWithRateLimitCircuit(tasks, { limit: CONCURRENCY_LIMIT })`, with no grouping by parent
- `.../create-items-tool/create-items-tool.ts:160` — returns success even when every item failed,
  so `is_error` is never true for this tool

Platform (`dapulse`, read at `4182b81f10d`):

- `app/services/column_values/column_values_lock_service.rb:18-33` — `validate_item_link_lockable!`,
  the counter (A). Raises `ItemLinkMaxLocksExceeded` above the max.
- `app/services/column_values/column_values_lock_service.rb:40-62` — `lock_changes!`, checks A per
  change, then takes Redlocks on `column_lock_key(item, column)` (B)
- `app/services/column_values/column_values_lock_service.rb:14-16, 93-96` — `get_redlock_service`
  with `retry_count: 50`, and `redlock_lock`
- `app/services/redis/redlock_service.rb:4-7` — `RETRY_DELAY = 200` ms, `RETRY_JITTER = 200` ms
  (default `RETRY_COUNT = 10`, overridden to 50 above)
- `app/services/column_values/column_values_lock_service.rb:64-67` — `unlock_changes` decrements A
  only after the write
- `app/models/system_variables.rb:1255-1256` — `ITEM_LINK_MAX_UPDATE_LOCKS => 20`,
  `ITEM_LINK_UPDATE_LOCKS_TTL => 10.seconds`. These are fallbacks: the live value is a Redis-backed
  system variable, not Ignite. The production `item_link_max_update_locks` is **20, as reported by the
  user** on 2026-10-14 (not independently checked). The live TTL was **not checked**.
- The A counter is per **item** (`item_link_update_lock_<board_id>_<item_id>`). Both locks apply to
  every column-value change, not only subitems. Subitem creates hit them because each one writes to
  the parent item.
- `app/services/change_column_value/change_column_value_error_handler.rb:34-35` — labels A as a
  column value error with `itemLinkMaxLocksExceeded`

## Monolith findings

**1. A correct 429 mapping exists for A, but nothing reaches it.**
`app/graphql/base_graphql_function.rb:103-105` (2022) maps `ItemLinkMaxLocksExceeded` to
`TooManyConcurrentRequestsException`, a 429 with `{item_id}`. But `ChangeColumnValueErrorHandler`
(`change_column_value_error_handler.rb:34-36`) catches it first and re-raises it as
`ChangeColumnValueException`. So the `case` hits the `ChangeColumnValueException` branch (`:115`) and
the client gets `ColumnValueException`, status 200. Even before the error code was added (#102359,
2026-01-15, flag `add_error_code_for_item_link_max_locks_exceeded`, flag removed in #110194), the
handler's last line already wrapped every error. The spec
`change_column_value_mutation_service_spec.rb:612-629` locks in the wrapping.

**2. The A counter leaks on rejection.** `column_values_lock_service.rb:18-33`:

```ruby
raise ItemLinkMaxLocksExceeded if lock_value > max_locks   # pre-check, nothing added
res = multi { incr(lock_key); expire(lock_key, ttl) }
raise ItemLinkMaxLocksExceeded if res[0] > max_locks       # +1 already added, never removed
```

`lock_changes!` raises before it returns `lock_infos`, so `unlock_changes` never runs for the rejected
attempt, and it keeps its +1 until the key's TTL runs out. The same happens for entries already
counted when a multi-change `lock_changes!` fails partway through its loop. The bug is real in the
source. **Its effect cannot be measured.** 42 of 183 A errors started with 15 or fewer creates
already running, which could be the leak or just the timing approximation. No error-rate benefit is
claimed.

**3. Every A rejection is reported to error tracking.** `ChangeColumnValueErrorHandler#handle` reports
anything not in `NO_REPORT_EXCEPTIONS`, and this is an expected throttle.

**4. A failed subitem create is rolled back, but asynchronously.** In `create_pulse_service.rb:337-378`
the subitem is created first, inactive. The parent connect (`SubtasksColumnService.connect_to_parent_pulse`
→ `ChangeColumnValueService.perform` on the parent) is where the locks are taken. The rescue calls
`ItemLinkRollbackService.rollback_create_action_async`. The item is activated only after the connect
succeeds (`ItemStateService.activate_after_create`), so a retry does not leave a visible duplicate. An
inactive row exists until the job runs.

**5. Two parent writes per subitem.** The connect, then `AddItemDualColumnService#update_parent_item_link`
(`add_item_dual_column_service.rb:37-58`), both change the parent. They run one after the other
within a request, so this is not 2x in flight, but it doubles the number of lock acquisitions.

**6. Lock B serializes creates on a parent.** The Redlock on the parent's subitems column lets one
write through at a time. In the example, 15 creates started together and finished about 0.5–0.8s
apart. A waiter gives up after roughly 10–20s. The benchmark
([create-items-subitem-cap-benchmark.md](create-items-subitem-cap-benchmark.md)) measured the
ceiling: throughput on one parent levels off at about **1.8–2.0 creates/s** from 5 in flight up, and
more concurrency only lengthens the queue. With 10 in flight (two pools of 5) on an idle board, one
request already took 17.2s, at the edge of B's window. So about 10 queued on one parent is already
close to where B starts, and real parents with column values or automations hold the lock longer.

### What can be done there

| change | where | effect |
|---|---|---|
| Fix the A leak: decrement when the post-incr check fails, or check-and-incr in one Lua script | `column_values_lock_service.rb:28-32` | correctness. Effect not measurable |
| Return a real throttle code for A: map a `ChangeColumnValueException` with `column_validation_error_code = itemLinkMaxLocksExceeded` to a 429 with `retry_in_seconds` | `base_graphql_function.rb:115` | clients see "slow down" for A. **Does not cover B**, the larger class over 7 days |
| Stop reporting A to error tracking | `NO_REPORT_EXCEPTIONS` in the handler | less noise |

Caveats on the error-code change:

- It is a **public API contract change**, from `ColumnValueException` to a 429. It needs the API team.
- **It must come after a toolkit change.** `isRateLimitError` (`packages/agent-toolkit/src/utils/error.utils.ts:70`)
  treats any HTTP 429 as the minute rate limit. `runWithRateLimitCircuit` then trips and skips every
  remaining item as `RATE_LIMIT_SKIPPED`.

Not recommended without the owners: raising `ITEM_LINK_MAX_UPDATE_LOCKS` (20) or the Redlock retry
budget. They protect the parent item, and the right values are theirs to set.

## What decided the plan

How many items agents want per turn and board, MCP log, 48h. Jobs that span turns count as several
smaller jobs, so the item counts are a lower bound. "Parallel" means calls starting in the same 2s
bucket.

| items wanted | share of jobs | share of items | jobs with parallel calls | peak parallel calls, avg / max |
|---|---|---|---|---|
| 1 | 58.8% | 9.7% | 0% | 1 / 1 |
| 2–10 | 31.4% | 24.5% | 0.5% | 1 / 2 |
| 11–20 | 5.5% | 13.2% | 2.3% | 1 / 3 |
| 21–40 | 2.0% | 9.5% | 23.1% | 1.3 / 15 |
| 41–100 | 1.6% | 15.9% | 34.5% | 1.6 / 6 |
| 100+ | 0.7% | 27.2% | 54.1% | 2.1 / 9 |

- The 20-item limit fits 96% of jobs, but the 4% above it hold 53% of all items.
- Calls at exactly 20 items run in parallel 34.4% of the time (1-item calls: 5.6%). Agents split at
  the limit and send the pieces at once.
- Time per call: 20 items p95 11.9s, max 57.5s. 1-item calls max 60.0s. A ~60s ceiling is inferred,
  not proven to be a timeout.

After a failure, agents already retry. Subitem jobs with MCP `ColumnValueException`, 48h: 17 of 23
later created at least as many items as failed, 7 of those failed again on the way, 3 recovered only
part, 3 made no follow-up call. These are MCP errors, not gateway-matched lock errors, and which items
were retried is unknown. So a better error code alone changes little. A wait hint might stop the
failed-again retries.

## Plan

Each step is its own PR. Step 2 bundles three toolkit changes by choice: simpler to ship, at the cost
of not knowing which of the three moved the numbers. Toolkit steps each need a `package.json` bump
and a `CHANGELOG.md` entry, branch from `master`, and then a toolkit bump in
`DaPulse/ai-toolbox/microservices/platform-mcp-gateway`.

### Step 1 — Report bulk outcomes clearly (toolkit, observability)

First, because every later step is measured with it.

- **All items failed → `isError: true`.** Nothing was created, so the agent loses nothing. Keep
  `structuredContent.errors[]` so `code`, `status_code` and `error_data` still reach the log. Test it.
- **Partial success stays `isError: false`.** MCP semantics are correct here: some items were created.
  `isError: true` would invite the agent to resend the whole batch and create duplicates.
- **Log counts explicitly.** Set `sessionContext.metadata.items_failed` (and `outcome`:
  `success | partial | failed`) the same way `items_count` is set today (`create-items-tool.ts`). `log.ts`
  in ai-toolbox copies all of `sessionContext.metadata` into the log, so no ai-toolbox change is needed.
  The item-level rate becomes `items_failed / items_count`.
- **One shared helper** for all bulk tools (`create_items`, `create_updates`, `update_items`,
  `change_items_column_values`), so they report the same way.

Why: when every item fails, today's log row has `is_error=false` and `is_partial_success=false`
(that flag is true only for *some* failures). It looks exactly like a full success unless you read
`error_codes`.

Watch out: dashboard error rates go up after this ships, because all-failed calls start counting as
errors. Note the date and re-baseline.

### Step 2 — Toolkit: per-parent cap, wait hint and usage hint (one PR)

#### 2a. Cap in-flight subitem creates per parent (code)

In `create-items-tool.ts:114-127`, keep the overall limit at 15, cap in-flight creates per
`parentItemId`, and interleave items across parents. Plain items and duplicates stay uncapped.

**Cap: 5 per parent. Measured** in [create-items-subitem-cap-benchmark.md](create-items-subitem-cap-benchmark.md):
20 subitems under one fresh parent, a continuously refilled pool, 3 runs per cap, no errors at any cap.

| cap | median total | vs fastest | creates/s | p50 latency | p95 latency |
|---|---|---|---|---|---|
| 1 | 36.99s | +257% | 0.54 | 1.81s | 2.62s |
| 3 | 14.34s | +38.5% | 1.40 | 1.92s | 3.49s |
| **5** | **11.18s** | **+7.9%** | 1.79 | 2.29s | 4.67s |
| 10 | 10.35s | fastest | 1.93 | 3.49s | 8.72s |

Selection rule: the lowest error-free cap within 10% of the fastest error-free cap, which is 5. Cap 3
is 38% slower, so not equivalent. Cap 10 saves only 8% but raises p50 latency by about 50% and p95 by
about 85%. Two parallel pools at cap 5 (40 items) ran error-free at the same ~1.9/s, with one request
at 17.2s. So 10 in flight per parent is about the safe edge, and the cap must not go above 5.

#### 2b. Wait hint on the lock errors (code)
Benchmark the per-parent concurrency cap proposed in:

/Users/stassh/Development/mcp/docs/errors-investigation/create-items-subitem-lock-contention.md

Do not implement or edit tracked repository files. Use staging or a disposable internal test environment, never a real customer board.

Goal:
Measure creating 20 subitems under one parent with continuously replenished concurrency limits of 1, 3, 5, and 10.

Method:
1. Use a temporary standalone script with an authenticated monday API client.
2. Create or use a clearly named disposable test board.
3. Warm up subitem-board creation before measuring.
4. For every run, create a fresh parent item.
5. Send 20 minimal create_subitem mutations under that parent.
6. Use a real promise pool: when one request finishes, immediately start the next. Do not use fixed waves.
7. Run each cap at least three times, alternating cap order to reduce time-based bias.
8. Capture:
  - total wall-clock duration
  - throughput
  - per-request p50/p95/max latency
  - success/error counts
  - complete GraphQL error code, status_code, error_data, and message
9. Then test two simultaneous 20-item pools under the same fresh parent using the best candidate cap. This models two parallel create_items calls.
10. Remove temporary scripts afterward. Clean up test data if supported.

Return:
- environment and board ID
- exact script used
- raw results for every run
- medians grouped by cap
- errors classified as:
  A. itemLinkMaxLocksExceeded
  B. failed to acquire parent subitems-column lock
  C. other
- recommended cap

Selection rule:
Choose the lowest error-free cap whose median total duration is within 10% of the fastest error-free cap. Prefer 3 over 5 if their performance is effectively equal.

If no authenticated staging API or suitable disposable board is available, stop and report the exact missing access. Do not substitute production customer data or infer results.
In `onError` (`create-items-tool.ts:133`), when the API error is A
(`error_data.column_validation_error_code = itemLinkMaxLocksExceeded`) or B (message starts with
`failed to acquire lock`), add one line to that item's `error`: too many subitems are being created
under this parent at once, so wait a few seconds and retry only the failed items, in one call. Check
B's `error_data` before relying on the message. Keep `code`, `status_code` and `error_data` as they
are, and add a test asserting all three.

#### 2c. Usage hint (description)

One sentence in `getDescription()` (`create-items-tool.ts:80`), the surface in front of the model
when it plans how to split the work: put all subitems of one parent in one call, and do not send
parallel `create_items` calls for the same parent. Not in `parentItemId`'s `.describe()`: the mistake
is in how calls are planned, not in how the field is filled. No `;` or backticks
(`tool-description-safety.test.ts`).

This matters more than the cap alone: 2a limits one call, but two parallel calls at cap 5 already put
10 creates on the parent, which the benchmark shows is at the edge of lock B.

### Step 3 — Fix the A counter leak (monolith, `dapulse`)

In `column_values_lock_service.rb:28-32`, when the post-`incr` check fails, subtract the +1 before
raising. Do the same for entries already counted when `lock_changes!` fails partway through its loop.
Guard with `IgniteService.is_released(:<flag>)`. Use a lowercase flag name, and turn it on in tests
except the ones testing the flag itself. Add a spec: a rejected attempt leaves the counter unchanged.
Optionally add `ItemLinkMaxLocksExceeded` to `NO_REPORT_EXCEPTIONS` in the same PR.

Expected effect: not measurable. A correctness fix, not an error-rate fix.

### Step 4 — Throttle error code with a retry hint (monolith, `dapulse`) — deferred, only if simple

The simple version: in `base_graphql_function.rb:115`, map a `ChangeColumnValueException` whose
`column_validation_error_code` is `itemLinkMaxLocksExceeded` to `GeneralLimitsException`. That class
already exists, returns 429 and carries `retry_in_seconds`. Use the lock TTL (`item_link_update_locks_ttl`,
10s by default, live value unchecked) as the hint.

Not supported by the evidence for now: agents already retry, 2b covers MCP agents, and it covers only
A, not B. Cost: a public API change for the API team.

**Prerequisite, its own toolkit PR before this:** narrow `isRateLimitError`
(`packages/agent-toolkit/src/utils/error.utils.ts:70`, used by `runWithRateLimitCircuit` in
`concurrency.utils.ts:38`). Today any 429 trips the circuit and skips the rest of the batch.

Not doing: retry inside the toolkit (decided against), and raising the 20-item limit (it would fit only
the 21–40 jobs, 9.5% of items, and adds time per call). The benchmark backs this: at about 2 creates/s
per parent, 20 subitems under one parent already take at least 10s, and 40 would take at least 20s,
closer to the ~60s ceiling.

### How to measure (24h after each release)

| metric | now | source | moved by |
|---|---|---|---|
| `items_failed / items_count` on `create_items` | not logged yet | MCP log | baseline from Step 1 |
| A errors (`itemLinkMaxLocksExceeded`) on `createSubitem`, `monday-agents` | 109 / 24h, 286 / 7d | gateway log | Steps 2, 3 |
| B errors (`failed to acquire lock`) on `createSubitem`, `monday-agents` | 8 / 24h, 446 / 7d (bursty, compare 7d) | gateway log | Step 2 |
| ColumnValueException rate, 11+ subitems on one parent | 1.82% | MCP log | Step 2 (2a) |
| successful `createSubitem` p50 in large batches | 3.6s (burst A). Expect ~2.3s at cap 5 (benchmark) | gateway log | Step 2 (2a) |
| jobs with failed-again retries | 7 of 17 | MCP log, by `turn_id` | Step 2 (2b) |
| parallel calls per large job | 1.3–2.1 at peak | MCP log, by `turn_id` | Step 2 (2c) |

### Separate, not in this plan

- **The value half of `ColumnValueException`** on `create_items`: missing labels, person ids that
  cannot be assigned, rating format. About 120 items a day, 42 accounts. Its own doc.
- **The MCP log has no message for per-item failures**, so causes are visible only in the gateway log.

## Validation 2026-10-14

Every claim was re-run independently on the windows at the top of this doc.

| claim in the earlier version | verdict | corrected value |
|---|---|---|
| create_items 9,580 calls / 40,969 items / 89 ColumnValueException calls | confirmed | 9,583 / 40,973 / 89 |
| "117 lock errors (48%), 8 accounts" | **corrected** | merged two errors: A 109 (44.5%), 5 accounts + B 8, 4 accounts |
| same-parent rate table | confirmed as MCP rates | not a 1:1 proof of lock errors |
| "7 days: 732 lock errors, 20 accounts, top account 28%" | **corrected** | A 286, 12 accounts, top 24.5%. B 446, 19 accounts. "20 accounts" was cut off by `LIMIT 20` |
| example `e6225928` is a counter-limit (A) failure | **corrected** | timeline right, but the failure is B (`failed to acquire lock`). A separate A example is added |
| "every lock error at 20+ in flight, none at 15 or fewer" | **corrected** | holds only under the upper bound. The lower bound puts 42 of 183 at 15 or fewer |
| "34 parents that never went above 20 had 0 errors" | **corrected** | 38 parents (cut off by `LIMIT 40`). The zero-error result is confirmed in all three bursts |
| successful createSubitem 4.3–5.1s average, burst A | confirmed | 4.23s overall, p50 3.6s, p95 8.9s |
| job-size and parallel-call distribution | confirmed | minor rounding |
| retries: 18 of 24 recovered, 7 failed again, 3 gave up | confirmed ±1 | 17 of 23, 7 failed again, 3 partial, 3 no follow-up. MCP-based |
| the leak "lowers capacity for the next burst" and explains a session's repeated failures | **withdrawn** | effect not measurable |
| per-parent cap of 10 | **revised, then measured** | lock B serializes creates. Benchmark: cap **5** (cap 3 is 38% slower, cap 10 only 8% faster with much higher latency) |
| "about 15–25 queued on one parent is where B starts" | **revised** | benchmark: 10 in flight already reached 17.2s on one request, at the edge of B's window |
| live `item_link_max_update_locks` = 20 | not independently verifiable | user-reported. TTL unchecked |

What the evidence supports:

| decision | supported? |
|---|---|
| a per-parent cap in `create_items` | yes, **5**, measured. See [create-items-subitem-cap-benchmark.md](create-items-subitem-cap-benchmark.md) |
| a usage hint against parallel calls on one parent | yes. Two parallel calls at cap 5 are already at the edge of lock B |
| a retry hint on lock errors | yes, low risk |
| fixing the A counter leak | as a correctness fix only |
| a public 429 for A | not now. It does not cover B, agents already retry, and it needs the circuit-breaker change first |
