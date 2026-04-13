# Link Board Items Tool — Design Doc

## Purpose

Automatically link items across two monday.com boards by matching them using exact or semantic (LLM-powered) matching. Handles the full flow: fetches items from both boards, computes matches internally (without surfacing raw data to the agent), then batch-writes the link column values.

**Cardinality (and product relation labels):** **Many sources**, each **at most one** target per run — **not** many-to-many (multiple candidates for one source is an error). Strategy docs name HL-LL, enrichment, assignment, and dependencies (e.g. `Knowledge/linkage-2026-strategy.md`); they line up with this tool only where one target per source is enough (dependencies often are not). Connect-boards has no relation-type metadata; this tool only writes generic link values.

This is the tool to use when the agent *doesn't already know* what to link. If the agent already has item IDs, `change_item_column_values` is sufficient. This tool earns its existence by handling discovery + matching at scale — across potentially thousands of items that can't fit in agent context.

Common use cases: invoices → vendors, contacts → accounts, orders → customers, sub-items → parent projects. Not limited to any specific domain.

### Phase 1 scope

Phase 1 includes:

- Exactly **one** source item per invocation, identified by **exactly one** id in `source.itemIds`. That fits **incremental / “new item”** flows (e.g. a row was just created or singled out and needs its counterpart resolved once).
- **Backfilling** — linking **many** existing source rows in bulk in a single invocation — is **(out of scope for Phase 1)**; use one call per source for now, or a later phase that relaxes the limit.
- That source row is matched to **at most one** target (no many-to-many).

## Assumptions

1. **LLM reasoning is available** — the tool can make LLM calls for semantic matching and candidate filtering. The LLM client injection mechanism is TBD, but the interface contract is defined (see LLM Interface section).
2. **Batch item updates are available** — multiple `change_multiple_column_values` mutations can be sent in a single GraphQL request using field aliases. If the batch fails, the tool falls back to sequential writes.

## Where It Lives

`packages/agent-toolkit/src/core/tools/platform-api-tools/link-board-items-tool/`

Registered as an MCP tool: `link_board_items`

---

## Inputs


| Parameter      | Type      | Required         | Description                                                                                                                           |
| -------------- | --------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `source`       | object    | yes              | Configuration for the source board — the board whose items will be linked (e.g. invoices, contacts, orders). See fields below. **Bulk / backfill linking of many source rows in one run: (out of scope for Phase 1)** — Phase 1 is one `source.itemIds` per call (suited to new-item / incremental cases).        |
| `target`       | object    | yes              | Configuration for the target board — the board containing the items to link to (e.g. vendors, accounts, customers). See fields below. |
| `matchMode`    | `"exact"` \| `"semantic"` | default: `"exact"` | See **Match Modes**.                                                                                                                    |
| `semanticHint` | string    | no               | Natural language description of the relationship for LLM context when using `semantic` mode.                                                                     |
| `dryRun`       | boolean   | default: `false` | Compute and return matches without writing anything                                                                                   |


`**source` and `target` objects share the same fields:**


| Field             | Type                 | Required             | Description                                                                                                                                                                                                                           |
| ----------------- | -------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `boardId`         | number               | yes                  | The board ID                                                                                                                                                                                                                          |
| `linkColumnId`    | string               | one of source/target | Board-relation column on this board to populate. Exactly one side must provide this.                                                                                                                                                  |
| `matchColumnIds`  | string[]             | mode-dependent       | **Exact:** omit or `[]` on both sides → compare item names; or exactly one id per side → compare those columns. At most one id per side. **Semantic:** one or more ids per side (both non-empty); passed to the LLM.                  |
| `itemIds`         | (string \| number)[] | no                   | If set, only these monday item IDs are fetched for that board (`ItemsQuery.ids`, server-side). **Max 100** per side (GraphQL limit). Combine with `filters` when useful. Omit to use pagination over the board (subject to page cap). **More than one `source.itemIds` entry, or omitting `source.itemIds` and matching / backfilling across many source rows in one run: (out of scope for Phase 1).** |
| `filters`         | array                | no                   | Narrow which items are fetched server-side                                                                                                                                                                                            |
| `filtersOperator` | enum                 | no                   | AND/OR operator for filters                                                                                                                                                                                                           |
| `orderBy`         | array                | no                   | Sort order for fetched items. Each entry: `{ columnId, direction: "asc" \| "desc" }`. Applied server-side. Useful when item position matters — e.g. pick the earliest item by creation date, or process highest-priority items first. |


---

## Link Column Direction

Like a foreign key in a DB, the board-relation column can live on either side of the relationship:

- **Source side** (`source.linkColumnId`): Each source item holds a reference to one target item. One write per matched source item.
- **Target side** (`target.linkColumnId`): Each target item holds references to multiple source items. Multiple source matches for the same target are merged into a single write, preserving any existing linked IDs. **Merging multiple different source items onto one target in a single invocation: (out of scope for Phase 1).**

Exactly one of `source.linkColumnId` / `target.linkColumnId` must be provided.

---

## Match Modes

### `exact`

Case-insensitive equality on the single column named in `matchColumnIds` on each side (one id per board), or on item name if `matchColumnIds` is omitted or empty on both sides. Fast and deterministic.

Use when: data is clean and values are normalized across both boards.

Example: source `vendor_name` column = `"Acme"` matches target `name` column = `"Acme"`.

### `semantic`

LLM reasons across the columns listed in `matchColumnIds` (one or more per side) to determine the best match based on meaning, not text equality. Handles typos, abbreviations, synonyms, and vocabulary mismatches.

Use when: relationships require understanding — abbreviated names map to full legal names, product codes map to descriptions, data is inconsistently formatted.

Example: source `{name: "ACME-Q4", category: "hardware"}` → target `{name: "Acme Corporation", industry: "Hardware & Electronics"}`.

**Requires** `source.matchColumnIds` and `target.matchColumnIds` (both non-empty).

**Not yet implemented** — see LLM Interface section below.

---

## Error Behavior

The tool never guesses or links based on partial or ambiguous data. It raises an error instead:

- **Multiple matches**: if a source item matches more than one target item, an error is thrown listing all conflicting target names and IDs. No items are written. The agent should refine filters / `itemIds` or use a more specific match column.
- **Dataset too large**: if a board has more items than can be fetched within the page cap (10 pages × 200 items = 2,000 items), an error is thrown. The agent should add filters and/or `itemIds` to narrow the dataset.

---

## LLM Interface (Semantic Mode)

Two LLM calls are made in semantic mode — one for pagination filtering, one for final matching.

### 1. Candidate Filtering (per target page)

During target board pagination, each page is passed to the LLM to filter down to only the candidates plausibly relevant to any source item. Non-relevant items are discarded before loading the next page — keeping memory bounded to `FETCH_PAGE_SIZE` relevant candidates regardless of how large the target board is.

```typescript
// Input
sourceItems: Array<{ id: string; columnValues: Record<string, string> }>
targetPageItems: Array<{ id: string; columnValues: Record<string, string> }>
hint?: string

// Output: IDs of target items worth keeping
string[]
```

### 2. Final Matching

After all pages are processed, the retained candidates are passed to the LLM for final one-to-one matching.

```typescript
// Input
sourceItems: Array<{ id: string; columnValues: Record<string, string> }>
targetItems: Array<{ id: string; columnValues: Record<string, string> }>  // pre-filtered
hint?: string

// Output
Array<{
  sourceItemId: string;
  targetItemId: string | null; // null = no confident match — do not guess
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}>
```

Only the columns listed in `matchColumnIds` are included in both calls — keeping payloads minimal.

The LLM should:

- Consider all provided columns together, not just names
- Return `null` rather than guess when no match is confident
- Match each source to at most one target

### What Needs to Be Wired Up

Two stubs exist: `callLlmForSemanticMatching()` and `callLlmToFilterCandidates()`. To implement:

1. Inject an LLM client into `BaseMondayApiTool` (or pass via context)
2. Construct prompts from the item arrays and `hint`
3. Call the LLM with structured output (Zod schema → typed response)
4. Return the decisions — the tool handles filtering, deduplication, and building `MatchResult[]`

---

## Output

```json
{
  "linkSide": "source",
  "matchMode": "exact",
  "sourceBoardId": 111,
  "targetBoardId": 222,
  "totalSourceItems": 50,
  "linked": [
    {
      "sourceItemId": "s1", "sourceItemName": "Invoice #001",
      "targetItemId": "t1", "targetItemName": "Acme Corporation",
      "matchReason": "Exact match: \"acme\""
    }
  ],
  "failed": [],
  "unmatched": [{ "id": "s9", "name": "Invoice #009" }],
  "summary": "Linked 49 items. 0 writes failed. 1 item could not be matched."
}
```

`confidence` is only present for semantic matches. In dry run mode, returns `dryRun: true` and `matches` instead of `linked`.

---

## How It Works

1. **Fetch source items** — paginated up to 10 pages, requesting only the link column + match columns. `filters` and/or `itemIds` applied server-side via `query_params` (same as `get_board_items_page`). **Unrestricted multi-page fetch of many source rows in one run: (out of scope for Phase 1).**
2. **Fetch target items** — for exact mode: same full fetch. For semantic mode: paginated with LLM-assisted filtering — each page is filtered by the LLM before the next is loaded, so only relevant candidates are retained in memory.
3. **Match** — run the selected mode.
  - Exact: equality check; errors on ambiguous (multiple matches per source item).
  - Semantic: LLM receives all source items + filtered target candidates; returns one decision per source.
4. **Write** — all mutations sent in a single GraphQL request using field aliases (batch). Falls back to sequential if batch fails. **Batch writes for many matched source rows from one invocation: (out of scope for Phase 1).**
  - Source-side: one alias per matched source item.
  - Target-side: one alias per unique target item, merged source IDs included.

---

## Scale Approach

- Fetch uses `columnIds` to request only the columns needed.
- `source.filters` / `target.filters` and optional `source.itemIds` / `target.itemIds` narrow the fetch server-side before transfer (`itemIds` capped at 100 per request, per `ItemsQuery`).
- `source.orderBy` / `target.orderBy` control fetch order server-side — useful when item position matters (e.g. pick the earliest by creation date).
- To skip already-linked items: add an `is_empty` filter on the `linkColumnId`.
- Paginated with cursor, 200 items per page, max 10 pages (2,000 items) per board. Exceeding this raises an error.
- For semantic mode: target board is streamed page by page — the LLM filters each page down to relevant candidates before the next page loads. Memory is bounded to the retained candidates, not the full board.
- Writes batched into a single GraphQL mutation using aliases.
- For semantic mode: only `matchColumnIds` values are sent to the LLM — not full items.

---

## Agent Expectations

### Iterative workflow

1. Call with `dryRun=true` to inspect matches and the `unmatched` list.
2. For unmatched items, reason about why — wrong mode, wrong columns, value format mismatch.
3. For ambiguity errors, add filters or `itemIds` to narrow which items are considered.
4. Retry with adjusted `matchMode`, `matchColumnIds`, `filters`, or `itemIds`.
5. Commit with `dryRun=false` when quality is acceptable.

### Choosing the right mode

- Use `exact` when column values are clean and normalized across both boards
- Use `semantic` for everything else — typos, abbreviations, different vocabularies, meaning-based relationships

---

## Limitations

- Each source item matches at most one target item; many sources may share the same target, but a source never receives multiple targets from this tool (see **Cardinality** under Purpose — not many-to-many).
- Many source rows or backfill-style bulk linking in one call: (out of scope for Phase 1).
- Maximum 2,000 items per board (10 pages × 200). Use filters and/or `itemIds` to stay within this limit. `itemIds` is capped at **100** IDs per side per GraphQL `ItemsQuery` (split into multiple tool calls if you need more).
