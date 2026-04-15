# Link board items — agent instructions

Human-readable copy of the workflow embedded in the `link_board_items` MCP tool description.

**Keeping in sync:** The published package ships only compiled JS (`dist/`). The tool still exposes this text via a string in `link-board-items-tool.ts`. When you change instructions, update **both** this file and `LINK_BOARD_ITEMS_DOCUMENTATION` in that file (or vice versa). TypeScript does **not** import this `.md` at build or runtime without extra Rollup plugins and shipping assets.

---

## MCP tool summary (opening line)

Apply **board-relation** links you have already matched: pass explicit `pairs` of `sourceItemId` + `targetItemId`. The full description below also explains how to fetch and match items properly before you invoke this tool.

**Narrow** wide boards with `searchTerm`, `filters`, and/or chunked `itemIds` (≤100 per call)—avoid relying on a single unfiltered page. **Name match on a large target board:** often set `searchTerm` from the **source** item name (distinctive token), then `nextCursor`—not one unfiltered page. **Columns:** `includeColumns: true` with only the `columnIds` you need (except name-only matching on item `name`). **Paging:** when `has_more`, follow with `nextCursor` until your Step 2 match is supported by the data or principle 4 budget stops you; do not stop after page 1 by default on large boards. **Ambiguity** = a **tie**: two or more **fetched** rows each fully satisfy Step 2—not "no match yet" while `has_more` is still true (keep paging). **Soft prompts** (e.g. link to an epic): often omit **matching** wording even when the board is inferable—still run full narrow + paging; fix any missing board/column/rule before the first `get_board_items_page` when not inferable.

---

# Link Board Items — guided fetch workflow and relation writes

## Read first (before any board fetch)

- **Narrow:** use `searchTerm`, `filters`, and/or `itemIds` (≤ **100** IDs per call, chunk larger lists)—especially on wide boards. A single unfiltered first page is usually **not** enough context. For **name-like** Step 2 on a **large target board**, a **typical** first step is `searchTerm` built from **distinctive token(s) in the source item name** (e.g. task **react upgrade** → `react` on the epics `get_board_items_page`), then page that slice with `nextCursor`—models often skip this on casual prompts and stop after one wide page.
- **Chat-style prompts:** Short asks (e.g. link X to **an** epic) often omit **matching** intent or a board name—even when you **already infer** the Epics board from context. That is **not** a reason to stop after **one** `get_board_items_page`: still narrow, use `nextCursor` while `has_more`, and treat no suitable row on page 1 as **incomplete search** if `has_more` is true. If target board, relation column, or Step 2 is **unknown**, pin it down first (context or one minimal question)—same discipline as for an explicit prompt (…**matching** epic on the **Epics Board**).
- **Columns:** `includeColumns: true` with **only** the `columnIds` you need (see principle **1**); name-only on `name` → skip column payloads.
- **Page:** if `has_more` is true and you still need more rows to apply Step 2 (or to be confident there is no match in **this** query slice), call again with `nextCursor`. Do not ignore `has_more` because the first page "looked empty enough." Stop when principle **4** budget says to change strategy—not by default after page 1 on a large board.
- **Ambiguity (tie) vs. still searching:** **Ambiguity** = among rows you **already fetched**, **two or more** each **fully** satisfy Step 2 as the **one** intended target (a real tie)—then refine or omit. **Not ambiguity:** you want **one** specific match, **none** of the loaded rows pass Step 2 yet, and **`has_more` is true** (and under principle **4** budget)—that is **incomplete search**; call again with **`nextCursor`**. Do not treat "no match on page 1" or "100 rows, none is my epic yet" as a tie while **`has_more`** is still true.

## Purpose

Applies writes only: explicit `(sourceItemId, targetItemId)` pairs for a **board-relation** column. Discovery and matching are **yours** (see principles).

**Cardinality:** at most **one** target per `sourceItemId` per call; many sources may share one target. If several targets could match, **do not guess** — refine or omit from `pairs`.

## When to use this tool

- After **your** bounded discovery on large boards, you want this tool’s **write** for the relation, alone or batched.
- You know `linkSide` and `linkColumnId` (column may live on source or target board).

## When not to use this tool

- You **already** have both item IDs and the correct relation value and **did not** need paged discovery — `change_item_column_values` alone is enough.
- You expect fetch, match, and write to run automatically inside one opaque API call without you paging boards yourself — this tool only persists the `pairs` you pass after **you** complete discovery and matching.

## Core principles

1. **Minimal column payloads** — `includeColumns: true` and `columnIds` = **only** compare columns (plus `linkColumnId` if you must read it, e.g. `is_empty` / existing links). Never request unrelated columns. **Name-only** match on item `name` → skip column payloads.
2. **Discovery** — On `get_board_items_page`, combine `searchTerm`, `filters`, `itemIds` (≤ **100** IDs per call; chunk larger sets), and `nextCursor` / `has_more` however fits; no fixed order. Prefer narrowing when it clearly saves work. **Name match across boards:** seeding the **target** fetch with `searchTerm` from the **source** item name (or title token) is a common way to avoid paging only the first unfiltered slice.
3. **Ambiguity vs. incomplete search** — **Ambiguity** (true tie): among rows you **already loaded**, **two or more** items **each** fully meet your Step 2 rule as the **single** chosen target—you cannot pick one arbitrarily; refine or **omit** from `pairs`. **Incomplete search** (not ambiguity): you still seek **one** row that should match Step 2, **no** loaded row passes Step 2 yet, and the API still returns **`has_more: true`** (and you are under principle **4** budget)—you **must** keep paging with `nextCursor` (or widen the query). **Never** treat "I scanned N rows and have not seen my target yet" as ambiguity while `has_more` is true. **One thin page** alone is not a tie. **Many rows on the board** is not ambiguity by itself.
4. **Scale** — Do not treat page 1 as the whole board. **Discard** dead rows between pages. **Budget** (e.g. ~**500** items in memory across joined boards or ~**10** pages per side per pass) — then change query, partial write, or split. On open boards use search/filter/ids **with** capped paging, not endless unfiltered scans.

## Involving the user

Ask the user only for **ambiguity** (a true tie: two or more fetched rows each fully satisfy Step 2), and only **after** you have completed search/paging for the current query slice (`nextCursor` while `has_more`, within principle **4** budget—or budget exhausted without a single clear match). Never right after one thin page while `has_more` is still true.

## Link column direction

Like a foreign key: the board-relation column lives on **exactly one** side.

- **Source side (`linkSide: "source"`)** — Each **source** row stores a reference to **one** target item. This tool issues one write per pair on `sourceBoardId`.
- **Target side (`linkSide: "target"`)** — Each **target** row stores references to **multiple** source items. This tool **merges** new source IDs with any existing `linked_item_ids` on that target row, then writes once per distinct `targetItemId`.

## Workflow (follow in order)

### Step 1 — Identify boards and the relation column

- Decide which board is **source** (e.g. invoices) vs **target** (e.g. vendors) for your mental model.
- If the user names only an item and a vague role (**an** epic, **the** vendor), confirm **target board**, **relation column**, and Step 2 (infer from context when possible)—do not start blind `get_board_items_page` on the wrong board. **Informal wording does not shorten discovery:** even when the board is obvious, complete narrow + paging for that query; casual phrasing is not a signal to fetch a single page and stop.
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
- **Paging:** if `has_more` is true and you still need more items for Step 2 (or to finish checking this query slice), pass `nextCursor` on the next call. Ignoring `has_more` after one page is a common failure mode on large boards—keep going until you have enough evidence **or** the budget in principle **4** requires narrowing, splitting, or stopping.

### Step 4 — Fetch targets with discipline

- Call `get_board_items_page` on `targetBoardId` with the **same column discipline** as Step 3.
- **Discovery** can differ from sources (e.g. heavier `searchTerm` / `filters` on a large target board); same paging, discard, and budget rules (principles **2** and **4**). If Step 2 is **name-only** and the target board is large, **prefer** starting with `searchTerm` derived from the source row’s name (or user phrase), then `nextCursor` within that slice—not only an unfiltered first page.
- **Paging:** same as Step 3—use `nextCursor` while `has_more` until Step 2 is satisfiable from fetched data or principle **4** forces a stop.

### Step 5 — Build candidate matches; handle ambiguity without guessing

- Per source: **zero or one** target by Step 2.
- **Zero matches in loaded data** but `has_more` is true (and budget allows) → **keep fetching** with `nextCursor`; that is **not** ambiguity.
- **Zero** after the query slice is exhausted (or budget hit without a match) → omit from `pairs` (or report unmatched).
- **Two or more** loaded rows each **fully** pass Step 2 as the one target (tie) → **do not** write that source; refine or omit (principle **3**; see **Involving the user**).

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

- Name-match task **"react upgrade"** to one epic: a run that **only** does an unfiltered `get_board_items_page` and stops at page 1 often fails; a run that sets `searchTerm` (e.g. `react` / `react upgrade` from the source name) on the **target** board, then pages with `nextCursor`, usually behaves like the user having said **matching** epic explicitly.
- Call `link_board_items` with one `pair` once exactly one epic matches your Step 2 rule.

