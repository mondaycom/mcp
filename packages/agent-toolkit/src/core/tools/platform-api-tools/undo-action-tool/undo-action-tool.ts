import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { batchUndoMutation } from './undo-action-tool.graphql';

export const undoActionToolSchema = {
  boardId: z.number().describe('The id of the board where the action was performed'),
  undoRecordId: z
    .string()
    .describe(
      'The undo record ID (action_record_uuid) from the activity log data field. Use get_board_activity with includeData=true to find this value.',
    ),
};

export class UndoActionTool extends BaseMondayApiTool<typeof undoActionToolSchema> {
  name = 'undo_action';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Undo Action',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Undo a previous action on a board using its action_record_uuid. Supports undoing column changes, deletes, archives, moves, duplicates, and more. Use get_board_activity with includeData=true to find the action_record_uuid.';
  }

  getInputSchema(): typeof undoActionToolSchema {
    return undoActionToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof undoActionToolSchema>,
  ): Promise<ToolOutputType<never>> {
    await this.mondayApi.request(batchUndoMutation, {
      boardId: input.boardId.toString(),
      undoRecordId: input.undoRecordId,
    });

    return {
      content: `Successfully undid action "${input.undoRecordId}" on board ${input.boardId}.`,
    };
  }
}
