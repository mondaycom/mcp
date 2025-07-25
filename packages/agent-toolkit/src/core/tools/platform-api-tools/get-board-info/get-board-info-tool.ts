import { z } from 'zod';
import { GetBoardInfoQuery, GetBoardInfoQueryVariables } from '../../../../monday-graphql/generated/graphql';
import { getBoardInfo } from './get-board-info.graphql';
import { formatBoardInfo } from './helpers';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './../base-monday-api-tool';

export const getBoardInfoToolSchema = {
  boardId: z.number().describe('The id of the board to get information for'),
};

export class GetBoardInfoTool extends BaseMondayApiTool<typeof getBoardInfoToolSchema | undefined> {
  name = 'get_board_info';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Board Info',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Get comprehensive board information including metadata, structure, owners, and configuration';
  }

  getInputSchema(): typeof getBoardInfoToolSchema {
    return getBoardInfoToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof getBoardInfoToolSchema>): Promise<ToolOutputType<never>> {
    const variables: GetBoardInfoQueryVariables = {
      boardId: input.boardId.toString(),
    };

    const res = await this.mondayApi.request<GetBoardInfoQuery>(getBoardInfo, variables);

    const board = res.boards?.[0];

    if (!board) {
      return {
        content: `Board with id ${input.boardId} not found or you don't have access to it.`,
      };
    }

    return {
      content: formatBoardInfo(board),
    };
  }
}
