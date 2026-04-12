# Link Board Items Tool — Design Doc

## Purpose

Automatically link items across two monday.com boards by matching them using exact or semantic (LLM-powered) matching. Handles the full flow: fetches items from both boards, computes matches internally (without surfacing raw data to the agent), then batch-writes the link column values.

This is the tool to use when the agent *doesn't already know* what to link. If the agent already has item IDs, `change_item_column_values` is sufficient. This tool earns its existence by handling discovery + matching at scale — across potentially thousands of items that can't fit in agent context.

Common use cases: invoices → vendors, contacts → accounts, orders → customers, sub-items → parent projects. Not limited to any specific domain.

## Assumptions

1. **LLM reasoning is available** — the tool can make LLM calls for semantic matching and candidate filtering. The LLM client injection mechanism is TBD, but the interface contract is defined (see LLM Interface section).
2. **Batch item updates are available** — multiple `change_multiple_column_values` mutations can be sent in a single GraphQL request using field aliases. If the batch fails, the tool falls back to sequential writes.

## Where It Lives

`packages/agent-toolkit/src/core/tools/platform-api-tools/link-board-items-tool/`

Registered as an MCP tool: `link_board_items`

---

## Inputs


| Parameter      | Type                     | Required           | Description                                                                                                                           |
| -------------- | ------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `source`       | object                   | yes                | Configuration for the source board — the board whose items will be linked (e.g. invoices, contacts, orders). See fields below.        |
| `target`       | object                   | yes                | Configuration for the target board — the board containing the items to link to (e.g. vendors, accounts, customers). See fields below. |
| `matchMode`    | `"exact"` | `"semantic"` | default: `"exact"` | How to match items                                                                                                                    |
| `semanticHint` | string                   | no                 | Natural language description of the relationship, for LLM context                                                                     |
| `dryRun`       | boolean                  | default: `false`   | Compute and return matches without writing anything                                                                                   |


`**source` and `target` objects share the same fields:**


| Field             | Type     | Required             | Description                                                                                                                                                                                                          |
| ----------------- | -------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `boardId`         | number   | yes                  | The board ID                                                                                                                                                                                                         |
| `linkColumnId`    | string   | one of source/target | Board-relation column on this board to populate. Exactly one side must provide this.                                                                                                                                 |
| `matchColumnIds`  | string[] | mode-dependent       | **Exact:** omit or `[]` on both sides → compare item names; or exactly one id per side → compare those columns. At most one id per side. **Semantic:** one or more ids per side (both non-empty); passed to the LLM. |
| `filters`         | array    | no                   | Narrow which items are fetched server-side                                                                                                                                                                           |
| `filtersOperator` | enum     | no                   | AND/OR operator for filters                                                                                                                                                                                          |


---

## Link Column Direction

Like a foreign key in a DB, the board-relation column can live on either side of the relationship:

- **Source side** (`source.linkColumnId`): Each source item holds a reference to one target item. One write per matched source item.
- **Target side** (`target.linkColumnId`): Each target item holds references to multiple source items. Multiple source matches for the same target are merged into a single write, preserving any existing linked IDs.

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

- **Multiple matches**: if a source item matches more than one target item, an error is thrown listing all conflicting target names and IDs. No items are written. The agent should refine filters or use a more specific match column.
- **Dataset too large**: if a board has more items than can be fetched within the page cap (10 pages × 200 items = 2,000 items), an error is thrown. The agent should add filters to narrow the dataset.

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

1. **Fetch source items** — paginated up to 10 pages, requesting only the link column + match columns. Filters applied server-side.
2. **Fetch target items** — for exact mode: same full fetch. For semantic mode: paginated with LLM-assisted filtering — each page is filtered by the LLM before the next is loaded, so only relevant candidates are retained in memory.
3. **Match** — run the selected mode.
  - Exact: equality check; errors on ambiguous (multiple matches per source item).
  - Semantic: LLM receives all source items + filtered target candidates; returns one decision per source.
4. **Write** — all mutations sent in a single GraphQL request using field aliases (batch). Falls back to sequential if batch fails.
  - Source-side: one alias per matched source item.
  - Target-side: one alias per unique target item, merged source IDs included.

---

## Scale Approach

- Fetch uses `columnIds` to request only the columns needed.
- `source.filters` / `target.filters` narrow the fetch server-side before transfer.
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
3. For ambiguity errors, add filters to narrow which items are considered.
4. Retry with adjusted `matchMode`, `matchColumnIds`, or filters.
5. Commit with `dryRun=false` when quality is acceptable.

### Choosing the right mode

- Use `exact` when column values are clean and normalized across both boards
- Use `semantic` for everything else — typos, abbreviations, different vocabularies, meaning-based relationships

---

## Limitations

- Each source item matches at most one target item.
- Maximum 2,000 items per board (10 pages × 200). Use filters to stay within this limit.
- `semantic` mode is not yet implemented.

