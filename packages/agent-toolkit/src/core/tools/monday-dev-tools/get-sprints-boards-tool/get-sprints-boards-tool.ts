import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../platform-api-tools/base-monday-api-tool';
import {
  GetRecentBoardsQuery,
  GetRecentBoardsQueryVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { getRecentBoards } from './get-sprints-boards-tool.graphql';
import {
  ERROR_PREFIXES,
  RECENT_BOARDS_LIMIT,
  REQUIRED_SPRINT_COLUMNS,
  MONDAY_DEV_TASK_COLUMN_IDS,
  Board,
  SprintsBoardPair,
  isSprintsBoard,
  isTasksBoard,
  getRelatedBoardIdFromRelationColumn,
  getBoardRelationColumn,
} from '../shared';

export const getSprintsBoardsToolSchema = {};

export class GetSprintsBoardsTool extends BaseMondayApiTool<typeof getSprintsBoardsToolSchema> {
  name = 'get_monday_dev_sprints_boards';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'monday-dev: Get Sprints Boards',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Discover monday-dev sprints boards and their associated tasks boards in your account.

## Purpose:
Identifies and returns monday-dev sprints board IDs and tasks board IDs that you need to use with other monday-dev tools. 
This tool scans your recently used boards (up to ${RECENT_BOARDS_LIMIT}) to find valid monday-dev sprint management boards.

## What it Returns:
- Pairs of sprints boards and their corresponding tasks boards
- Board IDs, names, and workspace information for each pair
- The bidirectional relationship between each sprints board and its tasks board

## Note:
Searches recently used boards (up to ${RECENT_BOARDS_LIMIT}). If none found, ask user to provide board IDs manually.`;
  }

  getInputSchema(): typeof getSprintsBoardsToolSchema {
    return getSprintsBoardsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getSprintsBoardsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const variables: GetRecentBoardsQueryVariables = {
        limit: RECENT_BOARDS_LIMIT,
      };

      const res = await this.mondayApi.request<GetRecentBoardsQuery>(getRecentBoards, variables);

      const boards = (res.boards || []).filter((board): board is Board => board !== null);

      if (boards.length === 0) {
        return {
          content: `${ERROR_PREFIXES.BOARD_NOT_FOUND} No boards found in your account. Please verify you have access to monday.com boards.`,
        };
      }

      const pairs = this.extractBoardPairs(boards);

      if (pairs.length === 0) {
        return {
          content: {
            message:
              'No monday-dev sprints board pairs found. ### Possible Reasons:\n1. Boards exist but not accessed recently by your account\n2. Missing access permissions to sprint/task boards\n3. Monday-dev product was not set up in account\n### Next Steps:\n1. Ask user to access monday-dev boards in UI to refresh recent boards list\n2. Ask user to verify permissions to view sprint and task boards\n3. Ask user to provide board IDs manually if known`;',
            boards_checked: boards.length,
            pairs: [],
          },
        };
      }

      return {
        content: {
          message: `Found ${pairs.length} matched pair(s)`,
          ...(pairs.length > 1
            ? {
                warning:
                  'Multiple board pairs detected. Confirm with user which pair and workspace to use before any operation.',
              }
            : {}),
          pairs: pairs.map((pair) => ({
            sprints_board: {
              id: pair.sprintsBoard.id,
              name: pair.sprintsBoard.name,
              workspace_id: pair.sprintsBoard.workspaceId,
              workspace_name: pair.sprintsBoard.workspaceName,
            },
            tasks_board: {
              id: pair.tasksBoard.id,
              name: pair.tasksBoard.name,
              workspace_id: pair.tasksBoard.workspaceId,
              workspace_name: pair.tasksBoard.workspaceName,
            },
          })),
          technical_reference:
            'Sprint Operations (all require correct board pair): Add to Sprint: Update `task_sprint` column with sprint item ID. Remove from Sprint: Clear `task_sprint` column (set to null). Search in Sprint: Filter where `task_sprint` equals sprint item ID. Move Between Sprints: Update `task_sprint` with new sprint item ID. Backlog Tasks: `task_sprint` is empty/null. Critical: `task_sprint` column references ONLY its paired sprints board. Cross-pair operations WILL FAIL.',
        },
      };
    } catch (error) {
      return {
        content: `${ERROR_PREFIXES.INTERNAL_ERROR} Error retrieving sprints boards: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private createBoardInfo(
    boardId: string,
    board: Board | undefined,
    fallbackName: string,
  ): SprintsBoardPair['sprintsBoard'] | SprintsBoardPair['tasksBoard'] {
    return {
      id: boardId,
      name: board?.name || fallbackName,
      workspaceId: board?.workspace?.id || 'unknown',
      workspaceName: board?.workspace?.name || 'Unknown',
    };
  }

  private processSprintsBoard(board: Board, boardsById: Map<string, Board>, pairsMap: Map<string, SprintsBoardPair>) {
    const sprintTasksColumn = getBoardRelationColumn(board, REQUIRED_SPRINT_COLUMNS.SPRINT_TASKS);
    if (!sprintTasksColumn) return;

    const tasksBoardId = getRelatedBoardIdFromRelationColumn(sprintTasksColumn);
    if (!tasksBoardId) return;

    const pairKey = `${board.id}:${tasksBoardId}`;
    if (pairsMap.has(pairKey)) return;

    const tasksBoard = boardsById.get(tasksBoardId);
    pairsMap.set(pairKey, {
      sprintsBoard: this.createBoardInfo(board.id, board, `Sprints Board ${board.id}`),
      tasksBoard: this.createBoardInfo(tasksBoardId, tasksBoard, `Tasks Board ${tasksBoardId}`),
    });
  }

  private processTasksBoard(board: Board, boardsById: Map<string, Board>, pairsMap: Map<string, SprintsBoardPair>) {
    const taskSprintColumn = getBoardRelationColumn(board, MONDAY_DEV_TASK_COLUMN_IDS.TASK_SPRINT);
    if (!taskSprintColumn) return;

    const sprintsBoardId = getRelatedBoardIdFromRelationColumn(taskSprintColumn);
    if (!sprintsBoardId) return;

    const pairKey = `${sprintsBoardId}:${board.id}`;
    if (pairsMap.has(pairKey)) return;

    const sprintsBoard = boardsById.get(sprintsBoardId);
    pairsMap.set(pairKey, {
      sprintsBoard: this.createBoardInfo(sprintsBoardId, sprintsBoard, `Sprints Board ${sprintsBoardId}`),
      tasksBoard: this.createBoardInfo(board.id, board, `Tasks Board ${board.id}`),
    });
  }

  /**
   * Extracts board pairs directly from column relationships
   * This approach works even if one board in the pair wasn't fetched (not in recent boards limit)
   * We can identify pairs from either direction:
   * - From sprints board: sprint_tasks column references tasks board
   * - From tasks board: task_sprint column references sprints board
   *
   * Note: If a board in the pair is not found in the recent boards list,
   * its name and workspace will show as "Unknown" or generic names (e.g., "Tasks Board {id}").
   * The board relationship and ID are still valid and functional.
   */
  private extractBoardPairs(boards: Board[]): SprintsBoardPair[] {
    const pairsMap = new Map<string, SprintsBoardPair>();
    const boardsById = new Map(boards.map((board) => [board.id, board]));

    for (const board of boards) {
      if (!board.columns) continue;

      if (isSprintsBoard(board)) {
        this.processSprintsBoard(board, boardsById, pairsMap);
      }

      if (isTasksBoard(board)) {
        this.processTasksBoard(board, boardsById, pairsMap);
      }
    }

    return Array.from(pairsMap.values());
  }
}
