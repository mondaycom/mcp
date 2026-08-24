import { GetBoardInfoJustColumnsQuery, GetBoardInfoQuery } from '../../../../monday-graphql/generated/graphql/graphql';

export type BoardInfoData = NonNullable<NonNullable<GetBoardInfoQuery['boards']>[0]>;
export type BoardInfoJustColumnsData = NonNullable<NonNullable<GetBoardInfoJustColumnsQuery['boards']>[0]>;
export type ColumnInfo = NonNullable<BoardInfoJustColumnsData['columns']>[0];

export interface BoardInfoResponse {
  board: BoardInfoData & { subItemColumns: ColumnInfo[] | undefined };
  unmatchedViewNames?: string[];
}

export const formatBoardInfoAsJson = (
  board: BoardInfoData,
  subItemsBoard: BoardInfoJustColumnsData | null,
  unmatchedViewNames?: string[],
): BoardInfoResponse => ({
  board: {
    ...board,
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
