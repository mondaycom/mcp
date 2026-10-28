---
name: investigate-tool-errors
description: Investigate MCP tool errors from the Grafana usage dashboard - rank error codes for a tool/caller, drill into ONE code, root-cause it, size its real cost, write it up, and optionally fix it. Use when asked to look into tool errors, error codes, error rates, or why a tool is failing for a caller like monday-agents.
---

# Investigate MCP tool errors

## Rules

- **One error code at a time.** Rank them, pick one, finish it. Never spread across all codes.
- **Complexity errors last.** They are usually a symptom of the other problems (oversized scans).
- **One doc per cause, not per error code.** A single code normally splits into several unrelated
  causes. Each gets its own file.
- **Prove, do not assert.** If you claim what a client receives, run it through the real code.
- **The error count is a floor, never the cost.** Always measure the downstream waste too.
- **Rates, not counts.** A failure count with no denominator is not evidence. `columnId: "status"`
  had 37 failures and looked like a top cause — its error rate was 1.4%, *below* baseline. Always
  divide by the calls that used the same argument.
- **For 5xx, read the server-side log before naming a cause.** Query `monday.logs` with
  `Tag='graphql'` by `RequestId` — its `original_errors` field holds the pre-sanitized subgraph
  error, which is the only place the real failure appears. Do not infer "transient" from a board or
  account that both succeeds and fails: that is confounded by argument differences between the calls.

## Prior findings

`docs/errors-investigation/` holds the write-ups from earlier passes. Read the ones relevant to
your tool before starting — the cause may already be documented, with numbers and request ids.
These files are deliberately kept **uncommitted**, so they exist on disk but not in git history.

Check open PRs before editing any shared description file. `items-filter-schema.ts` and
`column-filter-aggregation-guidelines.ts` are touched by more than one investigation and conflict
easily.

## Data source

Grafana ClickHouse, table `monday.logs`, `Tag = 'mcp-server'`.
Datasource uid: production `delzcb7jkoxkwa`, staging `eesl6ziq87abka`.

The Grafana tools are deferred: load them with `ToolSearch` (`select:...obsmcp_call_tool,...obsmcp_search_tools`),
then invoke `grafana_query_clickhouse` and `grafana_get_dashboard_property` through `obsmcp_call_tool`.

Dashboard: `https://grafana.monday.beer/d/stc9vmq/mcp-usage`. The entry panel is
**MCP Tool Errors by Code & Service**. Read its SQL rather than reinventing it:
`grafana_get_dashboard_property` with uid `stc9vmq`, jsonPath `$.panels[15]`.

### Fields (all under `Attributes`, read with `toString(...)`)

| field | use |
|---|---|
| `operation_name` | tool name |
| `operation_type` | filter `= 'tool'` |
| `source_type` | `internal` for first-party callers |
| `attributions.caller_app_name` | caller when `source_type = 'internal'` |
| `agent_type`, `agent_client_name`, `redirect_uri` | caller for other source types |
| `is_error` | `'true'` / `'false'` |
| `error_codes` | array — `JSONExtract(toString(Attributes), 'error_codes', 'Array(String)')` |
| `error_message` | often `"Unknown error"`; do not trust it |
| `operationArgs.*` | the tool's arguments, everything stringified |
| `current_tenant` | account id |
| `session_id` | agent run |
| `response_bytes` | payload size |
| `provider_service` | e.g. `agent-toolkit` |
| `RequestId` | top-level column, not under Attributes |

### Always dedupe

Retries and fan-out double count. Every aggregate needs:

```sql
LIMIT 1 BY cityHash64(Timestamp, toString(Attributes.operation_name), RequestId, toString(Attributes.args_hash))
```

## Step 1 — rank the codes

```sql
SELECT if(trimBoth(err) = '', 'unclassified', err) AS error_code, count() AS errors
FROM (
  SELECT cityHash64(Timestamp, toString(Attributes.operation_name), RequestId, toString(Attributes.args_hash)) AS event_key,
         JSONExtract(toString(Attributes), 'error_codes', 'Array(String)') AS error_codes
  FROM monday.logs
  WHERE Tag = 'mcp-server' AND toString(Attributes.operation_type) = 'tool' AND $__timeFilter(Timestamp)
    AND toString(Attributes.source_type) = 'internal'
    AND toString(Attributes.attributions.caller_app_name) = '<CALLER>'
    AND toString(Attributes.operation_name) = '<TOOL>'
  LIMIT 1 BY event_key
) ARRAY JOIN error_codes AS err
GROUP BY error_code ORDER BY errors DESC
```

Two codes with identical counts are usually **one event carrying both** — check before treating
them as separate problems.

## Step 2 — find the cause

Sample full attributes for a few failing calls (narrow the window to a few hours, or it times out):

```sql
SELECT toString(Attributes) AS attrs FROM monday.logs
WHERE Tag = 'mcp-server' AND toString(Attributes.operation_type) = 'tool' AND $__timeFilter(Timestamp)
  AND toString(Attributes.operation_name) = '<TOOL>'
  AND has(JSONExtract(toString(Attributes), 'error_codes', 'Array(String)'), '<CODE>')
ORDER BY Timestamp DESC LIMIT 3
```

Read `operationArgs`. Form a hypothesis about which argument causes it, then classify **all**
events with `multiIf`, and **isolate runaway tenants** — one account looping the same bad call can
be half the volume and will skew every conclusion.

```sql
SELECT bucket, count() AS errors, uniq(tenant) AS accounts FROM (
  SELECT cityHash64(Timestamp, RequestId, toString(Attributes.args_hash)) AS event_key,
         toString(Attributes.current_tenant) AS tenant,
         multiIf(tenant = '<RUNAWAY>', 'A_runaway_tenant', <condition>, 'B_...', 'Z_other') AS bucket
  FROM monday.logs WHERE ... LIMIT 1 BY event_key
) GROUP BY bucket ORDER BY errors DESC
```

## Step 3 — answer these before proposing anything

1. **What was the caller trying to achieve?** State it in one sentence.
2. **How do we know what it meant?** Point at machine-readable evidence in the args. Never infer
   from the *shape* of an id — monday ids are not reliably distinguishable (group ids include
   `topics`, `new_group29179`, `group_title`, which are also plausible column ids). A self-
   referencing rule like `{columnId: X, compareValue: X}` is evidence. A prefix is not.
3. **Why did it guess?** Usually the correct form exists but is undocumented or undiscoverable.
4. **Is it under our control?** Split volume into fixable-by-us vs caller-side.

Two checks that kill the easy answers:

```sql
-- Is the suspect argument really the driver? Compare rates.
SELECT has_arg, count() AS calls, countIf(err) AS errors, round(100*countIf(err)/count(), 2) AS pct
FROM ( SELECT ..., toString(Attributes.operationArgs.<ARG>) != '' AS has_arg,
       has(JSONExtract(toString(Attributes), 'error_codes', 'Array(String)'), '<CODE>') AS err
       FROM monday.logs WHERE ... LIMIT 1 BY event_key ) GROUP BY has_arg
```

```sql
-- Did the caller honour the tool description's precondition? If yes, prompt text is NOT the fix.
SELECT called_precondition, count() AS sessions FROM (
  SELECT toString(Attributes.session_id) AS s, toString(Attributes.operationArgs.boardId) AS b,
         countIf(toString(Attributes.operation_name) = '<PRECONDITION_TOOL>') > 0 AS called_precondition,
         countIf(toString(Attributes.operation_name) = '<TOOL>' AND toString(Attributes.is_error) = 'true') AS errs
  FROM monday.logs WHERE ... GROUP BY s, b HAVING errs > 0
) GROUP BY called_precondition
```

## Step 4 — size the real cost

Report all four. The first alone always understates the problem.

1. Share of the error code, and share **of all calls to the tool**.
2. Accounts affected.
3. Extra calls after the failure — the fallback behaviour, and bytes it returns.
4. **The silent variant** — callers that never attempt and just scan. This logs no error at all and
   is invisible on error dashboards.

```sql
-- Fallback: unfiltered scans in the same session+board after the failure
SELECT count() AS scopes, countIf(unfiltered > 0) AS then_scanned,
       round(avg(unfiltered), 2) AS avg_extra_calls, round(sum(bytes)/1048576, 1) AS mb
FROM ( SELECT toString(Attributes.session_id) AS s, toString(Attributes.operationArgs.boardId) AS b,
         countIf(<failure condition>) AS failures,
         countIf(toString(Attributes.is_error) = 'false' AND toString(Attributes.operationArgs.filters) = '') AS unfiltered,
         sumIf(toUInt64OrZero(toString(Attributes.response_bytes)), toString(Attributes.is_error) = 'false') AS bytes
       FROM monday.logs WHERE ... GROUP BY s, b HAVING failures > 0 )
```

State plainly what a number does **not** prove. "Scan then pick" has other causes; say so rather
than attributing all of it to your bug.

## Step 5 — one concrete example

Always hand over one `RequestId` plus the full session timeline, so it can be checked by hand.
`Attributes.request_id` is usually empty — give the top-level `RequestId` column and say so.

```sql
SELECT Timestamp, toString(Attributes.operation_name) AS tool, toString(Attributes.is_error) AS err,
       toString(Attributes) AS attrs
FROM monday.logs WHERE Tag = 'mcp-server' AND $__timeFilter(Timestamp)
  AND toString(Attributes.session_id) = '<SESSION>' ORDER BY Timestamp
```

## Step 6 — trace to code

- `~/Development/mcp` — the tool, its schema, shared filter schemas.
- `~/Development/dapulse` — where the error is actually raised. Grep the exception class, e.g.
  `rg -n "ResourceNotFoundException" app/ | grep -iE "column|group"`.
- `~/Development/ai-toolbox/packages/mcp` — observability and error shaping (`log.ts`,
  `tool-errors.consts.ts`).

Check whether the API already supports the thing the caller wanted. It often does, undocumented.

## Output

`docs/errors-investigation/<specific-cause>.md`. Short, simple words, tables over prose.
Leave it **uncommitted** unless asked to commit.

```markdown
# <tool> — <cause> 

Investigated <date>. Data window: <N> days, caller `<caller>`, `sourceType=<...>`.

<!-- Always re-measure. Numbers in an older doc drift, and the window it used may be stale. -->


## The error
<code>, which on this tool means <plain meaning>.

## Why it happens
<mechanism in 2-3 lines, plus the offending call as JSON>
<what makes it ours vs the caller's>

## The effect
<table: share of code, share of all calls, accounts>
<table: downstream cost — extra calls, bytes, silent variant>
<caveats on what the numbers do not prove>

## Example to look at
`RequestId = <id>` — account, board, session, time. Then the session timeline as a table.

## Code references
<repo paths with line numbers, ours and platform>

## Fix
<what to do, or what shipped and in which version>
<what was deliberately left out, linked to its own doc>
```

## Fixing

**Try descriptions first.** Most of these bugs are discoverability, not capability — the API
already supports what the caller wanted, we just never documented it. A description is reversible
and free. A parameter is a permanent API commitment. Server-side repair of bad input rewrites
caller intent with nothing logged, and hides the mistake from the caller.

So the default order is:

1. Ship the description change alone.
2. Re-measure the same error code on the dashboard after release.
3. Only if failures persist, add a parameter or a repair — with the new data behind it.

Do not bundle these. A description-only PR that turns out to be enough is the best outcome, and
you cannot tell whether it was enough if you shipped code alongside it.

### One fact, one place

There are three description surfaces, read at three different moments. Put each fact in exactly one:

| surface | when the model reads it | what belongs there |
|---|---|---|
| `getDescription()` | choosing which tool to call | that a capability exists, cross-tool routing |
| field `.describe()` | filling that field | the exact accepted shape of that field's value |
| `filteringGuidelinesByColumnType` | only if it calls `get_column_type_info` for that type | per-type operators and compareValue formats |

The common failure is repeating one fact across all three "to be safe". Don't. It costs real tokens
on every single session, it multiplies — `items-filter-schema.ts` is imported by
`get_board_items_page`, `get_full_board_data` and `board_insights`, so one sentence there is paid
three times — and the copies drift until they contradict each other.

Before adding a sentence, ask: **at the moment the model makes this mistake, which surface is in
front of it?** Put it only there. If the answer is genuinely two surfaces, the two are disagreeing
about ownership — say so in the PR rather than quietly duplicating.

Also:

- Do not restate the field name. `columnId: "The id of the column to filter by"` says nothing the
  field name did not.
- One concrete correct example beats a paragraph. Add one wrong example only if that exact wrong
  form is what the data shows callers sending.
- Keep the example ids obviously fake, or real. An example id that looks real gets copied literally.
- No `;` or backticks anywhere — `tool-description-safety.test.ts` fails the build.

- Branch from `master`, never from the current branch.
- Bump `packages/agent-toolkit/package.json` and add a `CHANGELOG.md` entry — there is no
  automatic versioning.
- **Do not change the error code.** Observability reads `structuredContent.errors[].code`. If you
  rewrite an error, keep the original `response` attached so the code survives, and add a test
  asserting `code`, `status_code` and `error_data`.
- Any scope you add beyond the one cause needs its own measurement, same method. Otherwise leave
  it in the doc and out of the branch.
- Shared schemas: `items-filter-schema.ts` is used by `get_board_items_page`,
  `get_full_board_data` and `board_insights`, and is duplicated in
  `hosted-mcp/src/components/table/items-filter-schema.ts` (separate repo, separate PR).

PR body: **What / Why / Effect**, short lines, plus a Notes section for any non-obvious heuristic
and the explicit out-of-scope list.

## Gotchas

- Queries over 2 days with `LIKE '%...%'` time out. Use `has(error_codes, ...)` and narrow windows.
- The ClickHouse tool rejects `WITH ... AS (...)` CTEs. Use nested subqueries.
- Descriptions cannot contain `;` or backticks — `tool-description-safety.test.ts` enforces it
  across every tool sharing the schema.
- macOS `find` has no `-newermt`. Do not rely on it for object searches.
- `git add -A` or adding a whole directory will stage unrelated untracked files. Stage explicit
  paths, and check `git status` before every commit.
