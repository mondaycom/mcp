import { GetBoardInfoJustColumnsQuery, GetBoardInfoQuery } from '../../../../monday-graphql/generated/graphql/graphql';
import { GetBoardKnowledgeQuery } from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { parseFormViewToken } from '../utils/form-view-token';

export type BoardInfoData = NonNullable<NonNullable<GetBoardInfoQuery['boards']>[0]>;
type BoardInfoView = NonNullable<NonNullable<BoardInfoData['views']>[number]>;
export type BoardInfoViewOutput = Omit<BoardInfoView, 'view_specific_data_str'> & { formToken?: string };
export type BoardInfoJustColumnsData = NonNullable<NonNullable<GetBoardInfoJustColumnsQuery['boards']>[0]>;
export type ColumnInfo = NonNullable<BoardInfoJustColumnsData['columns']>[0];
export type BoardKnowledgeData = NonNullable<GetBoardKnowledgeQuery['entity_knowledge']>;

export interface BoardInfoResponse {
  board: Omit<BoardInfoData, 'views'> & { views: BoardInfoViewOutput[]; subItemColumns: ColumnInfo[] | undefined };
  knowledge?: BoardKnowledgeData | null;
  unmatchedViewNames?: string[];
}

export const toViewOutput = ({ view_specific_data_str, ...view }: BoardInfoView): BoardInfoViewOutput => {
  const formToken = parseFormViewToken(view_specific_data_str);
  return formToken ? { ...view, formToken } : view;
};

export const formatBoardInfoAsJson = (
  board: BoardInfoData,
  subItemsBoard: BoardInfoJustColumnsData | null,
  unmatchedViewNames?: string[],
  knowledge?: BoardKnowledgeData | null,
  includeKnowledge = true,
): BoardInfoResponse => ({
  board: {
    ...board,
    // @include(false) omits these fields from the GraphQL response — normalize to empty arrays.
    columns: board.columns ?? [],
    views: (board.views ?? []).filter((view): view is BoardInfoView => Boolean(view)).map(toViewOutput),
    subItemColumns: subItemsBoard?.columns ?? undefined,
  },
  ...(includeKnowledge ? { knowledge: knowledge ?? null } : {}),
  ...(unmatchedViewNames && unmatchedViewNames.length > 0 ? { unmatchedViewNames } : {}),
});

export const normalizeViewName = (name: string): string => name.trim().toLowerCase().replace(/\\&/g, '&');

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
