# Our filter guidelines teach column ids that do not exist

> **Method:** use the `investigate-tool-errors` skill. Index: [README.md](README.md).

Investigated 2026-09-06. Data window: 2 days, caller `monday-agents`, `sourceType=internal`,
tool `get_board_items_page`.

## The error

`ResourceNotFoundException` — "Column not found".

## Why it happens

Two separate problems in `column-filter-aggregation-guidelines.ts`.

### 1. The examples use fake column ids, and agents copy them literally

Every example in the file uses the column **type name** as the `columnId`:

```
✅ Correct: {"columnId": "last_updated", "compareValue": ["TODAY"], "operator": "any_of", "compareAttribute": "UPDATED_AT"}
```

That is an example id, not a real one. But agents send it as-is. We found a request that copies
that line character for character and fails (see below).

For last-updated it is worse than a placeholder — the API's real id for it is `__last_updated__`,
so the example is teaching an id that only works on boards that happen to have a literal
`last_updated` column.

### 2. The guidelines are only reachable if the agent already knows the column type

`filteringGuidelinesByColumnType` is read by exactly one caller,
`get-column-type-info-tool.ts:58`, keyed by the `columnType` the agent passes in.

So the agent has to already know the type to get advice about it.

**Correction (2026-09-07):** this section originally claimed that group / item id / creation log are
"unreachable no matter what we add to the map". That is wrong. `columnType` is
`z.nativeEnum(NonDeprecatedColumnType)`, derived from the generated `ColumnType` enum, and all four
are members of it — `graphql.ts:3877` `creation_log`, `:3886` `group`, `:3890` `item_id`,
`:3891` `last_updated`. So the entries *are* reachable.

The real gap is narrower, and it is discovery rather than reachability: `get_board_info` never lists
`creation_log` among a board's columns, so an agent asked to "sort newest first" has no reason to
look up a column type it does not know exists. Reachable is not the same as discoverable.

A second gap has no guidelines channel at all: `buildFilterGuidelinesForColumnType` returns text
titled "Filtering Guidelines" and nothing routes it to `orderBy`, which is where 752 of the 1,038
weekly errors are. That is why `orderBy[].columnId` has to carry its own mention.

## Re-measured 2026-09-07 — the placeholder theory is wrong, orderBy is the real driver

The failure counts below have no denominator, and adding it reverses conclusion 1. Over 7 days,
baseline error rate is **3.0%** for ordinary `filters[].columnId` and **2.3%** for `orderBy[].columnId`.

Bare type names that match an example in this file are **at or below baseline**, so they are not
copied placeholders — they are real ids. monday names the first column of a type after the type,
so `status` and `date` are genuinely correct most of the time:

| columnId | calls | errors | error rate | vs baseline |
|---|---|---|---|---|
| bare `status` | 3,535 | 51 | 1.4% | below |
| bare `date` | 790 | 13 | 1.6% | below |
| `name` | 2,210 | 0 | 0% | below |
| bare `numbers` / `checkbox` / `long_text` | 22 | 0 | 0% | below |
| bare `people` | 261 | 13 | 5.0% | slightly above, tiny volume |
| bare `email` | 82 | 7 | 8.5% | above, tiny volume |

(12h window for this table. `checkbox` and `people` examples already used a `column_id`
placeholder, so their traffic cannot have come from this file at all.)

Conclusion 1 as written — "agents copy the example ids literally" — is **not supported** for the
board-column types. It holds only for `last_updated`, where the id really is wrong.

The double-underscore ids are the whole cause, and `orderBy` carries most of it:

| columnId | calls | errors | error rate |
|---|---|---|---|
| `__creation_log__` (filters + orderBy) | 9,928 | 16 | 0.2% |
| `__last_updated__` (filters + orderBy) | 6,218 | 19 | 0.3% |
| bare `creation_log` | 1,931 | 513 | 26.6% |
| bare `last_updated` | 1,420 | 427 | 30.1% |
| bare `item_id` | 504 | 49 | 9.7% |
| `pulse_id` | 42 | 40 | 95.2% |

**752 of the 1,038 weekly errors are in `orderBy`, not `filters`** — "sort newest first" is the
common phrasing. `orderBy[].columnId` was described only as "The id of the column to order by",
documented nowhere else, and the original fix plan did not mention it.

The underscored forms are confirmed correct: 0.2–0.3% error over 16,000 calls.

### New, separate cause found: `__group__`

| columnId | calls/day | error rate | accounts |
|---|---|---|---|
| `group` | ~11,000 | 0.2% | many |
| `__group__` / `__group` / `__groupId__` | ~300 | 98% | 72 |

`group` is the one magic id with no underscores, and models over-generalise it. Flat for 8 days,
so it **predates** PR #481 and is not a regression from it. Documented as an explicit ❌ in the same
change, since any text saying "double underscores on both sides" makes this worse.

## The effect (original, failure counts only)

Failures where `columnId` is a bare type name matching an example in this file:

| columnId | failures |
|---|---|
| `last_updated` | 57 |
| `status` | 37 |
| `email` | 15 |
| `people` | 14 |
| `text` | 13 |
| `date` | 11 |
| `numbers` | 11 |
| `creation_log` | 10 |
| `name` | 5 |
| `checkbox` | 1 |
| **total** | **174** |

That is ~7% of `ResourceNotFound` on this tool.

Caveat: bare type-name ids are legitimate on many boards, because monday gives the first column
of a type the bare type name as its id. So not all 174 are copied from this file. `last_updated`
at 57 is the one we can be confident about, since the API id is `__last_updated__` and we have a
verbatim copy of our own example.

Good news: nobody sends the literal placeholder `column_id` used in the `checkbox` and `people`
examples — 0 occurrences.

## The API's real ids for these concepts

Three of the ids in the table are not board columns at all. They exist as members of our own
`ColumnType` enum (`creation_log`, `last_updated`, `item_id`), which is very likely where models
pick them up — but the filter ids the API accepts are double-underscored:

| model sends | API accepts | failures | accounts |
|---|---|---|---|
| `creation_log`, `creation_log__1` | `__creation_log__` | 106 | 56 |
| `last_updated`, `pulse_updated_*` | `__last_updated__` | 58 | 20 |
| `item_id`, `pulse_id`, `id` | `__item_id__` | 13 | 6 |
| | **total** | **177 (~7%)** | |

Same fix shape as the group gap: document the real ids where they are visible, ship that alone, and
re-measure before considering any server-side repair of the guessable variants. Deliberately kept
out of the group-filter change (PR #481) to keep that one single-purpose.

## Examples to look at

Query as `RequestId` in `monday.logs` (the API `request_id` field is empty on these).

**Verbatim copy of our example** — `RequestId = fbf038d1-6264-462d-ba45-aab0521588c8`
account 23692304, board 1650894170, 2026-09-05 19:49 UTC:

```json
[{"columnId":"last_updated","compareValue":["TODAY"],"operator":"any_of","compareAttribute":"UPDATED_AT"}]
```

Identical to the `✅ Correct` line at `column-filter-aggregation-guidelines.ts:12`. Result: Column not found.

**Same id in orderBy** — `RequestId = 6b9be9ca-eb1a-45da-8cb0-ad24cf576713`
account 14093369, board 6462258574, 2026-09-06 04:01 UTC:

```json
[{"columnId":"last_updated","direction":"desc"}]
```

## Code references

`mcp` repo:

- `packages/agent-toolkit/src/core/tools/platform-api-tools/utils/column-filter-aggregation-guidelines.ts`
  — the examples; `filterOperatorGuidelinesSection()` at `:101` is the only part always included.
- `packages/agent-toolkit/src/core/tools/platform-api-tools/get-column-type-info/get-column-type-info-tool.ts:58`
  — the only consumer, keyed by column type.

`dapulse` repo — the accepted magic ids (`group`, `__item_id__`, `__creation_log__`, `__last_updated__`)
and where the error is raised:

- `app/services/filter_rules_service.rb:241-271` — the **filters** path, `get_column_type`.
- `app/services/sort_settings_service.rb:31-49` — the **orderBy** path, `SortSettingsService#get_column_type`.
  Identical case statement, same four magic ids, same `ResourceNotFoundException` for anything else.
  This is the source-level confirmation that orderBy accepts the underscored ids.
- `app/services/rule_filters_migration_service.rb:80-87` — `COMPARE_ATTRIBUTES`, which contains both
  `CREATED_AT`/`CREATED_BY` and `UPDATED_AT`/`UPDATED_BY`. `:191-193` maps pulse-log to `CREATED_BY`
  and pulse-updated to `UPDATED_BY`, because both columns hold a person *and* a date — so
  `compareAttribute` selects the facet, which is why a date comparison must name `CREATED_AT`.
- `app/services/column_types/pulse_log_column.rb:21-23` — `SETTING_MODE_PERSON_AND_DATE`, the same
  person+date duality.

### Claims checked against production before shipping

| claim | verdict | evidence |
|---|---|---|
| orderBy accepts `__creation_log__` / `__last_updated__` | true | `sort_settings_service.rb:31-49`, plus 10,293 calls at 0.2–0.3% error |
| `CREATED_AT` is the right compareAttribute for `__creation_log__` | true | 283 calls, 0 errors |
| `compareAttribute` is *required* | **facet-dependent — the earlier "false" was wrong** | 3,899 `__creation_log__` calls omit it with 2 errors, but that measures *silence*, not a date comparison. `pulse-log-column-rule-based-filter-service.js` `filterGroupIds` returns `[createdBy]` unless `compareAttribute === CREATED_AT`, and a bare `ANY_OF` *is* registered (`created-by/pulse-log-filter-config-any-of-operator.js`, `shouldShowOperatorInUI(): false`) so it cannot error. Optional for the creator/updater facet, **mandatory for any date comparison** |
| `pulse_updated` is rejected | **false** | exact `pulse_updated` 7 calls 0 errors, `pulse_updated_<suffix>` 76 calls 13.2%. These are real auto-generated column ids. Removed from the docs |
| `pulse_id` is rejected | true | 42 calls, 40 errors (95.2%) |
| bare `id` is rejected | unproven | 1 call, 1 error. Too thin to assert, so it is not claimed anywhere |

## Fix

Shipped in `agent-toolkit` 5.69.0 — **descriptions only**, following the re-measurement above:

1. `get_board_items_page` gained a CREATION AND UPDATE TIME section with both ids, an `orderBy`
   example and a `filters` example.
2. `orderBy[].columnId` documents the two virtual ids — this was the single biggest gap, 752 of
   1,038 weekly errors.
3. `filters[].columnId` names all four virtual columns and what each `compareValue` holds.
4. `get_column_type_info` guidelines: `last_updated` examples corrected to `__last_updated__`, and
   `creation_log` + `item_id` added as new documented types.
5. `group` gained an explicit ❌ for `__group__`.

### One place per surface, not three

First version said the same thing in the tool description, both `columnId` descriptions, and the
guidelines. Tool descriptions ship on every call, so that is a real cost. Final split:

| surface | carries | why |
|---|---|---|
| `get_column_type_info` guidelines | operators, `compareValue`, ✅/❌ examples | fetched on demand, not per call. All four types are valid enum members |
| `filters[].columnId` | the four ids, one line | where the model writes the value. Parent schema already points at `get_column_type_info` |
| `orderBy[].columnId` | the two time ids, one line | guidelines are filter-only and never reach the sort path — and that path is 752 of 1,038 errors |
| tool description | one `[VIRTUAL COLUMNS]` line | discovery only. Replaced 5.68.0's GROUP FILTERING paragraph, so `getDescription()` went 2,126 → 2,249 chars while covering four ids instead of one |

Caveat for the re-measure: this also shortened the group paragraph from PR #481 before #481's own
effect had been read, so group numbers now reflect both changes together and cannot be attributed
to #481 alone.

### Positive-only phrasing in the always-visible descriptions

The tool description and the two `columnId` descriptions state the correct ids and do **not**
enumerate the wrong spellings. `"__creation_log__", two underscores before and after` already fully
determines the id, so repeating `creation_log` as "rejected" costs tokens in text every call
carries, and repeats the wrong string in three places the model reads at once.

Two negations were kept, because each says something the positive form cannot:

| negation | why it is load-bearing |
|---|---|
| `group` takes no underscores | contradicts the rule the other three ids establish. Without it this change makes `__group__` (~300 calls/day, 98% error) worse |
| the group id is not the `columnId` | it is the value a model reaches for by default — the whole finding of PR #481 |

The per-type guidelines in `column-filter-aggregation-guidelines.ts` keep their ❌ examples. That is
the file's existing format for every column type, and those entries are fetched on demand rather
than sent on every call.

**Deliberately not done:** step 1 of the original plan — replacing bare type-name example ids with
`<your_column_id>` placeholders. The re-measurement shows those ids are at or below baseline error
rate, so the change would have removed useful concrete examples to fix a problem that is not there.
Only `last_updated` needed correcting, because only its id was actually wrong.

Also still not done: moving the guidelines out of the type-keyed map. `filteringGuidelinesByColumnType`
is still only reachable via `get_column_type_info` keyed by column type, so the new `creation_log`
and `item_id` entries are only found by an agent that already suspects those types. That is why the
same content also went into the always-visible tool description and the two `columnId` descriptions.

### Next step

Re-measure the six rows in the double-underscore table after release, especially the `orderBy`
split. If the bare forms persist, the next lever is a server-side repair keyed on the exact strings
`creation_log` / `last_updated` / `item_id` in `columnId` — unambiguous, unlike group ids.

## Live verification, 2026-09-07 — every example run against a real board

~45 calls against `Test Board ZZZ` (18427783088) and `AI Ecosystem Tasks` (18421599242), read-only.
Acceptance is not correctness, so each claim needed a **discriminating** result — a known item set,
not merely "did not error". Today was Monday 2026-09-07.

Confirmed correct:

| claim | evidence |
|---|---|
| all four virtual ids work in `filters` | correct item sets returned |
| `orderBy` accepts `__creation_log__` (asc + desc) and `group` | correct ordering |
| `[UNIT, AMOUNT]` for 4 units × 2 operators | 8/8, exact boundaries: `WEEKS 2` → oldest Aug 24, `MONTHS 1` → Aug 7, `WORKDAYS 5` → Sept 1 (skips the weekend), `DAYS 30` → Aug 9 |
| bare `creation_log` / `item_id` / `pulse_id` / `__group__` / a group id as `columnId` | all 404 "Column not found" |
| bare number `7` and `["EXACT", ...]` as a window | **500 INTERNAL_SERVER_ERROR** — this is what the `[UNIT, AMOUNT]` doc prevents |
| unit in `compareAttribute` | `{"operator":"WITHIN_THE_LAST__WEEKS","reason":"no_operator_config"}` |
| `["PAST_DATETIME","14"]` | `{"operator":"WITHIN_THE_LAST","reason":"no_operator_config"}` |
| silent zero, correctly marked ❌ | `date` without `EXACT`, group title instead of group id |

Untested: `email`, `numbers`, `long_text`, `checkbox` — no reachable board has those column types.
All four are untouched by this change.

### Three defects the testing found

**1. `LAST_WEEK` and `LAST_MONTH` silently return zero items.** Pre-existing in `last_updated`;
this PR copied the list verbatim into the new `creation_log` entry. Proven with ground truth — the
board has Aug 9 creations and Aug 10 / Aug 20 / Sept 1 updates — while `TODAY`, `YESTERDAY`,
`THIS_WEEK` and `THIS_MONTH` all return the right items. `LAST_MONTH` returned 0 even *with* the
correct `compareAttribute`. Replacement verified: `["WEEKS", 1]` returns exactly the Sept 1 items
`LAST_WEEK` missed, `["MONTHS", 1]` returns the Aug 9 item.

This is a **server-side defect**, not only a docs one. Worth its own platform ticket: two keywords
the filter accepts without error and matches nothing.

**2. `compareAttribute` described as required — this observation is retracted, 2026-09-16.** The
test recorded that `__creation_log__ ["THIS_MONTH"]` without it "returns the same items", and
concluded the attribute is optional. Source reading in `data-core` says a date comparison without
`CREATED_AT` cannot work:

- `pulse-log-column-rule-based-filter-service.js` `filterGroupIds` returns `[createdBy]` in an
  explicit `else` branch; only `compareAttribute === CREATED_AT` reaches `createdAt`.
- The bare `ANY_OF` is registered for `pulse_log` (`created-by/pulse-log-filter-config-any-of-operator.js`,
  `shouldShowOperatorInUI(): false`), so omitting the attribute resolves and never raises
  `no_operator_config`. The rule is *not* dropped.
- That operator's `getCompareValue` maps each value through `getKindAndIdFromUniqueId`, which is
  `uniqueId.split(delimiter)` → `Number(id)` (`multiple-person-column-service.js:20-23`). `"THIS_MONTH"`
  becomes `NaN`, compared against a numeric `createdBy`. **Zero matches.**
- `shouldAddGenericOperatorTypes()` is `false` for `pulse_log` and every entry in its
  `OPERATOR_PREFERENCES` carries `CREATED_BY` or `CREATED_AT`, so `within_the_last`, `between` and the
  comparisons exist *only* attributed.

Since the rule stays live and matches zero, the hand test is non-discriminating **only if the correct
`CREATED_AT` result was also empty** — otherwise it should have differed. It was not recorded as a
ground-truth item set, so it cannot overrule the code path. The claims-table row above measured
non-erroring, not correctness — the same conflation that hid `board_relation` string ids.

**3. Two ❌ scalar examples are tolerated on my account — deliberately kept.** `compareValue: "TODAY"`
with `any_of` did not error for me. Not a docs bug: `filter_rules_service.rb:152-167`
`validate_date_values` on `origin/master` requires an **Array**, whitelists only `["TODAY"]`,
`["TOMORROW"]` and `["EXACT","YYYY-MM-DD"]`, and otherwise raises `ArgumentError`. It runs only
behind the `use_shared_filter_rules_service` flag (`paginated_board_items.rb:148-152`, with an
unvalidated fallback). My test account lacks the flag. Removing the ❌ would over-generalise from
one account — the same mistake that produced `__group__`.

### Open platform risk, separate from this PR

Real `date` columns **do** route through `validate_date_values`, whose `case column_type` matches
`when "date"`. So `["DAYS", 7]` — an array whose `[0]` is not `"EXACT"` — would raise `ArgumentError`
on a flagged account, contradicting the `[UNIT, AMOUNT]` contract this PR documents.

Measured over 7 days across window calls: `D_other_error` 1,754 / 673 accounts,
`B_no_operator_config` 527 / 294, `E_success` 342 / 167, `C_column_not_found` 64 / 37, and **zero**
`validate_date_values` ArgumentErrors. Caveated: `error_message` is often "Unknown error", so the
1,754 bucket could hide some.

`fix/items-page-relative-date-window-errors` in dapulse (`RELATIVE_WINDOW_UNITS = %w[DAYS WORKDAYS
WEEKS MONTHS]`) appears to be the fix for exactly this.
