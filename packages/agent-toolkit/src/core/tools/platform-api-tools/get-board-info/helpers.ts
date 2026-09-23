import { GetBoardInfoJustColumnsQuery, GetBoardInfoQuery } from '../../../../monday-graphql/generated/graphql/graphql';
import { GetBoardKnowledgeQuery } from '../../../../monday-graphql/generated/graphql.dev/graphql';

export type BoardInfoData = NonNullable<NonNullable<GetBoardInfoQuery['boards']>[0]>;
export type BoardInfoJustColumnsData = NonNullable<NonNullable<GetBoardInfoJustColumnsQuery['boards']>[0]>;
export type ColumnInfo = NonNullable<BoardInfoJustColumnsData['columns']>[0];
export type BoardKnowledgeData = NonNullable<GetBoardKnowledgeQuery['entity_knowledge']>;
type BoardKnowledgeSectionData = NonNullable<BoardKnowledgeData['sections']>[number];

export interface BoardKnowledgeSectionResponse {
  key: BoardKnowledgeSectionData['key'];
  title: string | null;
  kind: BoardKnowledgeSectionData['kind'];
  confidence: number | null;
  bodyMarkdown: string | null;
  data: unknown | null;
}

export interface BoardKnowledgeResponse {
  summary: string | null;
  status: BoardKnowledgeData['status'];
  ageSeconds: number | null;
  sections: BoardKnowledgeSectionResponse[];
}

export interface BoardInfoResponse {
  board: BoardInfoData & { subItemColumns: ColumnInfo[] | undefined };
  knowledge?: BoardKnowledgeResponse | null;
  unmatchedViewNames?: string[];
}

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
    views: board.views ?? [],
    subItemColumns: subItemsBoard?.columns ?? undefined,
  },
  ...(includeKnowledge ? { knowledge: knowledge ? formatBoardKnowledge(knowledge) : null } : {}),
  ...(unmatchedViewNames && unmatchedViewNames.length > 0 ? { unmatchedViewNames } : {}),
});

const formatBoardKnowledge = (knowledge: BoardKnowledgeData): BoardKnowledgeResponse => ({
  summary: knowledge.summary ?? null,
  status: knowledge.status,
  ageSeconds: knowledge.age_seconds ?? null,
  sections: (knowledge.sections ?? []).map((section) => ({
    key: section.key,
    title: section.title ?? null,
    kind: section.kind,
    confidence: section.confidence ?? null,
    bodyMarkdown: section.body_markdown ?? null,
    data: section.data ?? null,
  })),
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
