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
import { getLinkCandidateItems } from '../link-board-items-tool/link-board-items-tool.graphql';

const MAX_ITEM_IDS_PER_QUERY = 100;
const FETCH_PAGE_SIZE = 200;

/**
 * Skill-style tool documentation: when/how to use, workflow, and excerpts aligned with
 * link_board_items (v1) design (cardinality, link direction, exact match, scale, errors).
 */
const LINK_BOARD_ITEMS_V2_DOCUMENTATION = `
# Link Board Items (v2) — guided workflow and batch write

## Purpose

Link items across two monday.com boards by **board-relation** columns. This tool **only applies writes** for explicit \`(sourceItemId, targetItemId)\` pairs you supply. You perform discovery, pagination, and matching using other tools (\`get_board_items_page\`, \`get_board_info\`, etc.); this tool encodes **how** that work should be done so linking stays correct, bounded, and reviewable.

**Cardinality (same as v1 design):** many sources may each link to **at most one** target per run — **not** one source → multiple targets in a single call. Many sources may share the same target. If a source could match several targets, **do not guess**; narrow the dataset and re-match until there is a single confident target or leave that source unmatched.

Common use cases: invoices → vendors, contacts → accounts, orders → customers, sub-items → parent projects (domain-agnostic).

## When to use this tool

- You need to persist **multiple** board-relation links in one coherent batch after you have already decided each pair.
- You want a **documented workflow** (below) so fetching does not stop after one page, columns stay minimal, and ambiguous matches are resolved before any write.
- The relation column may live on **either** board; you know \`linkSide\` and \`linkColumnId\`.

## When not to use this tool

- You already have the correct IDs and only need **one** item updated — use \`change_item_column_values\` directly.
- You want the platform to fetch all items, match internally, and batch-write without you paging — that is the intent of \`link_board_items\` (v1), not v2.

## Core principles

1. **No guessing on ambiguity** — If more than one target item plausibly matches a source, do not call this tool with an arbitrary pick. Refine \`filters\`, \`itemIds\`, \`searchTerm\`, or compare columns until exactly one target remains or skip that source.
2. **Page to completion** — For each board you read from, repeat \`get_board_items_page\` using \`pagination.nextCursor\` until \`has_more\` is false. A single page is often not the full board.
3. **Narrow before you fetch** — Prefer server-side \`filters\`, \`itemIds\` (max **100** IDs per request per \`ItemsQuery\`), \`searchTerm\` for vague cross-field phrases, and \`columnIds\` with \`includeColumns: true\` only for columns you need (match fields + link column if you must read existing links). Use \`is_empty\` on the link column to limit to unlinked rows when appropriate.
4. **Exact match baseline** — Align with v1 **exact** mode: case-insensitive equality on **one** column id per side (\`matchColumnIds\`-style), or on **item name** if you deliberately compare names only. Trim and normalize before comparing. For fuzzy or meaning-based ties, resolve in your reasoning **before** building \`pairs\` (v1 semantic mode is LLM-in-tool; here **you** are the matcher).

## Link column direction (from v1 design)

Like a foreign key: the board-relation column lives on **exactly one** side.

- **Source side (\`linkSide: "source"\`)** — Each **source** row stores a reference to **one** target item. This tool issues one write per pair on \`sourceBoardId\`.
- **Target side (\`linkSide: "target"\`)** — Each **target** row stores references to **multiple** source items. This tool **merges** new source IDs with any existing \`linked_item_ids\` on that target row, then writes once per distinct \`targetItemId\`.

## Scale awareness

When paging without a hard stop in your own logic, remember large boards: v1 design assumes on the order of **200 items per page** and a **finite** cap per board if you scanned everything (roughly **2,000** items in the full v1 tool). Prefer **filters** and **itemIds** so you never rely on loading an entire huge board into context. Split **more than 100** explicit IDs across multiple \`get_board_items_page\` calls.

## Workflow (follow in order)

### Step 1 — Identify boards and the relation column

- Decide which board is **source** (e.g. invoices) vs **target** (e.g. vendors) for your mental model.
- Use \`get_board_info\` / \`get_board_schema\` to find the **board-relation** column id and which board it lives on.
- Set \`linkSide\` to \`"source"\` if that column is on \`sourceBoardId\`, else \`"target"\` if it is on \`targetBoardId\`.

### Step 2 — Define what “equal” means for matching

- **Name-only:** compare item \`name\` strings (normalized).
- **Column-to-column:** one column id on the source board vs one on the target board (same semantics as v1 exact mode with a single id per side).
- Do not submit \`pairs\` until the rule is fixed and applied consistently.

### Step 3 — Fetch sources with discipline

- Call \`get_board_items_page\` for \`sourceBoardId\` with narrowing params and minimal \`columnIds\`.
- Loop on **cursor** until there are no more pages.

### Step 4 — Fetch targets with discipline

- Same as Step 3 for \`targetBoardId\`.
- If the target board is large, narrow first (\`searchTerm\`, \`filters\`, \`itemIds\`) so you compare against a relevant slice, not a blind full scan when avoidable.

### Step 5 — Build candidate matches and resolve ambiguity

- For each source item, find **zero or one** target using your Step 2 rule.
- **Zero** → omit from \`pairs\` or track as unmatched in your reply to the user.
- **More than one** → treat as an error condition for that source: refine and return to Step 3–4; **do not** pick arbitrarily.

### Step 6 — Verify and call \`link_board_items_v2\`

- Build \`pairs: [{ sourceItemId, targetItemId }, ...]\` from Step 5 only.
- Ensure each \`sourceItemId\` appears **at most once** (duplicate identical pairs are deduped by the tool).
- Invoke this tool with \`sourceBoardId\`, \`targetBoardId\`, \`linkSide\`, \`linkColumnId\`, and \`pairs\`.

### Step 7 — Interpret the result and recover

- Response includes \`succeeded\` and \`failed\` per pair (or per pair grouped under a failed target write on the target side).
- For failures, inspect the error, fix data or permissions, adjust pairs, and retry affected rows (\`change_item_column_values\` for a single fix is fine).

## Examples

**Example A — Link column on source board**

- Source board 111 (invoices), target board 222 (vendors). Relation column \`link_mkxx\` is on board 111.
- After paging and name match, you have invoice \`9876543\` → vendor \`1112222\`.
- Call: \`linkSide: "source"\`, \`sourceBoardId: 111\`, \`targetBoardId: 222\`, \`linkColumnId: "link_mkxx"\`, \`pairs: [{ sourceItemId: "9876543", targetItemId: "1112222" }]\`.

**Example B — Link column on target board**

- Relation column is on the **vendor** board; each vendor row links to many invoices.
- After matching, two invoices \`s1\`, \`s2\` map to the same vendor \`t9\`.
- Call: \`linkSide: "target"\`, \`targetBoardId\` = vendor board id, \`sourceBoardId\` = invoice board id, \`linkColumnId\` on the vendor board, \`pairs: [{ sourceItemId: "s1", targetItemId: "t9" }, { sourceItemId: "s2", targetItemId: "t9" }]\`. The tool merges \`s1\` and \`s2\` with any existing linked invoice ids on \`t9\`.
`.trim();

export const linkBoardItemsV2ToolSchema = {
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
      'Which board **owns** the board-relation column: `"source"` = column on `sourceBoardId` (each source row points at one target). `"target"` = column on `targetBoardId` (each target row holds many source links; this tool merges new IDs with existing). Matches v1 design: exactly one side stores the relation.',
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
      'Verified pairs to write. Build only after Steps 1–5 in the tool description (pagination complete, ambiguity resolved). Duplicate identical pairs are deduped; the same source with two different targets is rejected.',
    ),
};

export type LinkBoardItemsV2ToolInput = typeof linkBoardItemsV2ToolSchema;

type NormalizedPair = { sourceItemId: string; targetItemId: string };

export class LinkBoardItemsV2Tool extends BaseMondayApiTool<LinkBoardItemsV2ToolInput> {
  name = 'link_board_items_v2';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Link Board Items (v2)',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      'Use when you need to **batch-write** board-relation links between two boards after **you** fetch, match, and de-duplicate with `get_board_items_page` (and related tools). Does not discover items or match internally — it applies a skill-like workflow (when/not to use, cardinality, link side, scale, steps, examples) then persists `pairs` via the same relation payload as `change_item_column_values`.\n\n' +
      LINK_BOARD_ITEMS_V2_DOCUMENTATION
    );
  }

  getInputSchema(): LinkBoardItemsV2ToolInput {
    return linkBoardItemsV2ToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<LinkBoardItemsV2ToolInput>,
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
    raw: ToolInputType<LinkBoardItemsV2ToolInput>['pairs'],
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
