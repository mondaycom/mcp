import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { rethrowWithContext } from '../../../../utils';
import { RemoveAiFromColumnMutation } from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { removeAiFromColumnMutation } from './remove-ai-from-column-tool.graphql.dev';

export const removeAiFromColumnToolSchema = {
  column_id: z.string().describe('The ID of the column to remove AI from'),
};

export const removeAiFromColumnInBoardToolSchema = {
  board_id: z.number().describe('The ID of the board containing the column'),
  ...removeAiFromColumnToolSchema,
};

export type RemoveAiFromColumnToolInput = typeof removeAiFromColumnToolSchema | typeof removeAiFromColumnInBoardToolSchema;

export class RemoveAiFromColumnTool extends BaseMondayApiTool<RemoveAiFromColumnToolInput> {
  name = 'remove_ai_from_column';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Remove AI from Column',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Remove AI configuration from a column on a monday.com board. This deletes all AI automation recipes and the app feature extension associated with the column. The column itself is not deleted — only its AI behavior is removed.

Use get_board_schema to find column IDs before calling this tool.`;
  }

  getInputSchema(): RemoveAiFromColumnToolInput {
    if (this.context?.boardId) {
      return removeAiFromColumnToolSchema;
    }
    return removeAiFromColumnInBoardToolSchema;
  }

  protected async executeInternal(input: ToolInputType<RemoveAiFromColumnToolInput>): Promise<ToolOutputType<never>> {
    const boardId = this.context?.boardId ?? (input as ToolInputType<typeof removeAiFromColumnInBoardToolSchema>).board_id;

    try {
      const res = await this.mondayApi.request<RemoveAiFromColumnMutation>(
        removeAiFromColumnMutation,
        {
          boardId: boardId?.toString() ?? '',
          columnId: input.column_id,
        },
        { versionOverride: 'dev' },
      );

      return {
        content: {
          message: 'AI removed from column successfully',
          column_id: res.remove_ai_from_column?.column_id,
          success: res.remove_ai_from_column?.success,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'remove AI from column');
    }
  }
}
