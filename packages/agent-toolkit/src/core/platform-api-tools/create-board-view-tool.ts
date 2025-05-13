import { z } from 'zod';
import { BaseMondayApiTool } from './base-monday-api-tool';
import { BoardViewTypeValues } from '../../monday-graphql/generated/graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../tool';
import { createBoardView } from '../../monday-graphql/queries.graphql';

export const createBoardViewToolSchema = {
  boardId: z.string().describe('The ID of the board to create the view in'),
  name: z.string().describe('The name of the board view'),
  type: z.nativeEnum(BoardViewTypeValues).describe('The type of board view to create'),
};

export class CreateBoardViewTool extends BaseMondayApiTool<typeof createBoardViewToolSchema> {
  name = 'create_board_view';
  type = ToolType.MUTATION;

  getDescription(): string {
    return 'Create a new board view in a monday.com board';
  }

  getInputSchema(): typeof createBoardViewToolSchema {
    return createBoardViewToolSchema;
  }

  async execute(input: ToolInputType<typeof createBoardViewToolSchema>): Promise<ToolOutputType<never>> {
    const variables = {
      boardId: input.boardId,
      name: input.name,
      type: input.type,
    };

    const res = await this.mondayApi.request(createBoardView, variables);

    return {
      content: `Board view '${input.name}' of type ${input.type} successfully created in board ${input.boardId}`,
    };
  }
} 