import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { boardIdSchema, groupIdSchema, itemsSchema, executeIngestItems } from './bulk-items.utils';

export const createBulkItemsSchema = {
  board_id: boardIdSchema,
  group_id: groupIdSchema.optional().default('topics'),
  items: itemsSchema,
};

export class CreateBulkItemsTool extends BaseMondayApiTool<typeof createBulkItemsSchema, never> {
  name = 'create_bulk_items';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Bulk Items',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return (
      'Bulk create up to 10,000 new items on a monday.com board. ' +
      'Provide an array of row objects where keys are column IDs (e.g. name, status, date4) and values are strings. ' +
      'Every row is created as a new item in the specified group. The default group_id "topics" is the first group on the board. ' +
      'Returns the job ID and final counts (created, failed, invalid).'
    );
  }

  getInputSchema(): typeof createBulkItemsSchema {
    return createBulkItemsSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof createBulkItemsSchema>): Promise<ToolOutputType<never>> {
    const { board_id, group_id, items } = input;
    return executeIngestItems(this.mondayApi, {
      boardId: String(board_id),
      groupId: group_id,
      items,
    });
  }
}
