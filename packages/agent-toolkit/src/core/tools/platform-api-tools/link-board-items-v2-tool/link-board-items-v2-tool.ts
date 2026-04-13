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
 * Skill-style tool documentation: when/how to use, workflow (cardinality, link direction, exact match, scale, errors).
 * Stresses correct pagination (not only multi-pair writes).
 */
const LINK_BOARD_ITEMS_V2_DOCUMENTATION = `
# Link Board Items — guided fetch workflow and relation writes

## Purpose

Link items across two monday.com boards by **board-relation** columns. This tool **only applies writes** for explicit \`(sourceItemId, targetItemId)\` pairs you supply — **one pair or many**. The main value is the **documented way to fetch and match**: use \`get_board_items_page\` (and related tools) so you **do not treat the first page as the whole board**, narrow scope with filters and \`columnIds\`, then match with clear rules before writing.

You perform discovery, pagination, and matching yourself; this description tells you **how** so linking stays correct, bounded, and reviewable.

**Cardinality:** each source links to **at most one** target per call — **not** one source → multiple targets in a single call. Many sources may share the same target. If a source could match several targets, **do not guess**; narrow the dataset and re-match until there is a single confident target or leave that source unmatched.

Common use cases: invoices → vendors, contacts → accounts, orders → customers, sub-items → parent projects (domain-agnostic). A **single** new invoice row that needs its vendor resolved once is in scope: still follow the fetch steps, then pass a \`pairs\` array of length 1.

## When to use this tool

- You are linking **one or more** source rows to targets and want the **fetch workflow** (page through \`has_more\`, narrow with filters/\`itemIds\`, minimal columns) so you do not miss items after the first page or pull unnecessary data.
- You have finished matching and want a **consistent** write path for the board-relation column (same payload shape as \`change_item_column_values\`), whether that is one write or several.
- The relation column may live on **either** board; you know \`linkSide\` and \`linkColumnId\`.

## When not to use this tool

- You **already** have both item IDs and the correct relation value and **did not** need paged discovery — \`change_item_column_values\` alone is enough.
- You expect fetch, match, and write to run automatically inside one opaque API call without you paging boards yourself — this tool only persists the \`pairs\` you pass after **you** complete discovery and matching.

## Core principles

1. **No guessing on ambiguity** — If more than one target item plausibly matches a source, do not call this tool with an arbitrary pick. Refine \`filters\`, \`itemIds\`, \`searchTerm\`, or compare columns until exactly one target remains or skip that source.
2. **Page to completion — do not stop after one page** — For each board you read from, repeat \`get_board_items_page\` using \`pagination.nextCursor\` until \`has_more\` is false. **Giving up after the first page is a common mistake** and causes missed matches when the item you need is on page 2 or later.
3. **Narrow before you fetch** — Prefer server-side \`filters\`, \`itemIds\` (max **100** IDs per request per \`ItemsQuery\`), \`searchTerm\` for vague cross-field phrases, and \`columnIds\` with \`includeColumns: true\` only for columns you need (match fields + link column if you must read existing links). Use \`is_empty\` on the link column to limit to unlinked rows when appropriate.
4. **Exact match baseline** — Prefer deterministic matching: case-insensitive equality on **one** column id per side, or on **item name** if you deliberately compare names only. Trim and normalize before comparing. For fuzzy or meaning-based ties, resolve in your reasoning **before** building \`pairs\` — **you** are the matcher.

## Link column direction

Like a foreign key: the board-relation column lives on **exactly one** side.

- **Source side (\`linkSide: "source"\`)** — Each **source** row stores a reference to **one** target item. This tool issues one write per pair on \`sourceBoardId\`.
- **Target side (\`linkSide: "target"\`)** — Each **target** row stores references to **multiple** source items. This tool **merges** new source IDs with any existing \`linked_item_ids\` on that target row, then writes once per distinct \`targetItemId\`.

## Scale awareness

When paging without narrowing, boards can be large: \`get_board_items_page\` returns a **page** at a time (often on the order of tens to a few hundred items per request depending on \`limit\`). Prefer **filters** and **itemIds** so you do not load more into context than necessary. Split **more than 100** explicit IDs across multiple \`get_board_items_page\` calls (GraphQL \`ItemsQuery.ids\` limit).

## Workflow (follow in order)

### Step 1 — Identify boards and the relation column

- Decide which board is **source** (e.g. invoices) vs **target** (e.g. vendors) for your mental model.
- Use \`get_board_info\` / \`get_board_schema\` to find the **board-relation** column id and which board it lives on.
- Set \`linkSide\` to \`"source"\` if that column is on \`sourceBoardId\`, else \`"target"\` if it is on \`targetBoardId\`.

### Step 2 — Define what “equal” means for matching

- **Name-only:** compare item \`name\` strings (normalized).
- **Column-to-column:** one column id on the source board vs one on the target board (single compare field per side).
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

- Build \`pairs: [{ sourceItemId, targetItemId }, ...]\` from Step 5 only (length 1 is fine).
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
      'One or more verified pairs to write (a single-element array is valid). Build only after Steps 1–5 in the tool description: pagination through has_more finished on every board you relied on, ambiguity resolved. Duplicate identical pairs are deduped; the same source with two different targets is rejected.',
    ),
};

export type LinkBoardItemsV2ToolInput = typeof linkBoardItemsV2ToolSchema;

type NormalizedPair = { sourceItemId: string; targetItemId: string };

export class LinkBoardItemsV2Tool extends BaseMondayApiTool<LinkBoardItemsV2ToolInput> {
  name = 'link_board_items_v2';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Link Board Items',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      'Use when linking items across boards with a **board-relation** column and you want a clear workflow for **fetching items correctly** — especially paging with `get_board_items_page` until `has_more` is false, not stopping after the first page. Applies to **one source row or many**: you match, then this tool writes explicit `pairs` (same relation payload as `change_item_column_values`). It does not fetch or match for you; read the sections below before building `pairs`.\n\n' +
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
