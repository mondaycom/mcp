import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

const LINK_BOARD_ITEMS_WORKFLOW_DOCUMENTATION = `
**Board-relation linking — do in order**

1. **Fetch (target board, one query)**
- **has_more: true** (and under **~500** items / **~5** pages for this pass) → your **only** next action is
  **get_board_items_page** with **cursor=nextCursor**; same **boardId** and the same **searchTerm** / **filters**
  / **itemIds** — **do not** change **filters** on a cursor call. **No** user turn until **has_more** is false
  or you stop at the cap. The first page alone is never “the whole board” while **has_more** is still true.
- **Shrink the query first** when you can: **columnIds**;
  **filters**; **searchTerm**; or **itemIds** (max **100** per call, split big lists). Search **timeout** or
  error → **narrower** **searchTerm** or smaller **limit** / columns, then continue with **nextCursor** as
  in the first bullet.

2. **Match (after the fetch for that pass is done)**
- Apply a **clear** rule to names/values you already loaded (e.g. same name as source, or value user gave).
- One unambiguous match → link without asking. **No** vague “best” pick without a rule.

3. **If the user must be involved (only after step 1 is done for that query)**
- If step 1 is incomplete, **no** questions (see step 1’s first bullet).
- **True tie** (2+ items match the rule equally) → show **only those tied rows** (or a tiny shortlist),
  not the full result set and never all ~500.
- **No way to name a target yet** (not a tie) → ask **once** for a **name** or **search phrase** to use in
  **searchTerm** / **filters**, not a menu of the board.

4. **Write** — On the owning board’s board-relation column using change_item_column_values
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
      'When to use: **link** or **connect** items **across boards** (board-relation / “connect boards” / mirror ' +
      'link). The returned text is the rule: whenever **get_board_items_page** returns **has_more: true**, your ' +
      'only next step is the **next** get_board_items_page (**cursor=nextCursor**) — not a user message, not ' +
      'matching, not writing. This tool is read-only (no API).'
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
