import { z } from 'zod';
import {
  BoardKind,
  CreateBoardMutation,
  CreateBoardMutationVariables,
} from '../../../monday-graphql/generated/graphql';
import { createBoard } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool } from './base-monday-api-tool';

export const createBoardToolSchema = {
  boardName: z.string().describe('The name of the board to create'),
  boardKind: z.nativeEnum(BoardKind).default(BoardKind.Public).describe('The kind of board to create'),
  boardDescription: z.string().optional().describe('The description of the board to create'),
  workspaceId: z.string().optional().describe('The ID of the workspace to create the board in'),
};

export class CreateBoardTool extends BaseMondayApiTool<typeof createBoardToolSchema, never> {
  name = 'create_board';
  type = ToolType.WRITE;

  getDescription(): string {
    return 'Create a monday.com board';
  }

  getInputSchema(): typeof createBoardToolSchema {
    return createBoardToolSchema;
  }

  async execute(input: ToolInputType<typeof createBoardToolSchema>): Promise<ToolOutputType<never>> {
    const variables: CreateBoardMutationVariables = {
      boardName: input.boardName,
      boardKind: input.boardKind,
      boardDescription: input.boardDescription,
      workspaceId: input.workspaceId,
    };

    const res = await this.mondayApi.request<CreateBoardMutation>(createBoard, variables);

    return {
      content: `Board ${res.create_board?.id} successfully created`,
    };
  }
}
