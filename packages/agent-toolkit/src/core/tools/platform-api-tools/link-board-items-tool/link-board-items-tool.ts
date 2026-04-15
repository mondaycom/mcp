import { z } from 'zod';

import {
  ChangeItemColumnValuesMutation,
  ChangeItemColumnValuesMutationVariables,
  GetLinkCandidateItemsQuery,
  GetLinkCandidateItemsQueryVariables,
  ItemsQuery,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { changeItemColumnValues } from '../../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getLinkCandidateItems } from './link-board-items-tool.graphql';

const MAX_ITEM_IDS_PER_QUERY = 100;
const FETCH_PAGE_SIZE = 200;

/**
 * Skill-style tool documentation: when/how to use, workflow (cardinality, link direction, scale, errors).
 * Stresses minimal columnIds, agent-chosen discovery (search/filter/ids/paging), and bounded paging.
 */
const LINK_BOARD_ITEMS_DOCUMENTATION = `
# Link Board Items — guided fetch workflow and relation writes

## Purpose

Applies writes only: explicit \`(sourceItemId, targetItemId)\` pairs for a **board-relation** column. Discovery and matching are **yours** (see principles).

**Cardinality:** at most **one** target per \`sourceItemId\` per call; many sources may share one target. If several targets could match, **do not guess** — refine, omit from \`pairs\`, or ask the user.

## When to use this tool

- After **your** bounded discovery on large boards, you want this tool’s **write** for the relation (same payload as \`change_item_column_values\`), alone or batched.
- You know \`linkSide\` and \`linkColumnId\` (column may live on source or target board).

## When not to use this tool

- You **already** have both item IDs and the correct relation value and **did not** need paged discovery — \`change_item_column_values\` alone is enough.
- You expect fetch, match, and write to run automatically inside one opaque API call without you paging boards yourself — this tool only persists the \`pairs\` you pass after **you** complete discovery and matching.

## Core principles

1. **Minimal column payloads** — \`includeColumns: true\` and \`columnIds\` = **only** compare columns (plus \`linkColumnId\` if you must read it, e.g. \`is_empty\` / existing links). Never request unrelated columns. **Name-only** match on item \`name\` → skip column payloads.
2. **Discovery** — On \`get_board_items_page\`, combine \`searchTerm\`, \`filters\`, \`itemIds\` (≤ **100** IDs per call; chunk larger sets), and \`nextCursor\` / \`has_more\` however fits; no fixed order. Prefer narrowing when it clearly saves work.
3. **Ambiguity** — Multiple plausible targets **among rows you already evaluated** under your rule, after a fair attempt to slice or page a large board, is ambiguity — do not pick arbitrarily; refine, **omit** from \`pairs\`, or **ask**. **One thin page** of a huge board alone is **not** enough to call that ambiguity.
4. **Scale** — Do not treat page 1 as the whole board. **Discard** dead rows between pages. **Budget** (e.g. ~**500** items in memory across joined boards or ~**10** pages per side per pass) — then change query, partial write, split, or ask. On open boards use search/filter/ids **with** capped paging, not endless unfiltered scans.

## Link column direction

Like a foreign key: the board-relation column lives on **exactly one** side.

- **Source side (\`linkSide: "source"\`)** — Each **source** row stores a reference to **one** target item. This tool issues one write per pair on \`sourceBoardId\`.
- **Target side (\`linkSide: "target"\`)** — Each **target** row stores references to **multiple** source items. This tool **merges** new source IDs with any existing \`linked_item_ids\` on that target row, then writes once per distinct \`targetItemId\`.

## Workflow (follow in order)

### Step 1 — Identify boards and the relation column

- Decide which board is **source** (e.g. invoices) vs **target** (e.g. vendors) for your mental model.
- Use \`get_board_info\` / \`get_board_schema\` to find the **board-relation** column id and which board it lives on.
- Set \`linkSide\` to \`"source"\` if that column is on \`sourceBoardId\`, else \`"target"\` if it is on \`targetBoardId\`.

### Step 2 — Define what “equal” means for matching

- **Column-to-column:** one compare column per side; fetch values per **principle 1**.
- **Name-only:** normalized item \`name\`; no column payloads.
- **Deterministic** match (trim, normalize, case-insensitive equality on one field per side). Resolve fuzzy ties **before** \`pairs\`.

### Step 3 — Fetch sources with discipline

- Call \`get_board_items_page\` on \`sourceBoardId\`.
- **Columns:** \`includeColumns: true\` and \`columnIds\` = only compare columns from Step 2, plus \`linkColumnId\` only if you must read that column; **name-only** Step 2 → leave \`includeColumns\` false (principle **1**).
- **Discovery (pick what fits):** pass any of \`searchTerm\`, \`filters\`, \`itemIds\` (≤ **100** IDs per request; split larger lists), alone or together; then follow \`nextCursor\` / \`has_more\` while you still need coverage (principle **2**).
- **While fetching:** stay under memory/page **budget**, **discard** rows you have ruled out, and do not assume one page is the full board (principle **4**).

### Step 4 — Fetch targets with discipline

- Call \`get_board_items_page\` on \`targetBoardId\` with the **same column discipline** as Step 3.
- **Discovery** can differ from sources (e.g. heavier \`searchTerm\` / \`filters\` on a large target board); same paging, discard, and budget rules (principles **2** and **4**).

### Step 5 — Build candidate matches; handle ambiguity without guessing

- Per source: **zero or one** target by Step 2. **Zero** → omit from \`pairs\` (or report unmatched). **Several** plausible matches at once → **do not** write that source; widen or change the query, omit, or ask the user (principle **3**).

### Step 6 — Verify and call \`link_board_items\`

- \`pairs\` from Step 5; each \`sourceItemId\` **at most once** (tool dedupes identical pairs). Pass \`sourceBoardId\`, \`targetBoardId\`, \`linkSide\`, \`linkColumnId\`, \`pairs\`.

### Step 7 — Interpret the result and recover

- Response includes \`succeeded\` and \`failed\` per pair (or per pair grouped under a failed target write on the target side).
- For failures, inspect the error, fix data or permissions, adjust pairs, and retry affected rows (\`change_item_column_values\` for a single fix is fine).

## Examples

**Example A — Link column on source board**

- Relation \`link_mkxx\` on source board 111 → target 222; matched invoice \`9876543\` → vendor \`1112222\`.
- \`linkSide: "source"\`, \`sourceBoardId: 111\`, \`targetBoardId: 222\`, \`linkColumnId: "link_mkxx"\`, \`pairs: [{ sourceItemId: "9876543", targetItemId: "1112222" }]\`.

**Example B — Link column on target board**

- Relation on **vendor** board; invoices \`s1\`, \`s2\` → vendor \`t9\`. Tool merges with existing links on \`t9\`.
- \`linkSide: "target"\`, boards + \`linkColumnId\` as appropriate, \`pairs: [{ sourceItemId: "s1", targetItemId: "t9" }, { sourceItemId: "s2", targetItemId: "t9" }]\`.

**Example C — Large board (illustrative)**

- Name-match task **"react upgrade"** to one epic: e.g. \`searchTerm\` on a token from the task name, **or** chunked \`itemIds\` if you already have candidates, **or** \`filters\` plus \`nextCursor\` — any path is fine if it respects principles **1–4**.
- Call \`link_board_items\` with one \`pair\` once exactly one epic matches your Step 2 rule.
`.trim();

export const linkBoardItemsToolSchema = {
  sourceBoardId: z
    .number()
    .describe(
      'Board whose items you treat as **sources** in the relationship (e.g. invoices, orders). Must match how you built `pairs` (each `sourceItemId` belongs to this board). See "Purpose" and "Workflow" in the tool description.',
    ),
  targetBoardId: z
    .number()
    .describe(
      'Board whose items you treat as **targets** (e.g. vendors, accounts). Each `targetItemId` in `pairs` belongs to this board. See "Link column direction" in the tool description.',
    ),
  linkSide: z
    .enum(['source', 'target'])
    .describe(
      'Which board **owns** the board-relation column: `"source"` = column on `sourceBoardId` (each source row points at one target). `"target"` = column on `targetBoardId` (each target row holds many source links; this tool merges new IDs with existing). Exactly one side stores the relation.',
    ),
  linkColumnId: z
    .string()
    .describe(
      'Board-relation column id on the board indicated by `linkSide`. Obtain via `get_board_info` / `get_board_schema`.',
    ),
  pairs: z
    .array(
      z.object({
        sourceItemId: z
          .union([z.string(), z.number()])
          .describe(
            'monday item ID on **sourceBoardId**. After following the workflow: one row per source at most in this array.',
          ),
        targetItemId: z
          .union([z.string(), z.number()])
          .describe('monday item ID on **targetBoardId** — the single chosen counterpart for this source in this call.'),
      }),
    )
    .min(1)
    .describe(
      'Verified pairs to write from Steps 1–5 for this call. Omit ambiguous sources (or wait for user input). Duplicate identical pairs are deduped; the same source with two different targets is rejected.',
    ),
};

export type LinkBoardItemsToolInput = typeof linkBoardItemsToolSchema;

type NormalizedPair = { sourceItemId: string; targetItemId: string };

export class LinkBoardItemsTool extends BaseMondayApiTool<LinkBoardItemsToolInput> {
  name = 'link_board_items';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Link Board Items',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      'Use when linking across boards via **board-relation**: **you** fetch and match (bounded), with **minimal `columnIds`** when columns matter, then this tool writes `pairs` (same payload shape as `change_item_column_values`). Details below.\n\n' +
      LINK_BOARD_ITEMS_DOCUMENTATION
    );
  }

  getInputSchema(): LinkBoardItemsToolInput {
    return linkBoardItemsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<LinkBoardItemsToolInput>,
  ): Promise<ToolOutputType<never>> {
    const pairs = this.normalizeAndDedupePairs(input.pairs);
    this.assertSingleTargetPerSource(pairs);

    const succeeded: NormalizedPair[] = [];
    const failed: Array<NormalizedPair & { error: string }> = [];

    if (input.linkSide === 'source') {
      for (const p of pairs) {
        try {
          await this.changeLinkColumn(input.sourceBoardId, p.sourceItemId, input.linkColumnId, {
            item_ids: [p.targetItemId],
          });
          succeeded.push(p);
        } catch (err) {
          failed.push({ ...p, error: err instanceof Error ? err.message : String(err) });
        }
      }
    } else {
      const byTarget = new Map<string, string[]>();
      for (const p of pairs) {
        if (!byTarget.has(p.targetItemId)) byTarget.set(p.targetItemId, []);
        byTarget.get(p.targetItemId)!.push(p.sourceItemId);
      }
      const targetIds = [...byTarget.keys()];
      const existing = await this.fetchExistingLinkedIds(input.targetBoardId, input.linkColumnId, targetIds);

      for (const targetId of targetIds) {
        const newSourceIds = byTarget.get(targetId)!;
        const prior = existing.get(targetId) ?? [];
        const merged = [...new Set([...prior, ...newSourceIds])];
        const pairsForTarget = newSourceIds.map((sourceItemId) => ({ sourceItemId, targetItemId: targetId }));
        try {
          await this.changeLinkColumn(input.targetBoardId, targetId, input.linkColumnId, { item_ids: merged });
          succeeded.push(...pairsForTarget);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          failed.push(...pairsForTarget.map((pair) => ({ ...pair, error: message })));
        }
      }
    }

    const summary =
      failed.length === 0
        ? `Linked ${succeeded.length} pair(s) on ${input.linkSide} side.`
        : `Linked ${succeeded.length} pair(s); ${failed.length} pair(s) failed.`;

    return {
      content: {
        link_side: input.linkSide,
        source_board_id: input.sourceBoardId,
        target_board_id: input.targetBoardId,
        succeeded,
        failed,
        summary,
      },
    };
  }

  private normalizeAndDedupePairs(
    raw: ToolInputType<LinkBoardItemsToolInput>['pairs'],
  ): NormalizedPair[] {
    const seen = new Set<string>();
    const out: NormalizedPair[] = [];
    for (const row of raw) {
      const sourceItemId = String(row.sourceItemId);
      const targetItemId = String(row.targetItemId);
      const key = `${sourceItemId}:${targetItemId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ sourceItemId, targetItemId });
    }
    return out;
  }

  private assertSingleTargetPerSource(pairs: NormalizedPair[]): void {
    const map = new Map<string, string>();
    for (const p of pairs) {
      const prev = map.get(p.sourceItemId);
      if (prev !== undefined && prev !== p.targetItemId) {
        throw new Error(
          `Each sourceItemId may map to only one targetItemId per call. Source ${p.sourceItemId} was given targets ${prev} and ${p.targetItemId}.`,
        );
      }
      map.set(p.sourceItemId, p.targetItemId);
    }
  }

  private async changeLinkColumn(
    boardId: number,
    itemId: string,
    linkColumnId: string,
    relationPayload: { item_ids: string[] },
  ): Promise<void> {
    const columnValues = JSON.stringify({ [linkColumnId]: relationPayload });
    const variables: ChangeItemColumnValuesMutationVariables = {
      boardId: String(boardId),
      itemId,
      columnValues,
    };
    await this.mondayApi.request<ChangeItemColumnValuesMutation>(changeItemColumnValues, variables);
  }

  private async fetchExistingLinkedIds(
    boardId: number,
    linkColumnId: string,
    itemIds: string[],
  ): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    for (let i = 0; i < itemIds.length; i += MAX_ITEM_IDS_PER_QUERY) {
      const chunk = itemIds.slice(i, i + MAX_ITEM_IDS_PER_QUERY);
      const queryParams: ItemsQuery = { ids: chunk };
      const variables: GetLinkCandidateItemsQueryVariables = {
        boardId: String(boardId),
        limit: FETCH_PAGE_SIZE,
        columnIds: [linkColumnId],
        queryParams,
      };
      const res = await this.mondayApi.request<GetLinkCandidateItemsQuery>(getLinkCandidateItems, variables);
      const items = res.boards?.[0]?.items_page?.items ?? [];
      for (const item of items) {
        if (!item) continue;
        let linked: string[] | undefined;
        for (const cv of item.column_values ?? []) {
          if (!cv || cv.id !== linkColumnId) continue;
          if ('linked_item_ids' in cv && Array.isArray(cv.linked_item_ids)) {
            linked = cv.linked_item_ids.map(String);
            break;
          }
        }
        result.set(item.id, linked ?? []);
      }
    }
    for (const id of itemIds) {
      if (!result.has(id)) result.set(id, []);
    }
    return result;
  }
}
