# Link board items — agent instructions

Human-readable copy of the workflow embedded in the `link_board_items_v2` MCP tool description.

**Keeping in sync:** The published package ships only compiled JS (`dist/`). The tool still exposes this text via a string in `link-board-items-v2-tool.ts`. When you change instructions, update **both** this file and `LINK_BOARD_ITEMS_V2_DOCUMENTATION` in that file (or vice versa). TypeScript does **not** import this `.md` at build or runtime without extra Rollup plugins and shipping assets.

---

## MCP tool summary (opening line)

Use when linking items across boards with a **board-relation** column. **Before calling:** use `get_board_items_page` with **`limit: 100`** and `nextCursor` until `has_more` is false, narrow with filters/`itemIds`/tight `columnIds` when comparing columns, match and drop non-candidates between pages, then call this tool with explicit `pairs` (same relation payload as `change_item_column_values`). This tool only writes `pairs`; it does not fetch or match. Workflow and rules are below.

---

# Link Board Items — guided fetch workflow and relation writes

## Purpose

Link items across two monday.com boards by **board-relation** columns. This tool **only applies writes** for explicit `(sourceItemId, targetItemId)` pairs you supply. **Before you call it**, list and match rows using `get_board_items_page` with **`limit: 100`** and **`nextCursor`** until `has_more` is false on each board, narrow with `filters` / `itemIds` / `searchTerm`, request compare values with `includeColumns: true` and a tight `columnIds` list when you are not matching on item name alone, then build `pairs`.

You perform discovery, pagination, and matching yourself; this description tells you **how** so linking stays correct, bounded, and reviewable.

**Cardinality:** each source links to **at most one** target per call — **not** one source → multiple targets in a single call. Many sources may share the same target. If a source could match several targets, **do not guess**; you may narrow and re-fetch, **or stop and do nothing for that source** (omit it from `pairs`) — including **asking the user** which row to link when that is appropriate.

Common use cases: invoices → vendors, contacts → accounts, orders → customers, sub-items → parent projects (domain-agnostic). Incremental linking of one new row uses the same workflow as many rows.

## When to use this tool

- You are linking **one or more** source rows to targets and will follow the **fetch workflow**: `get_board_items_page` with **`limit: 100`** and `nextCursor` until `has_more` is false, narrow with filters/`itemIds`, request only the compare `columnIds` you need, discard non-candidates between pages.
- You have finished matching and want a **consistent** write path for the board-relation column (same payload shape as `change_item_column_values`), whether that is one write or several.
- The relation column may live on **either** board; you know `linkSide` and `linkColumnId`.

## When not to use this tool

- You **already** have both item IDs and the correct relation value and **did not** need paged discovery — `change_item_column_values` alone is enough.
- You expect fetch, match, and write to run automatically inside one opaque API call without you paging boards yourself — this tool only persists the `pairs` you pass after **you** complete discovery and matching.

## Core principles

1. **No guessing on ambiguity** — If more than one target item plausibly matches a source, do not call this tool with an arbitrary pick. Acceptable outcomes: refine `filters`, `itemIds`, `searchTerm`, or compare columns and try again; **omit that source from `pairs` and do not link it**; or **ask the user** which target (or what to do) — all are better than guessing.
2. **Page, match, discard, cap** — Use `get_board_items_page` with **`limit: 100`** per request and **`nextCursor`** until `has_more` is false so you never treat the first page as the full board. After each page, match against the window and **drop** rows that cannot match before fetching again; keep `filters` / `itemIds` / `searchTerm` tight. Cap how many rows you **keep in memory** across boards while matching (on the order of **~500** total, or **~10** pages per side): then narrow, write partial `pairs`, split the job, or ask the user. Each fetch stays at **100** rows per call; raising `limit` toward the API maximum to load a board in one shot usually increases GraphQL cost and often fails—if a page errors on complexity, retry with **`limit: 50`**, then **25**, and drop optional payload (`includeSubItems`, unneeded `columnIds`).
3. **Narrow before you fetch** — Prefer server-side `filters`, `itemIds` (max **100** IDs per request), and `searchTerm` for vague cross-field phrases. **Comparing on board columns requires those values** — use `includeColumns: true` and list each compare column in `columnIds`; add `linkColumnId` there only if you need that column's value (e.g. `is_empty`, existing links). The **only** case where you skip `includeColumns` is **name-only** matching (compare item `name` only — names are returned without column payloads). Use `is_empty` on the link column when appropriate.
4. **Exact match baseline** — Prefer deterministic matching: case-insensitive equality on **one** column id per side, or on **item name** if you deliberately compare names only. Trim and normalize before comparing. For fuzzy or meaning-based ties, resolve in your reasoning **before** building `pairs` — **you** are the matcher.

## Link column direction

Like a foreign key: the board-relation column lives on **exactly one** side.

- **Source side (`linkSide: "source"`)** — Each **source** row stores a reference to **one** target item. This tool issues one write per pair on `sourceBoardId`.
- **Target side (`linkSide: "target"`)** — Each **target** row stores references to **multiple** source items. This tool writes `item_ids` once per distinct `targetItemId` using only the `sourceItemId`s from your `pairs` for that target (deduped). Same **replace** semantics as `change_item_column_values`: it does not read or preserve links that are not in this call.

## Workflow (follow in order)

### Step 1 — Identify boards and the relation column

- Decide which board is **source** (e.g. invoices) vs **target** (e.g. vendors) for your mental model.
- Use `get_board_info` / `get_board_schema` to find the **board-relation** column id and which board it lives on.
- Set `linkSide` to `"source"` if that column is on `sourceBoardId`, else `"target"` if it is on `targetBoardId`.

### Step 2 — Define what “equal” means for matching

- **Column-to-column (typical):** one compare column id on the source board vs one on the target. You need the **values** from those columns — plan `includeColumns: true` and those ids in `columnIds` in Step 3–4.
- **Name-only (exception):** compare normalized item `name` only — no column payloads required.
- Do not submit `pairs` until the rule is fixed and applied consistently.

### Step 3 — Fetch sources with discipline

- Call `get_board_items_page` on `sourceBoardId` with **`limit: 100`**, your narrowing params, and **`nextCursor`** until `has_more` is false. For column-to-column matching: `includeColumns: true` and `columnIds` = compare columns; include `linkColumnId` in `columnIds` only if you need that column's value. For name-only: `includeColumns` can stay false. If the API rejects a page for complexity, lower `limit` (**50**, then **25**) and trim optional fields, then continue paging.
- While you still need coverage, stay **under** the working-set budget in principle 2. Between pages, **discard** source rows already matched or ruled out.

### Step 4 — Fetch targets with discipline

- Same as Step 3 on `targetBoardId`: **`limit: 100`**, **`nextCursor`**, same `includeColumns` / `columnIds` rules, discard non-candidates, same budget and complexity handling.
- If the target board is large, narrow first (`searchTerm`, `filters`, `itemIds`) so each page is a relevant slice.

### Step 5 — Build candidate matches; handle ambiguity without guessing

- For each source item, find **zero or one** target using your Step 2 rule.
- **Zero** → omit from `pairs` or track as unmatched in your reply to the user.
- **More than one** → **do not** pick arbitrarily and **do not** add that source to `pairs` until resolved. You may refine and return to Step 3–4, **stop and leave that row unlinked**, or **ask the user** — all are valid.

### Step 6 — Verify and call `link_board_items_v2`

- Build `pairs: [{ sourceItemId, targetItemId }, ...]` from Step 5 only.
- Ensure each `sourceItemId` appears **at most once** (duplicate identical pairs are deduped by the tool).
- Invoke this tool with `sourceBoardId`, `targetBoardId`, `linkSide`, `linkColumnId`, and `pairs`.

### Step 7 — Interpret the result and recover

- Response includes `succeeded` and `failed` per pair (or per pair grouped under a failed target write on the target side).
- For failures, inspect the error, fix data or permissions, adjust pairs, and retry affected rows (`change_item_column_values` for a single fix is fine).

## Examples

**Example A — Link column on source board**

- Source board 111 (invoices), target board 222 (vendors). Relation column `link_mkxx` is on board 111.
- After paging and name match, you have invoice `9876543` → vendor `1112222`.
- Call: `linkSide: "source"`, `sourceBoardId: 111`, `targetBoardId: 222`, `linkColumnId: "link_mkxx"`, `pairs: [{ sourceItemId: "9876543", targetItemId: "1112222" }]`.

**Example B — Link column on target board**

- Relation column is on the **vendor** board; each vendor row links to many invoices.
- After matching, two invoices `s1`, `s2` map to the same vendor `t9`.
- Call: `linkSide: "target"`, `targetBoardId` = vendor board id, `sourceBoardId` = invoice board id, `linkColumnId` on the vendor board, `pairs: [{ sourceItemId: "s1", targetItemId: "t9" }, { sourceItemId: "s2", targetItemId: "t9" }]`. Vendor `t9` gets `item_ids: ["s1","s2"]` only; any other links on that cell are replaced unless you include those IDs in `pairs`.

