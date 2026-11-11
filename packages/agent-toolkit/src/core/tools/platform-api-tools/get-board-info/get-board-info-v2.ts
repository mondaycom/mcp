import { ApiClient } from '@mondaydotcomorg/api';
import {
  GetBoardInfoV2Query,
  GetBoardInfoV2QueryVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { getBoardInfoV2 } from './get-board-info.graphql.dev';
import { BoardInfoResponse, BoardKnowledgeData, resolveViewIdsByName } from './helpers';
import { NonDeprecatedColumnType } from 'src/utils/types';

// subitem_columns is introduced in 2027-01 and Board.creator is nullable from 2027-04.
export const GET_BOARD_INFO_V2_API_VERSION = '2027-04';

type BoardV2 = NonNullable<NonNullable<GetBoardInfoV2Query['boards']>[0]>;
type ColumnV2 = NonNullable<NonNullable<BoardV2['columns']>[0]>;
type ViewV2 = NonNullable<NonNullable<BoardV2['views']>[0]>;

export type BoardInfoV2Filters = {
  views?: { ids?: string[]; names?: string[]; only?: boolean };
  columns?: { ids?: string[]; only?: boolean };
};

export type BoardInfoV2Input = {
  boardId: number;
  includeSubscribers?: boolean;
  filters?: BoardInfoV2Filters;
};

export type BoardInfoV2Outcome =
  | { kind: 'not_found' }
  | { kind: 'no_matching_views'; requested: string[]; available: string[] }
  | { kind: 'ok'; board: BoardInfoResponse['board']; unmatchedViewNames: string[] };

/**
 * Faster get_board_info flow, mirroring board-app:
 * - one board query; subitem columns come from `subitem_columns` instead of a second subitems-board round trip
 * - view names are resolved from a single full views fetch instead of an id/name index query followed by a filtered fetch
 */
export const fetchBoardInfoV2 = async (mondayApi: ApiClient, input: BoardInfoV2Input): Promise<BoardInfoV2Outcome> => {
  const columnsFilter = input.filters?.columns;
  const viewsFilter = input.filters?.views;
  const columnsOnly = Boolean(columnsFilter?.only);
  const viewsOnly = Boolean(viewsFilter?.only);

  // Both only flags → include both sections (treat as narrowed, not mutually exclusive).
  const includeColumns = !viewsOnly || columnsOnly;
  const includeViews = !columnsOnly || viewsOnly;
  const viewNames = includeViews ? (viewsFilter?.names ?? []) : [];

  const variables: GetBoardInfoV2QueryVariables = {
    boardId: input.boardId.toString(),
    columnIds: includeColumns ? columnsFilter?.ids : undefined,
    // Name filters need every view: views(ids:) does not make the server-side view load cheaper.
    viewIds: includeViews && viewNames.length === 0 ? viewsFilter?.ids : undefined,
    includeColumns,
    includeViews,
    includeSubscribers: input.includeSubscribers === true,
  };

  const res = await mondayApi.request<GetBoardInfoV2Query>(getBoardInfoV2, variables, {
    versionOverride: GET_BOARD_INFO_V2_API_VERSION,
  });
  const board = res.boards?.[0];
  if (!board) {
    return { kind: 'not_found' };
  }

  let views: ViewV2[] = (board.views ?? []).filter((view): view is ViewV2 => Boolean(view));
  let unmatchedViewNames: string[] = [];
  if (viewNames.length > 0) {
    const { viewIds: namedIds, unmatchedViewNames: unmatched } = resolveViewIdsByName(views, viewNames);
    const selectedIds = new Set([...(viewsFilter?.ids ?? []), ...namedIds]);
    const selected = views.filter((view) => selectedIds.has(view.id));
    if (selected.length === 0) {
      return {
        kind: 'no_matching_views',
        requested: viewNames,
        available: views.map((view) => view.name).filter((name): name is string => Boolean(name)),
      };
    }
    views = selected;
    unmatchedViewNames = unmatched;
  }

  const { subitem_columns: _subitemColumns, ...boardFields } = board;
  return {
    kind: 'ok',
    board: {
      ...boardFields,
      // @include(false) omits these fields from the GraphQL response — normalize to empty arrays.
      columns: board.columns ?? [],
      views,
      subItemColumns: resolveSubItemColumns(board),
    } as BoardInfoResponse['board'],
    unmatchedViewNames,
  };
};

// Preserves the v1 contract: subItemColumns only when the board has a subtasks column
// pointing at a separate subitems board (on MLS boards it self-references the board).
const resolveSubItemColumns = (board: BoardV2): ColumnV2[] | undefined => {
  const subtasksColumn = board.columns?.find((column) => column?.type === NonDeprecatedColumnType.Subtasks);
  const subItemsBoardId = subtasksColumn?.settings?.boardIds?.[0];
  if (!subtasksColumn || !subItemsBoardId || String(subItemsBoardId) === String(board.id)) {
    return undefined;
  }
  return (board.subitem_columns ?? undefined) as ColumnV2[] | undefined;
};

export const formatBoardInfoV2Response = (
  board: BoardInfoResponse['board'],
  unmatchedViewNames: string[],
  knowledge: BoardKnowledgeData | null,
  includeKnowledge: boolean,
): BoardInfoResponse => ({
  board,
  ...(includeKnowledge ? { knowledge: knowledge ?? null } : {}),
  ...(unmatchedViewNames.length > 0 ? { unmatchedViewNames } : {}),
});
