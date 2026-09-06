import { GetBoardInfoJustColumnsQuery, GetBoardInfoQuery } from '../../../../monday-graphql/generated/graphql/graphql';

export type BoardInfoData = NonNullable<NonNullable<GetBoardInfoQuery['boards']>[0]>;
export type BoardInfoJustColumnsData = NonNullable<NonNullable<GetBoardInfoJustColumnsQuery['boards']>[0]>;
export type ColumnInfo = NonNullable<BoardInfoJustColumnsData['columns']>[0];
export type ViewInfo = NonNullable<BoardInfoData['views']>[0];
export type ViewInfoResponse = Omit<NonNullable<ViewInfo>, 'view_specific_data_str'> & {
  view_specific_data?: Record<string, unknown>;
};

export interface BoardInfoResponse {
  board: Omit<BoardInfoData, 'views'> & {
    views: Array<ViewInfoResponse | null>;
    subItemColumns: ColumnInfo[] | undefined;
  };
  unmatchedViewNames?: string[];
}

const parseViewSpecificData = (raw: string | null | undefined): Record<string, unknown> | undefined => {
  if (!raw) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined;
    }
    const data = parsed as Record<string, unknown>;
    return Object.keys(data).length > 0 ? data : undefined;
  } catch {
    return undefined;
  }
};

export const formatView = (view: ViewInfo): ViewInfoResponse | null => {
  if (!view) {
    return null;
  }

  const { view_specific_data_str: raw, ...rest } = view;
  const viewSpecificData = parseViewSpecificData(raw);

  return viewSpecificData ? { ...rest, view_specific_data: viewSpecificData } : rest;
};

export const formatBoardInfoAsJson = (
  board: BoardInfoData,
  subItemsBoard: BoardInfoJustColumnsData | null,
  unmatchedViewNames?: string[],
): BoardInfoResponse => ({
  board: {
    ...board,
    // @include(false) omits these fields from the GraphQL response — normalize to empty arrays.
    columns: board.columns ?? [],
    views: (board.views ?? []).map(formatView),
    subItemColumns: subItemsBoard?.columns ?? undefined,
  },
  ...(unmatchedViewNames && unmatchedViewNames.length > 0 ? { unmatchedViewNames } : {}),
});

export const normalizeViewName = (name: string): string =>
  name.trim().toLowerCase().replace(/\\&/g, '&');

export const resolveViewIdsByName = (
  views: Array<{ id?: string | null; name?: string | null } | null | undefined>,
  viewNames: string[],
): { viewIds: string[]; unmatchedViewNames: string[] } => {
  const byName = new Map<string, string[]>();
  for (const view of views) {
    if (!view?.id || !view.name) {
      continue;
    }
    const key = normalizeViewName(view.name);
    const existing = byName.get(key) ?? [];
    existing.push(view.id);
    byName.set(key, existing);
  }

  const viewIds: string[] = [];
  const unmatchedViewNames: string[] = [];
  for (const name of viewNames) {
    const matched = byName.get(normalizeViewName(name));
    if (!matched?.length) {
      unmatchedViewNames.push(name);
      continue;
    }
    viewIds.push(...matched);
  }

  return { viewIds, unmatchedViewNames };
};
