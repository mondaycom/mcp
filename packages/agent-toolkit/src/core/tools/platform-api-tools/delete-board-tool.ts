import { z } from 'zod';
import { DeleteBoardMutation, DeleteBoardMutationVariables } from 'src/monday-graphql/generated/graphql/graphql';
import { deleteBoard } from 'src/monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const deleteBoardToolSchema = {
  boardId: z.number().describe('The id of the board to be deleted'),
};

export const deleteBoardInContextToolSchema = {};

export type DeleteBoardToolInput = typeof deleteBoardToolSchema | typeof deleteBoardInContextToolSchema;

export class DeleteBoardTool extends BaseMondayApiTool<DeleteBoardToolInput> {
  name = 'delete_board';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Delete Board',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  });

  getDescription(): string {
    return (
      'Delete a monday.com board. This is irreversible — the board and all of its items, columns, and data are removed. ' +
      '[REQUIRED PRECONDITION]: Confirm the exact boardId with the user before calling this tool. Never guess a board id.'
    );
  }

  getInputSchema(): DeleteBoardToolInput {
    if (this.context?.boardId) {
      return deleteBoardInContextToolSchema;
    }

    return deleteBoardToolSchema;
  }

  protected async executeInternal(input: ToolInputType<DeleteBoardToolInput>): Promise<ToolOutputType<never>> {
    const boardId = this.context?.boardId ?? (input as ToolInputType<typeof deleteBoardToolSchema>).boardId;

    const variables: DeleteBoardMutationVariables = {
      boardId: boardId.toString(),
    };

    const res = await this.mondayApi.request<DeleteBoardMutation>(deleteBoard, variables);

    return {
      content: {
        message: `Board ${res.delete_board?.id} successfully deleted`,
        board_id: res.delete_board?.id,
      },
    };
  }
}
