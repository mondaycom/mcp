# Agents pick filter operators the column type does not accept

> **Method:** Coralogix DataPrime over `platform-mcp-gateway`, plus source reading in `data-core`.
> Index: [README.md](README.md). Note: this file was written without the `investigate-tool-errors`
> skill, so it has not been through that skill's check list — the claims table below is the
> substitute, not a replacement.

Investigated 2026-09-16. Data window 2026-09-14T07:00 → 2026-09-16T07:31 UTC, prod,
`operation_name = get_board_items_page`.

## The error

`InvalidArgumentException`. Every instance carries the same body:

```
one of the rules was invalid - {"operator":"CONTAINS_TEXT","reason":"no_operator_config"}
```

**680 failures, 318 distinct users.** Long tail — 227 users failed exactly once, top 45 users are
53% of volume.

`get_board_info`, `update_items` and `change_item_column_values` produced **zero**
`InvalidArgumentException` in the same window. This is a `get_board_items_page` problem.

## Why it happens

The platform resolves a `(columnType, operator, compareAttribute)` triple against an operator
registry. If the lookup misses, the rule is rejected. We forward the agent's rules unvalidated, so
the agent finds out at runtime.

### The finding that reframed the fix: they had already read the guidelines

~62% of failures come from users who had called `get_column_type_info` in the window.

| | users | failures |
|---|---|---|
| called `get_column_type_info` | 27 (60%) | 223 (62%) |
| never called it | 18 (40%) | 137 (38%) |

So this is **not** primarily an enforcement problem, and the fix is not "make the precondition
harder". The guidelines they read were incomplete.

The two largest consulting users asked about the **right** column type and still failed:

| user | failures | consulted | then failed on |
|---|---|---|---|
| `91922236` | 36 | `date` guidelines ×14 | `date_mkwkqdxp` + `between` ×22 |
| `4358630` | 9 | `timeline` guidelines ×4 | `timeline36` + `between` / `within_the_next` |
| `106098718` | 35 | `item_id`, `people`, `text` | `pulse_id_mm3ysc35` + `contains_text` ×15 |
| `90195563` | 33 | `fetchMode:"schema"` only | `__creation_log__` + `within_the_last` ×11 |
| `110982547` | 69 | none | `location_*` + `contains_text`, ~15 boards in 8s |

Three distinct modes among callers: right type but the guidance omitted the rule (`91922236`,
`4358630`), a near-miss type name (`item_id` consulted, column is `pulse_id`), and the wrong
`fetchMode`.

`91922236` was observed cycling `compare_attribute` through `date` → `actual_date` → `EXACT_DATE`
→ `EXACT`, all rejected — because on a `date` column it must be **absent entirely**. That rule was
documented nowhere. This is the single tightest causal chain in the investigation: a user did
everything we asked and our own text could not have told them the answer.

### Rejected operators, all 680

| operator | count | share |
|---|---|---|
| `CONTAINS_TEXT` | 252 | 37% |
| `BETWEEN` + variants | 144 | 21% |
| `WITHIN_THE_NEXT` | 58 | 9% |
| `WITHIN_THE_LAST` | 54 | 8% |
| `GREATER_THAN` | 36 | 5% |
| `GREATER_THAN_OR_EQUALS` | 31 | 5% |
| `LOWER_THAN` / `LOWER_THAN_OR_EQUAL` | 26 | 4% |
| `ANY_OF` | 8 | 1% |
| `ENDS_WITH` | 6 | 1% |
| unparsed | 61 | 9% |

The `CONTAINS_TEXT` mass is concentrated on column types that returned **`null`** guidelines.

### 13 of 42 column types had any filter guidance at all

`filteringGuidelinesByColumnType` had 13 keys. `buildFilterGuidelinesForColumnType` returned `null`
for everything else, and the schema advertised that as normal — *"null if that type has no
documented rules"*. So the agent calls the tool, gets `null`, and guesses.

Every column type behind the `CONTAINS_TEXT` bucket — `timeline`, `location`, `board_relation`,
`subtasks`, `hour`, `dropdown`, `mirror`, `formula` — was in the null set.

### `fetchMode` leaks half the traffic

Of 38,134 `get_column_type_info` calls in 48h: `guidelines` 16,689 (44%), another explicit mode
(mostly `schema`) 18,956 (50%), omitted 2,489 (6%). **56% never request filter guidelines.**

Also visible: arg drift — models send `typeName`, `type`, `column_type` instead of `columnType`, and
one `fetchMode:"write_schema"`.

This also disproves a concern raised from `monday-agents-platform`
(`monday-mcp-client/error-handler.ts:90-92`) that `get_column_type_info` is `always_deferred` and
therefore not attached to the model. 38,134 calls say it is reachable, so guidelines edits do land.

## Where the truth actually lives

Not in dapulse, and not in this repo. In **`data-core`**, package
`@mondaydotcomorg/board-columns`, which dapulse consumes at `package.json:199` and monday-db-query
at `package.json:42`.

Resolution is `ruleBasedFiltersSupportedOperators(context, dataLayer)`
(`base-column-rule-based-filter-service.js:100-118`): merge the `generic` group + per-type
`additionalOperatorGroupTypes` + the column's own operator configs, then subtract
`unsupportedOperatorTypes` and `getDeprecatedOperators`.

Two facts from reading it that changed the fix:

**The `generic` group is tiny.** `filter-config-operator/generic/` contains only `any_of`,
`not_any_of`, `equals`, `not_equals`, `is_empty`, `is_not_empty`. **`contains_text` is not generic**
— it lives in the `textual` group. So a column type gets text operators only if it explicitly opts
in. Most do not.

**`primitive` is `is_empty` + `is_not_empty` only.** Any type whose only addition is `primitive`,
and which removes `any_of`/`not_any_of`, is left with just the two emptiness operators.

Resolved sets for the four types this change documents:

| type | resolution | result |
|---|---|---|
| `location` | generic − [EQUALS, NOT_EQUALS, ANY_OF, NOT_ANY_OF] + primitive | **`is_empty`, `is_not_empty` only** |
| `subtasks` | generic − [EQUALS, NOT_EQUALS, ANY_OF, NOT_ANY_OF] | **`is_empty`, `is_not_empty` only** |
| `board_relation` | generic + textual − [EQUALS, NOT_EQUALS, ENDS_WITH_TEXT] | `any_of`, `not_any_of`, `contains_text`, `not_contains_text`, `starts_with_text`, `is_empty`, `is_not_empty` |
| `timeline` | generic + timeline configs − [EQUALS, NOT_EQUALS] | plain: `any_of`, `not_any_of`, `is_empty`, `is_not_empty`. `START_DATE`/`END_DATE`-attributed: `between`, `greater_than`, `greater_than_or_equals`, `lower_than`, `lower_than_or_equal` |

`location` and `subtasks` supporting **only** emptiness operators is the important one: text
filtering those columns is not merely undocumented, it is impossible. That is where the 37%
`CONTAINS_TEXT` bucket goes to die.

`timeline` has **no** `within_the_last` / `within_the_next` operator files at all — so the 112
`WITHIN_THE_*` failures (17%) are partly agents reaching for a window operator on a column type
that has never had one.

## Retracted claim: removing `between` would have been a regression

An earlier pass on this file concluded that `between` was documented for formatting at
`column-filter-aggregation-guidelines.ts:132` but supported by no column type, and recommended
deleting it. **That was wrong.** `between` operator configs exist for exactly four types:

| type | form | compareAttribute |
|---|---|---|
| `date` | plain | must be **omitted** |
| `timeline` | attributed only | `START_DATE` or `END_DATE` |
| `creation_log` | attributed only | `CREATED_AT` |
| `last_updated` | attributed only | `UPDATED_AT` |

`date-column/date-column-filter-config-between-operator.js`,
`timeline-column/start-time/…-between-operator.js`, `…/end-time/…-between-operator.js`, plus the
pulse-log and pulse-updated equivalents. Registration confirmed at
`date-column-rule-based-filter-service.js:17` (plain `BETWEEN` in `OPERATOR_PREFERENCES`).

`compareValue` is a plain two item array `[startDate, endDate]`, per
`base/multi-date-base-filter-config-operator.js` (`settingsValueToCompareValue` returns
`[startDate, endDate]`; `getCompareValue` maps both through `parseDate`). **Not** `["EXACT", date]`,
and **not** two rules joined with `filtersOperator: "and"` — an earlier recommendation here also
proposed that rewrite, and it is wrong too.

**Not deprecated either.** `getDeprecatedOperators` (`base-column-rule-based-filter-service.js:54-65`)
keys off `context.columnType` only, is not account-scoped, and deprecates only `ENDS_WITH_TEXT`,
`EQUALS`, `NOT_EQUALS`. There is no flag. So bucket 2 is deterministic — the "works for some
accounts" theory is dead.

So the 21% `BETWEEN` bucket is a **shape** error on a real operator, not use of a phantom one. Both
sampled payloads are genuinely malformed:

- `{columnId:"cronograma", operator:"between", compareValue:["2026-09-01","2026-11-15"]}` — on a
  timeline column there is no plain `BETWEEN` config, only attributed ones. Missing
  `compareAttribute` → lookup miss. The identical payload on a `date` column would have succeeded.
- `{operator:"between", compareValue:"2026-09-15", compareAttribute:"EXACT"}` — `EXACT` is not in
  `compareAttributeMapping` (`timeline-column-rule-based-filter-service.js:14-17` accepts only
  `START_DATE`/`END_DATE`), and a scalar was sent where a two item array is required.

### Which of the three hand-written copies was wrong

There are three hand-maintained descriptions of these rules and none reads the registry:

| location | verdict |
|---|---|
| `monday-agents-platform/.../monday-mcp-client/error-handler.ts:93` | **correct** — "a date range on timeline is `between` WITH compareAttribute `START_DATE`/`END_DATE`" matches the registry exactly |
| `monday-agents-platform/.../mcp-tool-enhancements.ts:66` | third copy, not audited in detail |
| this repo's `column-filter-aggregation-guidelines.ts` | **wrong** — documented `between`'s formatting but listed it under no type, and never stated the compareAttribute rule for `date` or `timeline` |

The copy I initially flagged as suspect was the correct one. Worth remembering next time: the
registry is the arbiter, not whichever copy is closest to hand.

## Fix

Shipped in PR #491 — **guidelines content only**, no code path changes.

1. **`date`** — added the missing `between`, `greater_than_or_equals`, `lower_than_or_equal`,
   `is_empty`, `is_not_empty`, and stated that a date column takes **no** `compareAttribute` for any
   operator. Added ❌ examples for `compareAttribute: "EXACT"` and `"START_DATE"` specifically,
   because those are the exact strings production agents cycled through.
2. **`timeline`** (new) — the attributed operators and their required `compareAttribute`, plus
   explicit ❌ for `contains_text`, `within_the_next` and a bare `between` with no attribute.
3. **`location`** (new) — only `is_empty` / `is_not_empty`, and an explicit statement that there is
   no way to filter by text, city, address or coordinates, with the suggested alternative.
4. **`subtasks`** (new) — only `is_empty` / `is_not_empty`, pointing at querying the subitems board
   directly.
5. **`board_relation`** (new) — id and text operators, minus `ends_with_text`.
6. **Shared operator section** — names the four types that accept `between` and their attribute
   rule, and states that an unlisted operator is rejected.

`greater_than_or_equals` / `lower_than_or_equal` on `date` were outside the agreed scope but are 57
failures (8%) and were missing from a list this change was already correcting, so they went in.

### Why content and not server-side coercion

An earlier plan here proposed a coercion table in `executeInternal` — rewrite `contains_text` on a
status column to `contains_terms`, expand `between` into two rules, drop stray attributes. Not done,
for three reasons:

- The largest coercion in that table (`between` → two rules) was based on the retracted claim and
  would have produced a worse query than the input.
- `supportedOperators` takes `(context, dataLayer)`. Allowed operators are **not static per type**:
  `lookup`/`rollup`/`mirror` re-dispatch to the mirrored column's service and `formula` depends on
  return type. Any table we hand-maintain here is wrong for exactly the types most likely to be
  filtered wrong.
- For `location` and `subtasks` there is nothing to coerce *to*. The honest answer is "this column
  cannot be filtered that way", which is a documentation job.

### Why not just change the `fetchMode` default

Considered and rejected. Defaulting `fetchMode` to `guidelines` would silently hand guidelines to
callers who omitted it and needed the write schema, and it only reaches the 6% who omit — the other
50% explicitly ask for `schema` and probably want it. The non-breaking version is to include filter
guidelines in **every** response alongside whatever `fetchMode` asked for, at a cost in response
size. Left out of PR #491, unresolved.

## Claims checked before shipping

| claim | verdict | evidence |
|---|---|---|
| `between` is supported on no column type | **false, retracted** | configs exist for date, timeline, creation_log, last_updated |
| `between` compareValue is `["EXACT", d1, d2]` | **false** | `multi-date-base-filter-config-operator.js` → `[startDate, endDate]` |
| a date range should be two rules + `filtersOperator: and` | **false, retracted** | single `between` rule is the registry's form |
| `between` may be account-scoped / deprecated | **false** | `getDeprecatedOperators` keys off columnType only, no flag |
| `contains_text` is in the generic operator group | **false** | `generic/` holds 6 operators, none textual |
| `location` supports only is_empty/is_not_empty | true | generic − [ANY_OF, NOT_ANY_OF, EQUALS, NOT_EQUALS] + primitive |
| `timeline` supports `within_the_next` | **false** | no within operator files under `timeline-column/` |
| `get_column_type_info` is `always_deferred`, so unreachable | **false** | 38,134 calls in 48h |
| enforcement is the main gap | **false** | 62% of failures came from users who had called it |

## Caveats

**Session grouping is unreliable.** `platform-mcp-gateway` logs have no `session_id` or
`conversation_id` — only per-call keys (`request_id`, `trace_id`, `span_id`, `args_hash`).
`openai_session` / `window_id` exist only for ChatGPT. So "did they call `get_column_type_info`
first" had to be grouped by `user_id` over the whole 48h window, which counts a call from an
unrelated conversation. **62% is an upper bound** — read it as "these users knew the tool exists",
not "they consulted it for this filter".

**One discarded measurement.** A first pass used a DataPrime `countby` that silently hit a 3,000 row
cap and produced "89% never called it" — the inverse of the real answer. True distinct
`get_column_type_info` callers were 12,030. Corrected numbers use explicit per-user OR filters,
chunked because DataPrime caps expression depth at 50.

**Nothing was verified live.** Unlike the `filter-guidelines-teach-bad-column-ids` work, no example
in PR #491 was run against a real board. Every claim is from source reading plus log payloads. The
`board_relation` entry is the least corroborated: it has no failures attributed to it in the sampled
680 and was written from the registry alone.

## Code references

`mcp`:

- `packages/agent-toolkit/src/core/tools/platform-api-tools/utils/column-filter-aggregation-guidelines.ts`
  — the file changed. `filterOperatorGuidelinesSection()` is the only part always included.
- `.../get-board-items-page-tool/get-board-items-page-tool.ts:212-217` — builds `queryParams.rules`
  with no pre-validation. `:180` already blocks the cursor-plus-params conflict, which is why that
  did not appear in the sample.
- `.../utils/error.utils.ts:38-46` — `rethrowWithContext` already destructures `error_data` from
  GraphQL extensions and appends it to the model-visible message. Nothing to change here.

`data-core` (`packages/board-columns/src`):

- `filters/rule-engine/filter-rules/board-column-filter-rule-service.js:107-111` — sets
  `reason = 'no_operator_config'`. `supportedOperators()` is on the same class at `:81-89`.
- `filters/rule-engine/rule-engine-pulse-matcher-service.js:117` — throws; the message *is* the
  serialized `debugInfo`.
- `services/filters/rule-base-filter/base-column-rule-based-filter-service.js:100-118` — merge and
  subtract. `:54-65` deprecated operators.
- `services/filters/rule-base-filter/rule-based-filter-service-require-map.js` — 39 column types,
  with a base-service fallback so nothing is uncovered.
- `filters/rule-engine/filter-rule-config/board-column/filter-config-operator/` — `generic/`,
  `primitive/`, `shared/` (textual), and per-type dirs.

`dapulse`:

- `app/graphql/services/paginated_items_query_service.rb:48-53` — catches
  `"one of the rules was invalid"` and re-raises `InvalidArgumentException.new(e.message, 200)`.
  `e.message` passes verbatim.
- `app/graphql/graphql_custom_exceptions.rb:12-25` — 3rd arg `error_data` becomes
  `extensions[:error_data]`.

## Next steps

The documentation fix cannot cover 39 column types by hand, and will drift. The durable fix is to
propagate the operator list the platform already computed.

1. **`data-core`, one line.** At `board-column-filter-rule-service.js:107-111`, set
   `debugInfo['supported_operators'] = this.supportedOperators(context, dataLayer)`.
   `supportedOperators` is already on `this`, 20 lines above. Because the thrown message is just
   `JSON.stringify(debugInfo)`, this needs no contract change anywhere.
2. **`dapulse`.** Pass the parsed `debugInfo` as the 3rd arg at
   `paginated_items_query_service.rb:50` so it lands in `extensions.error_data`. Follow the existing
   convention — `InvalidBoardIdException` → `{board_id:}` (`graphql_custom_exceptions.rb:48-52`),
   `ResourceNotFoundException` (`:59`), `InvalidColumnTypeException`
   (`filter_validator.rb:34-37`). Do not invent a new field.
3. Then **delete** the hand-written guesses in `error-handler.ts:79-94` and
   `mcp-tool-enhancements.ts:66`. Once the payload is truthful, three divergent copies are pure
   drift risk.
4. Cheap follow-on: `isValid` already separates `no_operator` / `compare_value_invalid` /
   `context_invalid` (`:100-127`). We only ever pattern-match `no_operator_config`, so
   compare-value-shape failures are currently invisible in our dashboards.
5. Longer term, prevention rather than correction: expose `supported_operators` per column on the
   GraphQL type so `get_board_info` can hydrate it up front. Needs a platform-api owner.

**Re-measure before writing any of the coercion code.** This investigation retracted three claims
under source reading, and the documentation change in PR #491 addresses the two largest buckets
(37% `CONTAINS_TEXT`, 21% `BETWEEN`) on its own. Read the effect first.
