# Link board items — agent instructions

Human-readable copy of the workflow embedded in the `link_board_items_v2` MCP tool description.

**Keeping in sync:** The published package ships only compiled JS (`dist/`). The tool still exposes this text via a string in `link-board-items-v2-tool.ts`. When you change instructions, update **both** this file and `LINK_BOARD_ITEMS_V2_DOCUMENTATION` in that file (or vice versa). TypeScript does **not** import this `.md` at build or runtime without extra Rollup plugins and shipping assets.

---

## MCP tool summary (opening line)

Use when linking items across boards with a **board-relation** column and you want a workflow for **fetching and matching on large boards** without loading every row: page with `get_board_items_page`, drop non-candidates between pages, and respect a memory/page budget (see below). You match, then this tool writes explicit `pairs` (same relation payload as `change_item_column_values`). It does not fetch or match for you; read the sections below before building `pairs`.

---

# Link Board Items — guided fetch workflow and relation writes

## Purpose

Link items across two monday.com boards by **board-relation** columns. This tool **only applies writes** for explicit `(sourceItemId, targetItemId)` pairs you supply. The main value is the **documented way to fetch and match** on large boards without loading every row: use `get_board_items_page` (and related tools), narrow with filters and `itemIds`, fetch compare values with `includeColumns: true` and a tight `columnIds` list, match in bounded chunks, then write with clear rules.

You perform discovery, pagination, and matching yourself; this description tells you **how** so linking stays correct, bounded, and reviewable.

**Cardinality:** each source links to **at most one** target per call — **not** one source → multiple targets in a single call. Many sources may share the same target. If a source could match several targets, **do not guess**; you may narrow and re-fetch, **or stop and do nothing for that source** (omit it from `pairs`) — including **asking the user** which row to link when that is appropriate.

Common use cases: invoices → vendors, contacts → accounts, orders → customers, sub-items → parent projects (domain-agnostic). Incremental linking of one new row uses the same workflow as many rows.

## When to use this tool

- You are linking **one or more** source rows to targets and want the **fetch workflow** (bounded paging, narrow with filters/`itemIds`, request only the compare `columnIds` you need, discard non-candidates between pages) so you neither assume one page is exhaustive nor load unlimited rows.
- You have finished matching and want a **consistent** write path for the board-relation column (same payload shape as `change_item_column_values`), whether that is one write or several.
- The relation column may live on **either** board; you know `linkSide` and `linkColumnId`.

## When not to use this tool

- You **already** have both item IDs and the correct relation value and **did not** need paged discovery — `change_item_column_values` alone is enough.
- You expect fetch, match, and write to run automatically inside one opaque API call without you paging boards yourself — this tool only persists the `pairs` you pass after **you** complete discovery and matching.

## Core principles

1. **No guessing on ambiguity** — If more than one target item plausibly matches a source, do not call this tool with an arbitrary pick. Acceptable outcomes: refine `filters`, `itemIds`, `searchTerm`, or compare columns and try again; **omit that source from `pairs` and do not link it**; or **ask the user** which target (or what to do) — all are better than guessing.
2. **Large boards — page, match, discard, cap** — You cannot load **all** items from a huge board into context. Still, **do not assume the first page is the whole board** (the match may be on page 2+). Work **one page at a time** with `get_board_items_page` and `nextCursor`: match sources against the current window, **drop** rows that clearly cannot match before pulling the next page, and keep server-side `filters` / `itemIds` / `searchTerm` tight. Use a **budget** so work stays bounded — for example stop loading further pages for a pass once you hold about **500** items in memory across the boards you are joining **or** after about **10** pages on a side (whichever you hit first), then narrow the query, write partial `pairs`, split the job, or ask the user — do not grow context without limit.
3. **Narrow before you fetch** — Prefer server-side `filters`, `itemIds` (max **100** IDs per request), and `searchTerm` for vague cross-field phrases. **Comparing on board columns requires those values** — use `includeColumns: true` and list each compare column in `columnIds`; add `linkColumnId` there only if you need that column's value (e.g. `is_empty`, existing links). The **only** case where you skip `includeColumns` is **name-only** matching (compare item `name` only — names are returned without column payloads). Use `is_empty` on the link column when appropriate.
4. **Exact match baseline** — Prefer deterministic matching: case-insensitive equality on **one** column id per side, or on **item name** if you deliberately compare names only. Trim and normalize before comparing. For fuzzy or meaning-based ties, resolve in your reasoning **before** building `pairs` — **you** are the matcher.

## Link column direction

Like a foreign key: the board-relation column lives on **exactly one** side.

- **Source side (`linkSide: "source"`)** — Each **source** row stores a reference to **one** target item. This tool issues one write per pair on `sourceBoardId`.
- **Target side (`linkSide: "target"`)** — Each **target** row stores references to **multiple** source items. This tool **merges** new source IDs with any existing `linked_item_ids` on that target row, then writes once per distinct `targetItemId`.

## Scale awareness

`get_board_items_page` returns a **page** at a time (size depends on `limit`). Prefer **filters** and **itemIds** so each page is relevant. Split **more than 100** explicit IDs across multiple calls. Combine with the **~500 items in memory / ~10 pages per side** budget in principle 2 — paging until `has_more` is false is ideal only when the narrowed set is small enough; otherwise work in capped passes.

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

- Call `get_board_items_page` for `sourceBoardId` with narrowing params. For column-to-column matching: `includeColumns: true` and `columnIds` = compare columns; include `linkColumnId` in `columnIds` only if you need that column's value. For name-only: `includeColumns` can stay false.
- Page with `nextCursor` while you still need coverage and you are **under** your memory/page budget (principle 2). Between pages, **discard** source rows already matched or ruled out so the working set stays small.

### Step 4 — Fetch targets with discipline

- Same `includeColumns`, `columnIds`, paging, discard, and **budget** rules as Step 3 for `targetBoardId`.
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
- Call: `linkSide: "target"`, `targetBoardId` = vendor board id, `sourceBoardId` = invoice board id, `linkColumnId` on the vendor board, `pairs: [{ sourceItemId: "s1", targetItemId: "t9" }, { sourceItemId: "s2", targetItemId: "t9" }]`. The tool merges `s1` and `s2` with any existing linked invoice ids on `t9`.

