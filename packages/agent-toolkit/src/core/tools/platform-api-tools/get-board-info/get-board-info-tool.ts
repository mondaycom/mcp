import { z } from 'zod';
import {
  GetBoardInfoJustColumnsQuery,
  GetBoardInfoQuery,
  GetBoardInfoQueryVariables,
  GetBoardInfoViewIndexQuery,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { getBoardInfo, getBoardInfoJustColumns, getBoardInfoViewIndex } from './get-board-info.graphql';
import {
  BoardInfoData,
  BoardInfoJustColumnsData,
  formatBoardInfoAsJson,
  resolveViewIdsByName,
} from './helpers';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './../base-monday-api-tool';
import { NonDeprecatedColumnType } from 'src/utils/types';

export const getBoardInfoToolSchema = {
  boardId: z.number().describe('The id of the board to get information for'),
  filters: z
    .object({
      views: z
        .object({
          ids: z.array(z.string()).optional().describe('Optional. Restrict returned views to these view ids.'),
          names: z
            .array(z.string())
            .optional()
            .describe(
              'Optional. Restrict returned views to these view names (case-insensitive). The tool resolves names via a lean id/name index query first to avoid downloading every view on large boards.',
            ),
          only: z
            .boolean()
            .optional()
            .describe('Optional. When true, omit columns and return only views plus the board metadata needed around them.'),
        })
        .optional()
        .describe('Optional view selection controls.'),
      columns: z
        .object({
          ids: z.array(z.string()).optional().describe('Optional. Restrict returned columns to these column ids.'),
          only: z
            .boolean()
            .optional()
            .describe('Optional. When true, omit views and return only columns plus the board metadata needed around them.'),
        })
        .optional()
        .describe('Optional column selection controls.'),
    })
    .optional()
    .describe('Optional response-shaping filters for large boards. Omit to return the full board info payload.'),
};

type ResolvedBoardInfoFilters = {
  columnIds: string[] | undefined;
  viewIds: string[] | undefined;
  includeColumns: boolean;
  includeViews: boolean;
  unmatchedViewNames: string[];
  availableViewNames: string[];
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
      'On large boards, ALWAYS narrow the response: use filters.views.names or filters.views.ids when you only need specific views, and/or filters.columns.ids when you only need specific columns. Set filters.views.only or filters.columns.only when you want just that section — full views[].settings across many views can be multi-MB. ' +
      'The response includes hierarchy_type which indicates if the board is a multi-level board ("multi_level") where items can have nested subitems up to 5 levels deep on the same board. On multi-level boards, subitems share the same columns as parent items and subItemColumns will be null. ' +
      'Call this FIRST whenever you are not already familiar with a board structure (column IDs, column types, column revisions, status labels) — before reading or writing its data, or before any tool that declares this as a required precondition (e.g. get_board_items_page, board_insights, create_item, create_items, update_items, change_item_column_values, update_column, create_view, create_view_table, update_view, update_view_table). ' +
      'Also use the views it returns to resolve a view referenced by name (pass that name in filters.views.names), and as the source of view ids for update_view and update_view_table. ' +
      'Each column\'s "settings" field is the raw API value for that existing column, shown so you can read current labels/config — it is NOT the format expected by the columnSettings parameter of create_column or update_column. Never copy a column\'s "settings" object verbatim into columnSettings — use get_column_type_info with fetchMode "schema" to get the correct shape for the column type you are creating or updating.'
    );
  }

  getInputSchema(): typeof getBoardInfoToolSchema {
    return getBoardInfoToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof getBoardInfoToolSchema>): Promise<ToolOutputType<never>> {
    const { columnIds, viewIds, includeColumns, includeViews, unmatchedViewNames, availableViewNames } =
      await this.resolveFiltersAsync(input);

    if (input.filters?.views?.names?.length && includeViews && viewIds !== undefined && viewIds.length === 0) {
      const available = availableViewNames.length > 0 ? availableViewNames.join(', ') : '(none)';
      return {
        content:
          `None of the requested view names matched on board ${input.boardId}. ` +
          `Requested: ${input.filters.views.names.join(', ')}. Available views: ${available}.`,
      };
    }

    const variables: GetBoardInfoQueryVariables = {
      boardId: input.boardId.toString(),
      columnIds: includeColumns ? columnIds : undefined,
      viewIds: includeViews ? viewIds : undefined,
      includeColumns,
      includeViews,
    };

    const res = await this.mondayApi.request<GetBoardInfoQuery>(getBoardInfo, variables);

    const board = res.boards?.[0];

    if (!board) {
      return {
        content: `Board with id ${input.boardId} not found or you don't have access to it.`,
      };
    }

    const subItemsBoard = includeColumns ? await this.getSubItemsBoardAsync(board) : null;

    return {
      content: formatBoardInfoAsJson(board, subItemsBoard, unmatchedViewNames),
    };
  }

  /**
   * Resolves nested filters into GraphQL ids + @include flags.
   * Uses a lean view id/name index query when names were provided.
   */
  private async resolveFiltersAsync(
    input: ToolInputType<typeof getBoardInfoToolSchema>,
  ): Promise<ResolvedBoardInfoFilters> {
    const columnsFilter = input.filters?.columns;
    const viewsFilter = input.filters?.views;
    const columnsOnly = Boolean(columnsFilter?.only);
    const viewsOnly = Boolean(viewsFilter?.only);
    const hasViewIds = viewsFilter?.ids !== undefined;
    const hasViewNames = Boolean(viewsFilter?.names?.length);

    // Both only flags → include both sections (treat as narrowed, not mutually exclusive).
    const includeColumns = !viewsOnly || columnsOnly;
    const includeViews = !columnsOnly || viewsOnly;

    const columnIds = includeColumns ? columnsFilter?.ids : undefined;

    if (!includeViews) {
      return {
        columnIds,
        viewIds: undefined,
        includeColumns,
        includeViews,
        unmatchedViewNames: [],
        availableViewNames: [],
      };
    }

    if (!hasViewIds && !hasViewNames) {
      return {
        columnIds,
        viewIds: undefined,
        includeColumns,
        includeViews,
        unmatchedViewNames: [],
        availableViewNames: [],
      };
    }

    if (hasViewIds && !hasViewNames) {
      return {
        columnIds,
        viewIds: viewsFilter?.ids ?? [],
        includeColumns,
        includeViews,
        unmatchedViewNames: [],
        availableViewNames: [],
      };
    }

    const indexRes = await this.mondayApi.request<GetBoardInfoViewIndexQuery>(getBoardInfoViewIndex, {
      boardId: input.boardId.toString(),
    });
    const indexedViews = indexRes.boards?.[0]?.views ?? [];
    const availableViewNames = indexedViews
      .map((view) => view?.name)
      .filter((name): name is string => Boolean(name));

    const { viewIds: namedIds, unmatchedViewNames } = resolveViewIdsByName(indexedViews, viewsFilter?.names ?? []);
    const merged = [...new Set([...(viewsFilter?.ids ?? []), ...namedIds])];

    return {
      columnIds,
      viewIds: merged,
      includeColumns,
      includeViews,
      unmatchedViewNames,
      availableViewNames,
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
