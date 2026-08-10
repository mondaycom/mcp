import { GetBoardInfoJustColumnsQuery, GetBoardInfoQuery } from '../../../../monday-graphql/generated/graphql/graphql';

export type BoardInfoData = NonNullable<NonNullable<GetBoardInfoQuery['boards']>[0]>;
export type BoardInfoJustColumnsData = NonNullable<NonNullable<GetBoardInfoJustColumnsQuery['boards']>[0]>;
export type ColumnInfo = NonNullable<BoardInfoJustColumnsData['columns']>[0];

interface BoardInfoFormatOptions {
  compact?: boolean;
}

export interface BoardInfoResponse {
  board: BoardInfoData & { subItemColumns: ColumnInfo[] | undefined };
}

const compactColumns = (columns: BoardInfoData['columns'] | BoardInfoJustColumnsData['columns']) =>
  columns?.map((column) => {
    if (!column) {
      return column;
    }

    const { settings, revision, ...compactColumn } = column;
    return compactColumn;
  });

const compactViews = (views: BoardInfoData['views']) =>
  views?.map((view) => {
    if (!view) {
      return view;
    }

    const { settings, filter, sort, ...compactView } = view;
    return compactView;
  });

export const formatBoardInfoAsJson = (
  board: BoardInfoData,
  subItemsBoard: BoardInfoJustColumnsData | null,
  options: BoardInfoFormatOptions = {},
): BoardInfoResponse => {
  const subItemColumns = subItemsBoard?.columns ?? undefined;

  if (!options.compact) {
    return {
      board: {
        ...board,
        subItemColumns,
      },
    };
  }

  return {
    board: {
      ...board,
      columns: compactColumns(board.columns),
      views: compactViews(board.views),
      subItemColumns: compactColumns(subItemColumns),
    } as BoardInfoResponse['board'],
  };
};
