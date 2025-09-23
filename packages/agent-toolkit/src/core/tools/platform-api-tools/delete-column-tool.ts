import { z } from 'zod';
import { DeleteColumnMutation, DeleteColumnMutationVariables } from '../../../monday-graphql/generated/graphql';
import { deleteColumn } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const deleteColumnToolSchema = {
  columnId: z.string().describe('The id of the column to be deleted'),
};

export const deleteColumnInBoardToolSchema = {
  boardId: z.number().describe('The id of the board to which the new column will be added'),
  ...deleteColumnToolSchema,
};

export type DeleteColumnToolInput = typeof deleteColumnToolSchema | typeof deleteColumnInBoardToolSchema;

export class DeleteColumnTool extends BaseMondayApiTool<DeleteColumnToolInput> {
  name = 'delete_column';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Delete Column',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Delete a column from a monday.com board';
  }

  getInputSchema(): DeleteColumnToolInput {
    if (this.context?.boardId) {
      return deleteColumnToolSchema;
    }

    return deleteColumnInBoardToolSchema;
  }

  protected async executeInternal(input: ToolInputType<DeleteColumnToolInput>): Promise<ToolOutputType<never>> {
    const boardId = this.context?.boardId ?? (input as ToolInputType<typeof deleteColumnInBoardToolSchema>).boardId;

    const variables: DeleteColumnMutationVariables = {
      boardId: boardId.toString(),
      columnId: input.columnId,
    };

    const res = await this.mondayApi.request<DeleteColumnMutation>(deleteColumn, variables);

    return {
      content: `Column ${res.delete_column?.id} successfully deleted`,
    };
  }
}
