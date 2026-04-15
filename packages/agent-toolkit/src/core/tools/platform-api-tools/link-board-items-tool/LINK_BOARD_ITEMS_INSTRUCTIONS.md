# Link board items — agent instructions

Human-readable copy of the workflow embedded in the `link_board_items` MCP tool description.

**Keeping in sync:** The published package ships only compiled JS (`dist/`). The tool still exposes this text via a string in `link-board-items-tool.ts`. When you change instructions, update **both** this file and `LINK_BOARD_ITEMS_DOCUMENTATION` in that file (or vice versa). TypeScript does **not** import this `.md` at build or runtime without extra Rollup plugins and shipping assets.

---

## MCP tool summary (opening line)

Use when linking across boards via **board-relation**: **you** fetch and match (bounded), with **minimal `columnIds`** when columns matter, then this tool writes `pairs` (same payload shape as `change_item_column_values`). Details below.

---

# Link Board Items — guided fetch workflow and relation writes

## Purpose

Applies writes only: explicit `(sourceItemId, targetItemId)` pairs for a **board-relation** column. Discovery and matching are **yours** (see principles).

**Cardinality:** at most **one** target per `sourceItemId` per call; many sources may share one target. If several targets could match, **do not guess** — refine, omit from `pairs`, or ask the user.

## When to use this tool

- After **your** bounded discovery on large boards, you want this tool’s **write** for the relation (same payload as `change_item_column_values`), alone or batched.
- You know `linkSide` and `linkColumnId` (column may live on source or target board).

## When not to use this tool

- You **already** have both item IDs and the correct relation value and **did not** need paged discovery — `change_item_column_values` alone is enough.
- You expect fetch, match, and write to run automatically inside one opaque API call without you paging boards yourself — this tool only persists the `pairs` you pass after **you** complete discovery and matching.

## Core principles

1. **Minimal column payloads** — `includeColumns: true` and `columnIds` = **only** compare columns (plus `linkColumnId` if you must read it, e.g. `is_empty` / existing links). Never request unrelated columns. **Name-only** match on item `name` → skip column payloads.
2. **Discovery** — On `get_board_items_page`, combine `searchTerm`, `filters`, `itemIds` (≤ **100** IDs per call; chunk larger sets), and `nextCursor` / `has_more` however fits; no fixed order. Prefer narrowing when it clearly saves work.
3. **Ambiguity** — Multiple plausible targets **among rows you already evaluated** under your rule, after a fair attempt to slice or page a large board, is ambiguity — do not pick arbitrarily; refine, **omit** from `pairs`, or **ask**. **One thin page** of a huge board alone is **not** enough to call that ambiguity.
4. **Scale** — Do not treat page 1 as the whole board. **Discard** dead rows between pages. **Budget** (e.g. ~**500** items in memory across joined boards or ~**10** pages per side per pass) — then change query, partial write, split, or ask. On open boards use search/filter/ids **with** capped paging, not endless unfiltered scans.

## Link column direction

Like a foreign key: the board-relation column lives on **exactly one** side.

- **Source side (`linkSide: "source"`)** — Each **source** row stores a reference to **one** target item. This tool issues one write per pair on `sourceBoardId`.
- **Target side (`linkSide: "target"`)** — Each **target** row stores references to **multiple** source items. This tool **merges** new source IDs with any existing `linked_item_ids` on that target row, then writes once per distinct `targetItemId`.

## Workflow (follow in order)

### Step 1 — Identify boards and the relation column

- Decide which board is **source** (e.g. invoices) vs **target** (e.g. vendors) for your mental model.
- Use `get_board_info` / `get_board_schema` to find the **board-relation** column id and which board it lives on.
- Set `linkSide` to `"source"` if that column is on `sourceBoardId`, else `"target"` if it is on `targetBoardId`.

### Step 2 — Define what “equal” means for matching

- **Column-to-column:** one compare column per side; fetch values per **principle 1**.
- **Name-only:** normalized item `name`; no column payloads.
- **Deterministic** match (trim, normalize, case-insensitive equality on one field per side). Resolve fuzzy ties **before** `pairs`.

### Step 3 — Fetch sources with discipline

- Call `get_board_items_page` on `sourceBoardId`.
- **Columns:** `includeColumns: true` and `columnIds` = only compare columns from Step 2, plus `linkColumnId` only if you must read that column; **name-only** Step 2 → leave `includeColumns` false (principle **1**).
- **Discovery (pick what fits):** pass any of `searchTerm`, `filters`, `itemIds` (≤ **100** IDs per request; split larger lists), alone or together; then follow `nextCursor` / `has_more` while you still need coverage (principle **2**).
- **While fetching:** stay under memory/page **budget**, **discard** rows you have ruled out, and do not assume one page is the full board (principle **4**).

### Step 4 — Fetch targets with discipline

- Call `get_board_items_page` on `targetBoardId` with the **same column discipline** as Step 3.
- **Discovery** can differ from sources (e.g. heavier `searchTerm` / `filters` on a large target board); same paging, discard, and budget rules (principles **2** and **4**).

### Step 5 — Build candidate matches; handle ambiguity without guessing

- Per source: **zero or one** target by Step 2. **Zero** → omit from `pairs` (or report unmatched). **Several** plausible matches at once → **do not** write that source; widen or change the query, omit, or ask the user (principle **3**).

### Step 6 — Verify and call `link_board_items`

- `pairs` from Step 5; each `sourceItemId` **at most once** (tool dedupes identical pairs). Pass `sourceBoardId`, `targetBoardId`, `linkSide`, `linkColumnId`, `pairs`.

### Step 7 — Interpret the result and recover

- Response includes `succeeded` and `failed` per pair (or per pair grouped under a failed target write on the target side).
- For failures, inspect the error, fix data or permissions, adjust pairs, and retry affected rows (`change_item_column_values` for a single fix is fine).

## Examples

**Example A — Link column on source board**

- Relation `link_mkxx` on source board 111 → target 222; matched invoice `9876543` → vendor `1112222`.
- `linkSide: "source"`, `sourceBoardId: 111`, `targetBoardId: 222`, `linkColumnId: "link_mkxx"`, `pairs: [{ sourceItemId: "9876543", targetItemId: "1112222" }]`.

**Example B — Link column on target board**

- Relation on **vendor** board; invoices `s1`, `s2` → vendor `t9`. Tool merges with existing links on `t9`.
- `linkSide: "target"`, boards + `linkColumnId` as appropriate, `pairs: [{ sourceItemId: "s1", targetItemId: "t9" }, { sourceItemId: "s2", targetItemId: "t9" }]`.

**Example C — Large board (illustrative)**

- Name-match task **"react upgrade"** to one epic: e.g. `searchTerm` on a token from the task name, **or** chunked `itemIds` if you already have candidates, **or** `filters` plus `nextCursor` — any path is fine if it respects principles **1–4**.
- Call `link_board_items` with one `pair` once exactly one epic matches your Step 2 rule.

