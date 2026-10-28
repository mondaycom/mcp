# get_board_items_page — INTERNAL_SERVER_ERROR: candidate fixes

Sibling to `get-board-items-page-rnf-fixes.md`, which covers the ResourceNotFoundException class.
This one covers `INTERNAL_SERVER_ERROR` + `DOWNSTREAM_SERVICE_ERROR` only.

**Status: candidates, except Fix 4, which merged to `dapulse` master on 2026-09-16.** An earlier
revision of this file was titled "confirmed fixes" and overstated both impact and scope. Root causes
below are verified by code read plus production data. The remaining proposed changes are not all
verified as safe. Corrections from review are folded in and marked.

Excluded by request: `COMPLEXITY_BUDGET_EXHAUSTED`, `FIELD_LIMIT_EXCEEDED`,
`FIELD_MINUTE_RATE_LIMIT`, `CursorException`, `ResourceNotFoundException`.

## What each fix actually buys

Stated up front because the earlier revision blurred this. Only Fixes 1 and 3 can raise the
successful-call rate. Fix 4, now merged, improves error classification. Fix 2 changes that
classification again to a fail-closed denial and avoids one monolith retry.

Ordered by success-rate impact. Volumes are user-visible calls, caller-scoped, ~33h, measured
before Fix 4 merged.

| Fix | Repo | Cause | Volume | Effect on user success | Effect on errors |
|---|---|---|---|---|---|
| **1 — subitems nil** ‡ | dapulse | C | **~75 (17%)** | **500 → success**, subitems possibly omitted | removes the misleading 403 |
| **3 — static pseudo-columns** | column_values | B | **~39 (9%)** | **500 → success** | removes false permission violation |
| 5 — duration `startDate` ‡ | dapulse | new | 2 (<1%) | 500 → success | removes a monolith `TypeError` |
| 2 — missing workspace | dapulse | A | **~308 (70%)** | **none** — board stays unreadable | ResourceNotFoundException/404 → fail-closed 403; avoids one monolith retry |
| 4 — 404 mapping | dapulse | A | ~308 | none | 500 → ResourceNotFoundException/404; **merged** |
| Optional — details | column_values | A | ~308 | none | adds `{model, id}` to the payload |

‡ **Fix 5 is a mitigation, not an approved correction** — done as `.to_i` it converts a 500 into a
success that may report a ~56-year duration. It should not ship on volume alone.

**Fix 1 is now supported for the failing population.** Cause C's nil is confirmed permission-filtered
for all 20 measured calls, and the fallback that currently "recovers" them recovers ids on a board the
platform then refuses to read — so recovery becomes a 403 one hop later and `.compact` is the only path
to a 200. Undecided only for the 122 caller-scoped traces that already return 200; a count-only probe
closes that in a day. This reverses the previous revision's blocking verdict, which rested on an
inference about a platform-wide ~83.7k population that turned out to be the wrong denominator. See
"Recovery measurement" under Fix 1.

**The dominant cause is not a success-rate fix.** Cause A is ~70% of the class, but fixing it
converts a crash into a fail-closed denial — the board stays unreadable either way. The three fixes
that actually raise the success rate (1, 3, 5) address ~116 calls, **~26%** of the class between
them. Anyone framing this work as "recover the 500s" should know that up front: about a quarter are
recoverable, and the largest single win is Fix 1, not the workspace bug.

**Fix 4 is landed; Fix 2 is now a resilience follow-up for cause A.** Fix 4 classifies the CVMS 404
as `ResourceNotFoundException`. Fix 2 prevents that 404 from being raised and instead returns a
fail-closed authorization denial. On this path Fix 2 supersedes Fix 4's classification, while Fix 4
continues to cover other CVMS 404s.

What Fix 2 buys is narrower than an earlier revision claimed:

- **One monolith retry** — data-structure does **not** retry the 404. Its retry predicate retries
  transport errors and responses with status >= 500. The monolith receives the propagated CVMS 404
  as `HttpErrorException`; `InternalMsHttpRetryService` retries it because production does not
  define `internal_ms_non_retryable_http_codes`. `ColumnValuesEndpoints` sets `retries: 1`, so the
  path makes two total CVMS attempts, not six.
- **~36.5 error spans per call** — 6,819 error spans across 187 user-visible calls. This is telemetry
  fan-out across services, not an HTTP request count. How much of it comes from the one repeated
  CVMS execution has not been measured.

Fix 2 removes the second CVMS execution and stops one orphan aborting an entire `boardIds`
permission batch. It cannot be credited with removing all 36.5 error spans.

## Evidence base

Scoped to caller `on_behalf_of_app_name == 'monday-agents'` **except where marked
platform-wide**. Blended numbers mislead here: this class is ~3x more frequent for monday-agents,
because the dominant cause sits on a branch only agent users take.

- Volume, monday-agents, this tool: 7d 608,907 calls / 25,956 errors (4.26%); 24h 62,929 / 4,201
  (6.68%).
- This class, 7d: 2,111 events / 122 accounts. Third by volume behind the excluded classes.
- Request-shape split, 2026-09-14T14:00Z → 2026-09-16T07:30Z (**41.5h**), n=570:
  ITEMIDS 265, SUBITEMS 99, PLAIN 93, CURSOR 54, FILTERS 47, COLUMNIDS 12.
- Cause attribution, **31.5h** trace-join window (`otel.traces` floor for platform-mcp-gateway
  verified at 2026-09-15T00:00:00Z):

  | Bucket | A (workspace) | B (`__item_id__`) | C (subitems nil) | Other |
  |---|---|---|---|---|
  | PLAIN | 69/69 | — | — | 0 |
  | COLUMNIDS | 10/10 | — | — | 0 |
  | FILTERS | 28 | — | — | 2 × 403 |
  | CURSOR | — | 39 | — | 1 × 403 |
  | SUBITEMS | 14 | — | 55 | 1 × redis timeout |
  | ITEMIDS † | **187** | **0** | 20 | 2 × `TypeError` |

  † ITEMIDS measured separately in a fresh **33h** cohort (2026-09-15T00:00Z → 2026-09-16T09:00Z),
  n=209 calls / 21 accounts / **99.0% join rate** (207/209), 1:1 call-to-trace verified.
  Denominator: 59,292 ITEMIDS-shaped calls in window → **0.35% 500 rate**. ITEMIDS is 47.6% of the
  caller-scoped 500 class, matching the historical 46%.

### Class-wide attribution

Combining both runs. **Windows differ slightly** (31.5h for five buckets, 33h for ITEMIDS), so
treat these as approximate — but the gap between A and B is far too wide for window drift to flip
the ranking.

| Cause | Calls | Share | Fix | Recoverable? |
|---|---|---|---|---|
| A — dangling `Board#workspace_id` | ~308 | ~70% | 2, 4 | **No** — fail-closed |
| C — subitems nil-deref | ~75 | ~17% | 1 | Yes |
| B — `__item_id__` on subitems board | ~39 | ~9% | 3 | Yes |
| other (403s, redis, `TypeError`) | ~6 | ~1% | 5 | Partly |

**Accounting for the gap, exactly.** 439 calls in the 33h window; ITEMIDS is 209, leaving **230
non-ITEMIDS**. The five-bucket attribution above sums to **219** (PLAIN 69, COLUMNIDS 10, FILTERS
30, CURSOR 40, SUBITEMS 70). The **11-call difference is a window artifact, not an unattributed
cause**: those five buckets were attributed over 31.5h and the ITEMIDS denominator covers 33h, so
the residual is the extra 1.5h plus that run's trace-join failures. It is not evidence of a further
cause, and it is also not evidence against one — nothing was measured there.

### Known measurement defects — read before prioritizing

Flagged in review, all legitimate:

1. **The two windows differ.** Shape split is 41.5h, cause attribution 31.5h. So "55 of 99" is a
   31.5h numerator over a 41.5h denominator and understates the share. Ratios within the
   attribution table are sound; cross-table fractions are not.
2. **The earlier retry attribution was wrong.** The 794 workspace-404 events (48h) are
   `board_and_columns_permissions` hits, but data-structure does not retry 404 responses. The
   monolith retries the propagated CVMS 404 once, producing two total CVMS executions by default.
   The earlier `794 ÷ 6 ≈ 130` conversion and the claimed corroboration are invalid. Do not derive
   user-visible calls from these raw events without a call/trace join. Likewise 146,989 events /
   9,841 traces for cause B is ~15 events per trace — trace counts are the meaningful unit.
3. **Cause B's 146,989 / 9,841 / 230 accounts figure is platform-wide on the pages endpoint**, not
   monday-agents. The earlier header claimed blanket scoping; that was wrong.
4. ~~**ITEMIDS is unattributed.**~~ **Resolved.** Measured in a fresh in-retention cohort: cause A
   89.5%, C 9.6%, **B 0%**. The prior assumption that ITEMIDS was cause B was **wrong**, and it had
   inflated cause B's apparent volume roughly eightfold. This also removes the contradiction with
   the earlier 3h span sample (DS-404 beating non-allowed-columns ~4:1) — that sample was right.

Zero 429 / rate-limit spans anywhere in this population; that hypothesis was measured and is dead.
`no_operator_config` correctly surfaces as `InvalidArgumentException`, not a 500, and appeared in
no bucket.

Example traces, verified present in `otel.traces`:

| Cause | trace_id | Account | Board |
|---|---|---|---|
| A — dangling workspace | `0d4c6ab571de29fbeba5a52e8b8e9623` | 32192072 | 5095400354 (ws 6252231) |
| B — `__item_id__` | `fe90630d3baa0743bd91eef1b5fee267` | 36467630 | 18426593320 → flags 18428700540 |
| C — subitems nil | `bad6563dfd664935129594aaa123c69d` | 7962088 | 5098590118 → 403 on 5098600762 |

---

## Fix 1 — `.compact` the subitems list before the recursive walk

**File:** `dapulse/app/services/column_values/query_service.rb:205`

**Reasoning.** Lines 202-204 map `linkedPulseIds` through `subitems_by_id[...]`. That hash is
built at line 196 from `subitems_item_links`, so a linked pulse with no matching item-link row maps
to **nil**. Line 205 hands the array, nils included, to `get_subitems_recursively`, which
dereferences `subitem.child_id` at line 252 → `NoMethodError on nil`.

The recursive call at line 266 already passes `direct_subitems.compact`. The guard exists; it is
missing only at the call site that receives unfiltered input. That asymmetry is the bug.

The consequence is worse than a nil-deref, and **the mechanism is not what earlier revisions of this
doc said**. The `rescue` at line 213 handles only `"Internal Request Error in column_values - 404"`
and `- 429`, so the `NoMethodError` falls to the logger and the fallback at line 234,
`SubtasksColumnService.get_subitems_grouped_by_parent_items`.

**The fallback does not raise. It succeeds — and that is the problem.** Verified from the full
ordered log timeline of trace `91c36585cc0abdedbd05f3c14ec03c7f` (account 32565522), which shows
three attempts, each: nil-deref → fallback returns **22 subitems** on board 18422902282 → GraphQL
`ColumnValuesLoader` (`column_values_loader.rb:38-48`) requests those subitems' column values on that
board → data-structure refuses → 403 `NotPermittedError` → 500. The 403's request body carries
`metadata.callerAction = "column_values_loader_query_column_values"`, a string that exists in exactly
one place, `column_values_loader.rb:45`.

So the fallback recovers subitems the platform will not serve, and the failure lands one hop
downstream in the loader. Earlier revisions said the fallback "issues a permission-checked call which
returns 403" — **wrong**: the fallback is permission-*unchecked* (see the table below), which is
precisely why it returns rows that then blow up. `item_subitems_loader.rb:30` converts only 429, so
the 403 becomes a 500.

The fallback is more permissive than the linked side in **three** ways, all verified:

| | fallback | linked side (cvms) |
|---|---|---|
| item state | **no filter** — `subtasks_column_service.rb:282` passes `child_id` only, and default-state injection is skipped when `child_id` is present (`item_link_query_args.rb:54-56`). Flag branch at `:280` uses `Item.get_all_states(Item::STATE_PENDING)` = all states **except** pending (`item.rb:830-834`), still including archived and deleted | `state: STATE.RUNNING` (`linked_items_resource_service.ts:27`); monolith never sets `withNonActiveItems` |
| item-view permissions | **none** — `internal/queryColumnValues` never receives `options.permissions` (`column_value_query_service.ts:22-59`) | `filterBoardItemsByItemViewPermissions` (`linked_items_resource_service.ts:35`) + `connectedBoards` gate |
| relation permissions | `ignore_permissions: true, skip_connected_board_permissions: true` (`subtasks_column_service.rb:202`) | graph relations, also unfiltered |

**My "outcome #4 is empty by construction" hypothesis was wrong.** I argued that if the fallback
applied an equivalent state filter it could not recover excluded ids. It applies *no* state filter,
so it recovers them freely. The agent disproved this against `item_link_query_args.rb:54-56`, which I
had not read.

**Impact — status: candidate mitigation, not an approved correctness fix.**

- Requests would succeed rather than 500.
- **Missing subitems are silently omitted.** For the measured failing population this is the right
  outcome: the omitted ids are permission-filtered, and the fallback that "recovers" them only earns a
  403 from `ColumnValuesLoader`. Omission returns strictly more than a 500 does. For the 122 traces
  that already return 200, whether omission loses served data is still unmeasured — that is the only
  remaining risk and the probe below settles it. (An earlier revision called omission "strictly better
  than a 500" without evidence; the claim now has evidence, but only for the failing set.)
- Needs a test that *proves* the omission semantics, not merely no-raise.
- It affects **every GraphQL `items.subitems` caller** under the feature flag, not just this tool.
  Wider value, wider blast radius.

### Nil origin — RESOLVED for the measured population

**The premise in an earlier revision was wrong.** `linkedPulseIds` and the item-link rows are not two
fetches by two services. Both arrive in **one** cvms response (`query_service.rb:188-189`). The
divergence is created inside column-values between two producers, both verified by direct read:

- `linkedPulseIds` is regenerated from the **unfiltered** graph-relations map —
  `enrich_column_value.ts:7-12`, `itemsRelationsByColumnMap.get(columnId).itemRelations.get(itemId)`,
  no permission and no state filter.
- `linked_pulses` is built **only from `connectedBoards`** —
  `board_data_serializer.v2.ts:50-76` (`if (options.connectedBoards) { for (...) }`). A board absent
  from that map contributes nothing, silently and without a log.

Chain for the measured cases: data-structure strips unauthorized boards, including subitems boards
(`columns-and-relations-manager.ts:196-206`, variable `unauthorizedRootBoardsAndSubitemsBoardsIds`)
→ cvms resolves `subitemsBoardId` only from the returned boards
(`get_enrich_data_with_data_structure.ts:429-430`) → `undefined` → `handleSubitemsBoard` no-ops
(`:130-143`) → subitems board never enters `connectedBoards` → all subitems dropped from
`linked_pulses` while `linkedPulseIds` still advertises them → nil at `query_service.rb:203`.

The request does not 403 at that point because `get_enrich_data_with_data_structure.ts:74-79` throws
only when the **requested** board is unauthorized; here the parent is requested and the subitems
board is the unauthorized one.

**Classification of the 20: 20/20 permission-filtered.** 7 accounts, 7 board pairs, uniform (3
monolith nil events + 6 cvms denial events per call). Evidence: every trace carries
`applicationname='column_values'`, `subsystemname='ExecuteItemsQuery'`,
`message="User has no permissions for the board"` on a board different from the queried one.
Zero stale/deleted, zero truncation, zero other.

**Ruled out, with reasons:**

- **Replica lag — cannot cause this.** Both sides of the comparison arrive in one cvms HTTP response,
  so the monolith's `ReplicaService.use` is irrelevant to the divergence. This was the hypothesis
  most damaging to `.compact` and it is dead for this path.
- **Truncation — cannot cause this silently.** `items_query_result_forced_limit_engine.ts:29-48` sets
  `LIMIT_ACTION.FAIL` and `items_query_result_limit_engine.ts:180-189` throws `LimitError` rather
  than slicing. (Latent hazard noted: a caller passing `limitConfig` with target `LINKED_ITEMS` and a
  non-FAIL action would slice ids at `:150-167` *before* the fetch while `linkedPulseIds` is rebuilt
  un-sliced. Not this path.)
- **`excludeBoardId`, `alreadyFetchedItems`** — verified not on this path.

Still live in code but unobserved: a **state filter on the linked side only**
(`linked_items_resource_service.ts:27`, `state: withNonActiveItems ? undefined : STATE.RUNNING`; the
monolith never sets `withNonActiveItems`), and a **missing cv item-store row** for a live graph
relation. The second variant would be **transient**.

### Recovery measurement — `.compact` is correct for the whole failing population

The question that gated this fix was not "does the fallback succeed" but **"does it recover ids that
were absent from `subitems_by_id`"**. Four-way classification, caller-scoped
(`monday-agents` / `get_board_items_page`, 33h). **201 traces hit the nil and fell back; 79 carried an
`INTERNAL_SERVER_ERROR`, 122 did not.**

| outcome | count | basis |
|---|---|---|
| #1 fallback raised | **0 — reattributed** | the fallback succeeds; the 403 is one hop later in `ColumnValuesLoader` |
| #2 returned nil/empty | 0 of the 79; unknown among the 122 | a 403 on the recovered ids requires a non-empty result |
| #3 returned non-empty | ≥ 79 | 22 subitem ids in the 403 request body |
| **#4 recovered ≥1 absent id** | **≥ 79** | those 22 ids cannot have come from `subitems_by_id` — board 18422902282 was never in `connectedBoards` |

Outcome #4 is the decisive cell and it is populated: the 403's request body carries
`callerAction: column_values_loader_query_column_values`, `board_id: 18422902282` and 22 ids
(`12856138164, 12856182652, … 13024143264`). Since that board never entered `connectedBoards`, none of
those ids could have been keys in `subitems_by_id` — so the fallback genuinely recovered data the
primary path had dropped. (This last step is forced by the code, not directly observed.)

**But recovery here is unserviceable.** Every recovered id lives on a board the platform refuses to
read: `ColumnValuesLoader` immediately asks for their column values and gets 403. So for the measured
failing population, "recovery" produces a 500 microseconds later, and `.compact` — which skips the
fallback entirely and returns the parent with fewer subitems — is the only path that yields a 200.

**Verdict: `.compact` is correct for the entire measured failing population; undecided only for the
122 traces that returned 200.** For those, neither the fallback result nor `subitems_by_id`'s key set
is logged, so outcome #4 is **not decidable from existing telemetry**. Platform-wide the same signature
appears on 93 traces / 14 (account, board) pairs.

This supersedes the previous revision's "should not ship" verdict, which rested on my inference that
the ~83.7k platform-wide nil traces recover legitimate data. The caller-scoped nil→fallback population
is **201, not 83.7k** — the larger figure counts all callers and all shapes. The blast-radius concern
still stands for the non-500 population, because `query_service.rb` is shared code, but it is now a
bounded question with a measurement rather than a blocker.

### Instrumentation to close the remaining 122

Count-only, no item ids. In `query_service.rb`: probe between `:204`/`:205` accumulating
`primary_linked_total` and `primary_missing` (`subitems.count(&:nil?)`); probe after `:237` computing
`primary_available = !subitems_by_id.nil?`, `fallback_count = Array(subitems).size`,
`recovered_count = (Array(subitems).map(&:child_id) - subitems_by_id.keys).size`. One log line,
`tag: "subitems_fallback_recovery"`, plus
`Observability::Metric.increment("query_subitems.fallback_recovery", tags: { recovered:, primary_available: })`
= 4 series. ~2.5k events/h, affordable at 100%.

```
source logs
| filter $d.tag:string == 'subitems_fallback_recovery'
| create bucket from if($d.primary_available:bool == false, 'primary_unavailable',
    if($d.fallback_count:number == 0, 'o2_empty',
      if($d.recovered_count:number > 0, 'o4_recovered', 'o3_nonempty_no_recovery')))
| countby bucket
```

Decision rule: `o4_recovered ≈ 0` among 200s ⇒ `.compact` loses nothing served today, ship as-is.
`o4_recovered > 0` among 200s ⇒ pair `.compact` with an explicit fallback trigger instead of a silent
drop.

### Permission-disclosure claim — WITHDRAWN

An earlier revision claimed the parent's column value discloses ids of subitems the caller cannot see.
**That does not reach the agent through this tool.** Verified end-to-end:

- the toolkit pins `API-Version: 2026-10` (`agent-toolkit/dist/esm/core/index.js`, `D="2026-10"`);
- from **2025-04** the monolith hard-codes `value` to `nil` for subtasks / board-relation / dependency
  columns (`column_value.rb:977-987`, `:229-244`, `:484-495`; gate at
  `graphql_version_constants.rb:22`), so the LLM sees `column_values["<subitems_col>"] = null`;
- `ItemDataFragment` never selects `subitems_ids` / `linked_item_ids`;
- `subitems` resolves through `ItemSubitemsLoader` (`resolvers/item_subitems.rb:3,16`), so only
  permitted items survive.

Downgraded to an **internal-consistency defect** in column-values: `linkedPulseIds`
(`enrich_column_value.ts:7-12`, unfiltered graph relations) advertises ids `linked_pulses`
(`board_data_serializer.v2.ts:50-76`, permission-filtered) will not contain, forcing every consumer to
nil-guard. Still worth filing against column-values — it is the upstream cause of Fix 1 — but not as a
security issue.

Two adjacent items are **pre-existing, on the public API, and neither caused nor fixed by `.compact`**;
they belong in a separate ticket: `SubtasksValue.subitems_ids` (`column_value.rb:932-940`),
`BoardRelationValue.linked_item_ids` (`:185-192`) and the dependency equivalent (`:420-427`) map
`linkedPulseIds` verbatim with no IVP filter on all versions ≥ 2023-10 — already acknowledged in-repo
at `query_service.rb:398-412` ("bypasses IVP filter") — and versions 2023-10 … 2025-01 return the whole
enriched blob in `column_values.value`. No production trace was observed selecting those fields.

Confirmed in prod: 55 of 99 SUBITEMS-bucket errors (see window caveat #1), **plus 20 more in
ITEMIDS across 7 further accounts** — the same mechanism, re-confirmed independently on a different
account (parent board 18422902276 logs `subitems_on_query_query` / `undefined method 'child_id' for
nil`, then three cv 403s on board 18422902282). Class-wide that is **~75 calls / ~17%, the largest
recoverable cause.** Every occurrence emits a log line tagged `subitems_on_query_query`, which sizes
it without DB access.

**Change.** `get_subitems_recursively(subitems&.compact, ...)` at line 205.

Secondary, separate PR: narrow the line 213 `rescue` so a `NoMethodError` is not absorbed as a
fallback-worthy condition. Falling back on a *downstream* failure is reasonable; falling back on
our own nil-deref hides a bug and mislabels it 403. Needs a view on how much traffic legitimately
relies on that fallback.

**Unresolved:** `.compact` treats the symptom. Why an item-link row is missing for a linked pulse
is not explained. Worth knowing before assuming omission is always benign.

---

## Fix 2 — handle the missing workspace without crashing

**File:** `dapulse/app/services/authorization/logic/workspace_permissions/workspace_permissions_logic_service.rb:12-16`
(**not** the shared `get_workspace` helper at 134-141 — see below)

**Reasoning.** Cause A: the dominant cause of the class, and 100% of the PLAIN bucket. A board
whose `workspace_id` points at a missing `Workspace` row produces
`Resolvers::PaginatedBoardItems` → `column-values-webapiv2 /internal/query/query` →
`data-structure POST /v1/columns/board/bulk` → monolith
`POST /internal_ms/data_structure/board_and_columns_permissions` → **404**
`{"error":"Not Found","details":{"model":"Workspace","id":N}}`.

`get_workspace` calls `Workspace.get_entity_by_id_cached` **without `allow_nil: true`**, so
`redis_caching.rb:187` raises `ActiveRecord::RecordNotFound`. The guard
`return false unless workspace` at line 14 is therefore **unreachable dead code** — correct
handling was written and has never executed.

### Two corrections from review, both verified

The earlier revision proposed reusing the eager-loaded association and changing the shared helper.
Both were wrong:

1. **The association cannot be reused.** `board_and_columns_permissions` does eager-load
   `:workspace` (`data_structure_internal_controller.rb:122-145`), but
   `board_permissions_core_service.rb:469` calls
   `WorkspacePermissionsLogicService.is_subscribed_to_workspace(user, board.workspace_id)` —
   passing the **id**, not the board. The service never sees the association. The
   `association(:workspace).loaded?` pattern I cited at `board_permissions_core_service.rb:157-159`
   is a different method on a different path; it is not reachable convention here.
2. **Changing shared `get_workspace` to return nil is unsafe.** `get_user_role_ids:41-42` calls
   `get_workspace(...)` then immediately `workspace.is_owner?(user)` with **no nil guard**. A global
   nil-return converts today's `RecordNotFound` into a `NoMethodError on nil` at that site — a
   different crash, not a fix.

So the change must be **scoped to `is_subscribed_to_workspace`** (line 13), which already has the
nil guard at line 14, leaving the shared helper's raising contract intact for callers that depend
on it.

### Expected outcome — corrected

The earlier framing implied this removes the error. It does not:

- The orphan board becomes `authorized: false`.
- After Fix 4 is deployed, the tool result likely changes from `ResourceNotFoundException` / 404
  to `UserUnauthorizedException` / 403.
- **The board does not become readable.** This is "fail closed without crashing," not restored
  access.
- It avoids the downstream 404 and the monolith's one retry of the full CVMS request. Data-structure
  itself does not retry this 404.
- It prevents one orphan from aborting an entire `boardIds` permission batch.
- It affects agent authorization **across monday**, not just this tool.

`return false unless workspace` failing closed also means no data leak. I earlier claimed
`allow_nil` would "quietly return items" for orphaned boards; that was wrong and is recorded here
deliberately.

### The underlying data-integrity bug

Read-path handling does not clean up orphans. `workspace.rb:23` declares `has_many :boards` with
**no `dependent:`** and there is no FK, so a hard `workspace.destroy` leaves boards behind; both
save-time guards in `concerns/workspace_validations.rb:112-133` have their `errors.add`
**commented out**, so saving a board under a missing workspace only logs. `Workspace` has no
`default_scope` and no `acts_as_paranoid`, so soft-deleted workspaces still resolve — a
`RecordNotFound` means the row is genuinely absent or cross-account, not merely deleted.

Confirmed in prod: 48h — 794 raw `board_and_columns_permissions` 404 events / 23 accounts / 23
distinct `{model, id}` pairs, `model` always `Workspace`. These events must not be divided by six;
the caller-scoped trace cohort is the source for the ~308 user-visible calls / 33h estimate.
Persistent day over day: a small set of accounts with lasting corruption, not a transient.

**Change.** In `is_subscribed_to_workspace` only, fetch with `allow_nil: true` so the existing
line 14 guard executes. Leave `get_workspace`'s contract alone, or add a separate nil-safe variant.

---

## Fix 3 — let cursor-generated pseudo-columns validate on the subitems board

**File:** `column_values/src/services/external_data/enrich_data/validate_allowed_columns.ts:42`

**Reasoning.** Cause B. The rejected column is always `__item_id__`, an internal pseudo-column,
and the board it is reported against is **never the queried board** (7/7 traces; ids numerically
adjacent to the parent, the signature of a subitems board).

`getMissingColumnsPerBoard` pushes `STATIC_COLUMN_IDS` only for boards **present in**
`allowedColumnsPerBoard` (line 22). Line 42 computes
`_.difference(queryColumnsPerBoard[boardId], allowedColumnIdsPerBoard[boardId] || [])`.

Extra board keys arrive from `extractColumnIdsFromFilter`, keyed by `rule.context.boardId`, while
`allowedColumnsPerBoard` only ever holds the parent board plus `connectedBoards`. A subitems board
appearing in the filter gets an **empty** allow-list, so its `__item_id__` is classified as a
permission violation → `NotPermittedError` → 500.

Fires only on cursor continuations (`fetch.start > 0`), because only then is the per-board
`__item_id__ IN (...)` filter materialized from the stored cursor — which is why it is
**confined to the CURSOR bucket**. (An earlier revision said "ITEMIDS and CURSOR"; ITEMIDS
attribution later returned B = 0 of 207, so that was wrong.)
`ParentIdsFetcher.getPrepareResult` (`parent-ids-fetcher.ts:159`) forces
`STRICT_MODE.STRICT` so validation always runs here; the ivp-prefilter path passes `nonStrict` and
is unaffected.

### Scope correction from review

The earlier proposal — `|| []` → `|| STATIC_COLUMN_IDS` — is **too broad, and I withdraw it**.
`STATIC_COLUMN_IDS` is ten ids, verified in
`@mondaydotcomorg/board-columns/dist/constants/board-columns-constants.js:72`:
`PULSE_ID`, `GROUP`, `BOARD`, `STATIC_SUBITEMS`, `STATIC_GROUP`, `STATIC_BOARD`,
`STATIC_CREATION_LOG`, `STATIC_LAST_UPDATED`, `STATIC_POSITION`, `STATIC_EMPTY`. That fallback
would permit all ten for **every unknown board key**, in validation shared by all CVMS callers.
Line 22 already grants all ten to every *known* board, so this extends an existing grant rather
than inventing one — but nothing in the code establishes that the extension is safe, and that is
the bar.

**Better change than either option raised in review:** `options.subitemsBoardId` is *already
passed into this function* (line 26) and forwarded to `_extractColumnIdsForQuery`. The subitems
board is not unknown — it is known and simply omitted from allow-list construction. So include
`subitemsBoardId` when building `allowedColumnIdsPerBoard`, which fixes the actual defect (the
board is missing from the allow-list) rather than weakening the fallback for arbitrary boards.

Needs a test for the absent-board-key case; none exists, which is how this survived.

Prod (**platform-wide** on the pages endpoint, not monday-agents): 9,841 traces / 230 accounts /
259 users over 7d. Event count omitted deliberately — it is ~15x amplified.

**Caller-scoped volume is much smaller than previously implied: ~39 calls, ~9% of the class,
confined entirely to the CURSOR bucket.** ITEMIDS attribution returned **B = 0 of 207**, and the
reason is structural rather than a sampling accident: ITEMIDS builds its `__item_id__` rule in the
monolith at `paginated_board_items.rb:211-217` (or `filter_rules_service.rb:281-287`), gated on
`query_params.ids` and contexted on the **main** board — which validates precisely because
`__item_id__` is in `STATIC_COLUMN_IDS`. Cause B requires the rule contexted on `subitemsBoardId`,
which only cursor continuations synthesize, inside column-values at
`execute_cursor_query.ts:210-216` and `:246-256`. The monolith stores only six cursor fields
(`item_link_cursor_service.rb:32`) and sends only `pages` + `queryResponseId` on continuation
(`query_service.rb:484-489`), so it builds no filter at all on that path.

This independently confirms the proposed fix: the subitems board is *known* and simply omitted from
allow-list construction, which is exactly the defect. ITEMIDS and CURSOR are also **disjoint
populations** in the data (`itemIds` rows carry no `cursor` and vice versa), so cause B is not split
across buckets and ~39 is the true caller-scoped figure.

---

## Fix 4 — classify the downstream 404 instead of returning a generic 500

**Files (corrected — verified against the branch diff):**
`dapulse/app/graphql/services/paginated_items_query_service.rb` (+3) and
`dapulse/app/graphql/base_graphql_function.rb`.

An earlier revision named `column_values_internal_ms_request_service.rb:173-183` as the fix site.
That was **wrong** — it is untouched by the branch. `git diff origin/master --stat -- 'app/**'`
shows the change lives in `paginated_items_query_service.rb`, i.e. one layer up from the internal-MS
request service, at the GraphQL service that calls it.

**Merged** to `origin/master` as commit `d65b3506852` via
[dapulse PR #114427](https://github.com/DaPulse/dapulse/pull/114427) on 2026-09-16. Deployment
status was not verified in this investigation.

**Reasoning.** Fixes 1 and 3 remove causes; this one fixes classification and covers future
downstream 404s too.

The 404 **status survives** to the monolith. What is lost is the mapping.
`InternalMsHttpRequestService:312` raises
`CustomExceptions::HttpErrorException.new("Internal Request Error in #{service} - #{code}", code, response&.headers)`
— status preserved, **body dropped** (third arg is headers). `app/graphql/base_graphql_function.rb`
has **no `when CustomExceptions::HttpErrorException`** clause (grepped: zero hits), so it hits the
catch-all `else e` → `INTERNAL_SERVER_ERROR`.

### Actual client contract — corrected

The earlier title claimed this returns `NOT_FOUND`. **It does not.** The toolkit preserves the
GraphQL code unchanged and the MCP error layer does not normalize. What the client sees:

- Code: `ResourceNotFoundException`
- Embedded status: 404
- Message: `Resource not found`
- Data: the queried `board_id`. **No workspace details.**

It also makes **no call succeed** — it replaces the generic 500, after the monolith's internal
retry is exhausted, with a more terminal-looking error. This is worth doing on its own (a 500
invites the agent to retry something that can never succeed) but is not a functional fix. It maps
**every CVMS 404 on the initial page**, not only missing-workspace failures.

NOT_FOUND-shaped classification is still the honest answer: the board is genuinely unusable and
`board_insights` already returns not-found for the same board. I argued the opposite earlier —
that the board exists so this would mislead — and that was wrong.

**Consequence neither the doc nor the review noted:** this merges the traffic into the
`ResourceNotFoundException` class, which is exactly the class `get-board-items-page-rnf-fixes.md`
investigates (4,500 events / 826 accounts, 7d). At ~308 calls / 33h this is not a rounding error
against that bucket — it will visibly inflate it and corrupt the attribution work already done
there.

The merged change has **no distinct `error_data` marker** identifying the downstream-404 origin.
After deployment this traffic will inflate the `ResourceNotFoundException` class and must be kept
separate in future attribution. Adding a stable origin marker remains follow-up work.

The rescue is correctly **scoped to this call site** rather than a blanket `when` clause:
`HttpErrorException` carries only status and headers, no service identity, so a global mapping would
convert unrelated services' 404s for end users.

---

## Fix 5 — coerce `startDate` before arithmetic in the duration column

**File:** `dapulse/app/services/column_types/duration_column.rb:51`

**Reasoning.** Found during ITEMIDS attribution. The exception is confirmed; the fix is **not** a
safe one-liner.

Line 51 computes `Time.now.getutc.to_i - value[:startDate]` with no coercion on `startDate`. When
`startDate` arrives as a String the monolith raises `TypeError: String can't be coerced into
Integer`, cosmo reports `Failed to fetch from Subgraph 'monolith-v2026-10'`, and the tool 500s.

Reached from `app/graphql/types/column_value.rb:1074` (`Types::TimeTrackingValueType#duration`) ←
`:1093` (`#text`). Backtrace read from the log; the code line read in the repo.

*Correction to an earlier revision:* I described line 53 as "the same guard one line over". It is
not — line 53 is `value[:duration].to_i` in the `else` branch, a **different key on a different
path**. There is no neighbouring guard on `startDate`, so the Fix 1 analogy does not hold.

**Why `.to_i` alone is the wrong fix.** `"abc".to_i` is `0`, so a malformed string silently becomes
epoch 0 and yields a duration of ~56 years rather than an error. That trades a visible 500 for
plausible-looking garbage in a user-facing field.

**The validation gap is already visible in code.** `valid_value?` (line 148) never requires
`startDate` to be numeric — it only rejects `== 0` (line 164) and `nil`-while-running (line 165),
both of which a String passes. The contrast is in the same method: line 159 *does* enforce
`value[:now].is_a?(Numeric)` for the `toggled` path. So the type discipline exists for one field and
is simply absent for this one. The producer of the String is still unknown, but the gap does not
depend on identifying it.

**Change.** Prefer tightening `valid_value?` to require `startDate.is_a?(Numeric)` (mirroring line
159) over coercing at the arithmetic site. If a read-path guard is also wanted, it must handle
non-numeric strings explicitly rather than via `.to_i`.

Confirmed in prod: 2 calls / 1 account (33836066) / 12 monolith error spans in the 33h window.
Traces `becea4587abd860184fb1c81cf0c6662`, `9c61fa37ddd1102595786ba91532b2bb`. Lowest priority here
by volume; one account only, consistent with account-specific bad data.

---

## Optional — carry the 404 details through

**File:** `column_values/src/middlewares/error_mapper_middleware.ts`

**This section was materially wrong in the earlier revision and is rewritten.** Verified state:

- The helper I described (`getDownstreamNotFoundResponse`) **is not on master.** It exists only in
  uncommitted local changes in `/Users/stassh/Development/column_values` (branch `master`, dirty).
- That work is **7 files, ~142 insertions**, not "two tokens": body capture, a new exception type,
  worker-thread serialization, middleware handling, and tests — `error_mapper_middleware.ts`,
  `error_mapper_middleware.test.ts`, `ThreadPoolService.ts`, `initWorker.ts`, `errors_utils.ts`,
  `request_utils.ts`, `request_utils.test.ts`.
- The local **tests expect `additionalInfo`**, while the earlier revision asserted the production
  payload nests under `errorResponse`. I have not verified the production payload shape. **Treat
  the key name as unresolved**, not confirmed.

Prior art, correctly referenced: **`DaPulse/column_values` PR #4749** ("propagate query errors")
attacked this gap far more broadly — a `QueryMsError` class plus encoding across the worker
thread-pool boundary, behind `ENABLE_THREAD_ERROR_ENCODING` — and was **reverted** by PR #4770
(merged 2026-02-22). The revert body states no reason, only
`monday.monday.com/boards/9782859818/.../pulses/10776353457`. Read that before redoing any of it —
the local WIP substantially recreates what was reverted, which raises the stakes on knowing why.

Qodo's automated review **of the revert** flagged this consequence ("Query-MS status dropped",
"Worker errors lose details") and suggested preserving status in `errorMapperMiddleware` rather
than reinstating the encoding scheme.

**Change.** Undetermined pending the payload-shape question and the revert reason. Details also
require the Ruby side to carry `parsed_response` into `HttpErrorException`.

---

## Open questions

- ~~ITEMIDS has no fresh attribution.~~ **Resolved: A 89.5%, C 9.6%, B 0%.** Ranking now settled.
- ~~Why is an item-link row missing?~~ **Resolved: 20/20 permission-filtered** (unauthorized subitems
  board stripped by data-structure, never entering `connectedBoards`). Replica lag and truncation
  ruled out by code.
- ~~Did all 20 cause-C calls use `includeSubItems:true`?~~ **Resolved: 20/20 yes**, and zero cause-C
  calls without the flag. No second trigger path; `includeSubItems` is necessary but not sufficient
  (17 of the 37 flagged calls failed for cause A instead). The correct marginal is **37 of 209**, not
  the 27 previously reported.
- ~~Do the non-500 fallback executions return non-empty subitems?~~ **Partly resolved.** Outcome #4 is
  ≥79 among the failing traces and every recovered id is unserviceable. Still open for the **122
  caller-scoped traces that returned 200** — undecidable from existing telemetry; needs the count-only
  probe. This is the last question gating Fix 1, and it is now a bounded one.
- ~~Did the fallback raise?~~ **Resolved: no, outcome #1 = 0.** It succeeds; the 403 comes from
  `ColumnValuesLoader` (`column_values_loader.rb:45`) one hop later. Earlier revisions of this doc said
  the fallback 403s — that was wrong.
- ~~Do unauthorized `linkedPulseIds` reach the tool response?~~ **Resolved: no.** See "Permission-
  disclosure claim — WITHDRAWN" under Fix 1. Two adjacent public-API items to file separately.
- **Is `denied_board` actually the subitems board of `queried_board`?** Follows from the fallback path
  (`query_service.rb:234` → `subtasks_column_service.rb:268-269`) and from `handleSubitemsBoard`, but
  a `Board.find(18422902282).parent_board_id` check would settle it. No DB access.
- ~~Were the primary and fallback calls denied on the same board?~~ **Resolved by the ordered log
  timeline** of trace `91c36585cc0abdedbd05f3c14ec03c7f`: three nil→fallback→403 cycles, all on board
  18422902282, all with `callerAction: column_values_loader_query_column_values`.
- **Cross-store lag** between the graph-relations store and the cv item store — the one variant that
  would make omission transient. Not measurable from these repos.
- **Re-measure the five non-ITEMIDS buckets in a single window** if precise shares are needed. The
  current class-wide table mixes a 31.5h and a 33h window; fine for ranking, not for reporting exact
  percentages.
- **Why is `startDate` ever a String** (Fix 5)? One account only, so likely account-specific data.
- **Production payload shape** for the 404 body: `additionalInfo` or `errorResponse`?
- **Why was #4749 reverted?** Blocks the optional work.
- **Is board 5098600762 the subitems board of 5098590118?** Consistent but unconfirmed; needs
  `Board.find(5098600762).parent_board_id`.
- **Per-account blast radius of cause C**; `subitems_on_query_query` log volume is the cheap proxy.
- **Two read-only rows for cause A**, to separate "absent" from "cross-account" and see whether the
  board is itself `state=deleted` (needs a Redash key for the EU replica):
  `SELECT id, account_id, state FROM workspaces WHERE id = 6252231;`
  `SELECT id, account_id, workspace_id, state FROM boards WHERE id = 5095400354;`
- **Which flow hard-destroys a workspace with boards under it.** The commented-out validations in
  `workspace_validations.rb` log on every such save — that log is the entry point.

## Not included

- **Anything about rate limits.** Measured to zero here. `data_structure_http_request_service.rb:7-20`
  looks like a rate-limit circuit breaker but is dead code: real 429s carry
  `"Internal Request Error in data_structure - 429"`, the only setter is gated on the string
  `"too many requests error in data_structure"`, and `BoardDataStructureRequestStore` is
  per-request so it cannot latch across sessions. Noted so nobody re-derives it as a cause.
- **Data-structure retrying the workspace 404** — disproved. `fetchChunk` supplies a retry predicate
  that ultimately retries transport errors and responses with status >= 500, not 404. The actual
  retry is one layer later: the monolith retries the propagated CVMS 404 once because
  `internal_ms_non_retryable_http_codes` is undefined in production. Fix 2 removes that second CVMS
  execution. A per-board rescue in `board_and_columns_permissions` would also stop one orphan
  aborting a whole batch — resilience work, not a cause.
- **Gateway `"Unknown error"` message loss** — covered as Fix 5 in the RNF doc.
- **`no_operator_config` invalid rules** — already `InvalidArgumentException`, so out of this class.
  Belongs with that investigation (726 events / 199 accounts, 7d), which has its own real gap: the
  tool schema never documents legal operators per column type.
