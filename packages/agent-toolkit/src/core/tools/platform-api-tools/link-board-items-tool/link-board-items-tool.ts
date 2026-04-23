import { z } from 'zod';

import {
  ChangeItemColumnValuesMutation,
  ChangeItemColumnValuesMutationVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { changeItemColumnValues } from '../../../../monday-graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

const LINK_BOARD_ITEMS_DOCUMENTATION = `
**What this tool does**
It writes a board-relation column from explicit (sourceItemId, targetItemId) pairs.
It does not list boards, page items, or match rows.
The guidance below is how to discover and match so your pairs are correct.
If you only need a single change_item_column_values and already know the relation payload, you may not need this tool.

**1 — Resolve boards and the relation column**
Use get_board_info or get_board_schema to find the board-relation column id and which board that column lives on.
Set linkSide to source if the column is on the source board, or target if it is on the target board.
If the user is vague, confirm the target board, column, and match rule from context or one question before you fetch the wrong place.

**2 — Define a match rule**
Be explicit (compare one column on each side, or compare item names only with normalized text).
Fuzzy or duplicate candidates must be resolved before you add pairs.
For column-to-column compare, you need those column values.
For name-only, you do not need includeColumns.

**3 — Fetch with get_board_items_page (sources then targets)**
A common model failure is to read **only the first page** of results (often one unfiltered or wide page), ignore **has_more** and **nextCursor**, and conclude there is no match, a wrong match, or a false tie.
Do not treat page one as the whole board.
The board is not fully searched for your query slice while **has_more** is true and you still need a row that could satisfy your rule.
Keep calling with **nextCursor** until the slice is complete **within a budget**, then if needed change search terms, split work, or stop and report.

**Budget (rule of thumb)**
About **500** items in memory across the boards you are using for this pass.
About **10** pages per side of a board before you must narrow the query, split, or change strategy, not an endless unfiltered walk.

Vague or short user prompts are not a reason to stop at one page.
Use searchTerm, filters, and item id lists.
At most **100** itemIds per call, chunk larger id lists.
Use **includeColumns** true and **columnIds** with only the columns you compare, plus **linkColumnId** only if you must read that column.
On a large target, seed **searchTerm** from the source item name, then page.
If **has_more** is true and no loaded row matches yet, that is **incomplete search** — keep paging, not a tie.
A **tie** is when two or more rows you **already loaded** each fully qualify as the single target.
Drop dead rows as you go so you do not bloat state.

**4 — Build pairs and involve the user**
You want at most one target per source.
If zero matches after you exhausted the query slice (within the budget) or the budget with no clear row, omit or report.
If two or more loaded rows are a true tie, do not write that source until resolved.
Ask the user only for a **true** tie, and only **after** paging is done for that slice (no more has_more to follow within budget) or the budget is exhausted.
Never treat “nothing on page one” or “has_more is true but I will stop” as a finished search.

**5 — This write**
Pass sourceBoardId, targetBoardId, linkSide, linkColumnId, and pairs.
**source** — one API write per pair, column on the source board.
**target** — one write per distinct targetItemId, with all source ids in pairs for that target.
On the target side the column for that row is **replaced** with those sources, not merged with old links.
Many sources can share one target.
The result lists succeeded and failed by pair, or per failed target on the target side.

**Core ideas (for scan)**
(1) Minimal extra columns, only what you need to compare.
(2) **Page past the first slice** with nextCursor when has_more, up to a budget, instead of a single page.
(3) **Tie** = multiple loaded full matches, not “no match yet” while has_more.
(4) **Budget** limits how far you page before you change the query or split, not a license to only read one page.
`.trim();
export const linkBoardItemsToolSchema = {
  sourceBoardId: z
    .number()
    .describe(
      'Board whose items are sources in the relationship (e.g. invoices, orders). Each sourceItemId in pairs must belong to this board.',
    ),
  targetBoardId: z
    .number()
    .describe(
      'Board whose items are targets (e.g. vendors, accounts). Each targetItemId in pairs must belong to this board.',
    ),
  linkSide: z
    .enum(['source', 'target'])
    .describe(
      'Which board owns the board-relation column. source: column on the source board, one target per source row. target: column on the target board, one write per distinct target, replaces that column for the row. Full behavior is in the tool description.',
    ),
  linkColumnId: z
    .string()
    .describe(
      'Board-relation column id on the side given by linkSide. Obtain from get_board_info or get_board_schema.',
    ),
  pairs: z
    .array(
      z.object({
        sourceItemId: z
          .string()
          .describe('monday item ID on the source board. At most one row per source in the pairs array for this call.'),
        targetItemId: z
          .string()
          .describe('monday item ID on the target board, the single chosen counterpart for that source in this call.'),
      }),
    )
    .min(1)
    .describe('Verified source to target pairs for this call. Omit sources that are still ambiguous or unmatched.'),
};

export type LinkBoardItemsToolInput = typeof linkBoardItemsToolSchema;

type ItemIdPair = { sourceItemId: string; targetItemId: string };

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
    return LINK_BOARD_ITEMS_DOCUMENTATION;
  }

  getInputSchema(): LinkBoardItemsToolInput {
    return linkBoardItemsToolSchema;
  }

  protected async executeInternal(input: ToolInputType<LinkBoardItemsToolInput>): Promise<ToolOutputType<never>> {
    const pairs = input.pairs;

    const succeeded: ItemIdPair[] = [];
    const failed: Array<ItemIdPair & { error: string }> = [];

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
        if (!byTarget.has(p.targetItemId)) {
          byTarget.set(p.targetItemId, []);
        }

        byTarget.get(p.targetItemId)!.push(p.sourceItemId);
      }

      const targetIds = [...byTarget.keys()];

      for (const targetId of targetIds) {
        const newSourceIds = byTarget.get(targetId)!;
        const itemIds = [...new Set(newSourceIds)];
        const pairsForTarget = newSourceIds.map((sourceItemId) => ({ sourceItemId, targetItemId: targetId }));

        try {
          await this.changeLinkColumn(input.targetBoardId, targetId, input.linkColumnId, { item_ids: itemIds });
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
}
