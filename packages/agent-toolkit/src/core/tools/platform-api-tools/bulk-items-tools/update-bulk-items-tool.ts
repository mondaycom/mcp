import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { boardIdSchema, groupIdSchema, itemsSchema, executeIngestItems } from './bulk-items.utils';

const onMatchSchema = z.object({
  match_column_id: z.string().describe('The column ID to match existing items against (e.g. "name" or "email")'),
  behaviour: z.enum(['UPSERT', 'SKIP']).describe('UPSERT to update matched items with new values, SKIP to leave matched items unchanged').optional().default('UPSERT'),
});

export const updateBulkItemsSchema = {
  board_id: boardIdSchema,
  group_id: groupIdSchema,
  items: itemsSchema,
  on_match: onMatchSchema.describe('Controls how existing items are matched and updated'),
};

export class UpdateBulkItemsTool extends BaseMondayApiTool<typeof updateBulkItemsSchema, never> {
  name = 'update_bulk_items';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update Bulk Items',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      'Bulk update existing items on a monday.com board by matching against a column value. ' +
      'Provide an array of row objects and an on_match config specifying which column to match on and the behaviour (UPSERT or SKIP). ' +
      'Matched items are updated with new values; unmatched rows are created as new items. ' +
      'Important: the operation is scoped to a single group.' +
      'If the board has multiple groups, call this tool once per group to update all items. ' +
      'Returns the job ID and final counts (created, updated, skipped, failed, invalid).'
    );
  }

  getInputSchema(): typeof updateBulkItemsSchema {
    return updateBulkItemsSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof updateBulkItemsSchema>): Promise<ToolOutputType<never>> {
    const { board_id, group_id, items, on_match } = input;
    return executeIngestItems(this.mondayApi, {
      boardId: String(board_id),
      groupId: group_id,
      items,
      onMatch: { match_column_id: on_match.match_column_id, behaviour: on_match.behaviour},
    });
  }
}
