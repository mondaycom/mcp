import { z } from 'zod';
import {
  GetBoardInfoJustColumnsQuery,
  GetBoardInfoQuery,
  GetBoardInfoQueryVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { getBoardInfo, getBoardInfoJustColumns } from './get-board-info.graphql';
import { BoardInfoData, BoardInfoJustColumnsData, formatBoardInfoAsJson } from './helpers';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './../base-monday-api-tool';
import { NonDeprecatedColumnType } from 'src/utils/types';

export const getBoardInfoToolSchema = {
  boardId: z.number().describe('The id of the board to get information for'),
  includeViews: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Whether to include board views in the response. Each view contains its id, name, type, and a structured filter object. ' +
      'Set to true when the user refers to a specific view by name (e.g. "show items in the Overdue view") — ' +
      'then find the matching view, extract its filter field, and pass it to get_board_items_page.',
    ),
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
    return (
      'Get comprehensive board information including metadata, structure, owners, and configuration. ' +
      'Optionally include board views (e.g. table views, filter views) by setting includeViews: true — ' +
      'each view contains its id, name, type, and a structured filter object. ' +
      'WHEN TO USE VIEWS: If the user refers to a specific view by name (e.g. "show items in the \'My Tasks\' view"), ' +
      'set includeViews: true, find the matching view by name in the views array, ' +
      'then pass its filter object as the filters argument to get_board_items_page.'
    );
  }

  getInputSchema(): typeof getBoardInfoToolSchema {
    return getBoardInfoToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof getBoardInfoToolSchema>): Promise<ToolOutputType<never>> {
    const variables: GetBoardInfoQueryVariables = {
      boardId: input.boardId.toString(),
      includeViews: input.includeViews ?? false,
    };

    const res = await this.mondayApi.request<GetBoardInfoQuery>(getBoardInfo, variables);

    const board = res.boards?.[0];

    if (!board) {
      return {
        content: `Board with id ${input.boardId} not found or you don't have access to it.`,
      };
    }

    const subItemsBoard = await this.getSubItemsBoardAsync(board);

    return {
      content: formatBoardInfoAsJson(board, subItemsBoard)
    };
  }

  private async getSubItemsBoardAsync(board: BoardInfoData): Promise<BoardInfoJustColumnsData | null> {
    const subTasksColumn = board.columns?.find((column) => column?.type === NonDeprecatedColumnType.Subtasks);
    if (!subTasksColumn) {
      return null;
    }

    const subItemsBoardId = subTasksColumn.settings.boardIds[0];

    const response = await this.mondayApi.request<GetBoardInfoJustColumnsQuery>(getBoardInfoJustColumns, {
      boardId: subItemsBoardId,
    });
    const subItemsBoard = response.boards?.[0] ?? null;

    return subItemsBoard;
  }
}
