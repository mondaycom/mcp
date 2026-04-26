import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

const LINK_BOARD_ITEMS_WORKFLOW_DOCUMENTATION = `
**What this tool does**
It returns the discovery + matching + write workflow for board-relation linking.
It does not list boards, page items, or write values — those are still done with get_board_info / get_board_schema, get_board_items_page, and change_item_column_values respectively.
This tool only gives you the rules for using them correctly. Read it once at the start of the task and follow the steps below.

**1 — Resolve the relation column and which board owns it**
Use get_board_info or get_board_schema to find the board-relation column id and which of the two boards it lives on (the "owning" board).
The write in step 5 happens on the owning board; the value carries item ids from the other board.
If the user is vague about which boards, which column, or how to match, confirm from context or ask one clarifying question before you fetch from the wrong place.

**2 — Define a match rule**
Be explicit (compare one column on each side, or compare item names only with normalized text).
Fuzzy or duplicate candidates must be resolved before you write.
For column-to-column compare, you need those column values.
For name-only, you do not need includeColumns.

**3 — Fetch with get_board_items_page (both sides as needed)**
A common model failure is to read **only the first page** of results (often one unfiltered or wide page), ignore **has_more** and **nextCursor**, and conclude there is no match, a wrong match, or a false tie.
Do not treat page one as the whole board.
The board is not fully searched for your query slice while **has_more** is true and you still need a row that could satisfy your rule.
Keep calling with **nextCursor** until the slice is complete **within a budget**, then if needed change search terms, split work, or stop and report.

**Budget (rule of thumb)**
About **500** items in memory across the boards you are using for this pass.
About **10** pages per side of a board as a guideline before you narrow the query, split, or change strategy, not an endless unfiltered walk.

Vague or short user prompts are not a reason to stop at one page.
Use searchTerm, filters, and item id lists.
At most **100** itemIds per call, chunk larger id lists.
Use **includeColumns** true and **columnIds** with only the columns you compare, plus the relation column id only if you must read its existing value.
On a large target board, seed **searchTerm** from the source item name, then page.
If a searchTerm-based call times out, retry with a narrower term or fetch a smaller deterministic slice (limit + minimal columns) and continue paging/refining.
If **has_more** is true and no loaded row matches yet, that is **incomplete search** — keep paging, not a tie.
A **tie** is when two or more rows you **already loaded** each fully qualify as the single target.
Drop dead rows as you go so you do not bloat state.

**4 — Build pairs and involve the user**
You want at most one target per source.
If zero matches after you exhausted the query slice (within the budget) or the budget with no clear row, omit or report.
If two or more loaded rows are a true tie, do not write that source until resolved.
Ask the user only for a **true** tie, and only **after** paging is done for that slice (no more has_more to follow within budget) or the budget is exhausted.
Never treat "nothing on page one" or "has_more is true but I will stop" as a finished search.

**5 — Write with change_item_column_values**
Always write to items on the **owning board** (the one with the relation column from step 1). The value carries ids from the other board.
Payload shape: \`{ "<relation_column_id>": { "item_ids": ["<id>", "<id>"] } }\` — ids must be strings.
The write **replaces** the relation value for that row — old links are not merged in. If you must preserve existing links, read them first (includeColumns true, columnIds: [relation_column_id]) and merge into the item_ids you write.
- One-to-one (each row links to one counterpart): one change_item_column_values call per owning row, with one id in item_ids.
- Many-to-one (multiple counterparts collapse into one owning row): one call per owning row, with all chosen counterpart ids in item_ids.
After writes, verify with another get_board_items_page (includeColumns true, columnIds: [relation_column_id]) when confirmation matters.

**Core ideas (for scan)**
(1) Minimal extra columns, only what you need to compare.
(2) **Page past the first slice** with nextCursor when has_more, up to a budget, instead of a single page.
(3) **Tie** = multiple loaded full matches, not "no match yet" while has_more.
(4) **Budget** limits how far you page before you change the query or split, not a license to only read one page.
(5) Writes **replace** the relation value — read existing links first if you need to preserve them.
`.trim();

export const linkBoardItemsWorkflowToolSchema = {};

export class LinkBoardItemsWorkflowTool extends BaseMondayApiTool<typeof linkBoardItemsWorkflowToolSchema> {
  name = 'link_board_items_workflow';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Link Board Items Workflow',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      'REQUIRED FIRST STEP for board-relation linking tasks. ' +
      'If the user asks to link/connect items across boards (for example: "link task to epic", "connect X to Y", or update a board_relation column), call this tool before get_board_info, get_board_items_page, or change_item_column_values. ' +
      'Returns the exact discovery/matching/write workflow (paging, incomplete-search vs true tie, and safe write rules) to prevent wrong-target links.'
    );
  }

  getInputSchema(): typeof linkBoardItemsWorkflowToolSchema {
    return linkBoardItemsWorkflowToolSchema;
  }

  protected async executeInternal(
    _input: ToolInputType<typeof linkBoardItemsWorkflowToolSchema>,
  ): Promise<ToolOutputType<never>> {
    return {
      content: LINK_BOARD_ITEMS_WORKFLOW_DOCUMENTATION,
    };
  }
}
