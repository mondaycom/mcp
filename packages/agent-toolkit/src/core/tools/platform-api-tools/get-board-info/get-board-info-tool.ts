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
      'Also returns the board\'s views (e.g. table views, filter views) — each view includes its id, name, type, and a structured filter object. ' +
      'The response includes hierarchy_type which indicates if the board is a multi-level board ("multi_level") where items can have nested subitems up to 5 levels deep on the same board. On multi-level boards, subitems share the same columns as parent items and subItemColumns will be null. ' +
      'Call this FIRST whenever you are not already familiar with a board structure (column IDs, column types, status labels), before reading or writing its data with get_board_items_page, board_insights, create_item, create_items, update_items, or change_item_column_values — those tools declare it as a required precondition. ' +
      'Also use the views it returns to resolve a view referenced by name, and as the source of view ids for update_view and update_view_table. ' +
      'Each column\'s "settings" field is the raw API value for that existing column, shown so you can read current labels/config — it is NOT the format expected by the columnSettings parameter of create_column or update_column. Never copy a column\'s "settings" object verbatim into columnSettings; use get_column_type_info with fetchMode "schema" to get the correct shape for the column type you are creating or updating.'
    );
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

    // On MLS boards, boardIds[0] is the board's own ID (self-reference) —
    // subitems live on the same board, so no separate query is needed.
    if (subItemsBoardId === board.id) {
      return null;
    }

    const response = await this.mondayApi.request<GetBoardInfoJustColumnsQuery>(getBoardInfoJustColumns, {
      boardId: subItemsBoardId,
    });
    const subItemsBoard = response.boards?.[0] ?? null;

    return subItemsBoard;
  }
}
