import { GetBoardInfoJustColumnsQuery, GetBoardInfoQuery } from '../../../../monday-graphql/generated/graphql/graphql';
import {
  EntityKnowledgeSectionKind,
  GetBoardKnowledgeQuery,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';

export type BoardInfoData = NonNullable<NonNullable<GetBoardInfoQuery['boards']>[0]>;
export type BoardInfoJustColumnsData = NonNullable<NonNullable<GetBoardInfoJustColumnsQuery['boards']>[0]>;
export type ColumnInfo = NonNullable<BoardInfoJustColumnsData['columns']>[0];
export type BoardKnowledgeData = NonNullable<GetBoardKnowledgeQuery['entity_knowledge']>;

export interface BoardKnowledgeResponse {
  summary: string | null;
  status: BoardKnowledgeData['status'];
  ageSeconds: number | null;
  markdown: string;
}

export interface BoardInfoResponse {
  board: BoardInfoData & { subItemColumns: ColumnInfo[] | undefined };
  knowledge: BoardKnowledgeResponse | null;
  unmatchedViewNames?: string[];
}

export const formatBoardInfoAsJson = (
  board: BoardInfoData,
  subItemsBoard: BoardInfoJustColumnsData | null,
  unmatchedViewNames?: string[],
  knowledge?: BoardKnowledgeData | null,
): BoardInfoResponse => ({
  board: {
    ...board,
    // @include(false) omits these fields from the GraphQL response — normalize to empty arrays.
    columns: board.columns ?? [],
    views: board.views ?? [],
    subItemColumns: subItemsBoard?.columns ?? undefined,
  },
  knowledge: knowledge ? formatBoardKnowledge(knowledge) : null,
  ...(unmatchedViewNames && unmatchedViewNames.length > 0 ? { unmatchedViewNames } : {}),
});

const formatBoardKnowledge = (knowledge: BoardKnowledgeData): BoardKnowledgeResponse => ({
  summary: knowledge.summary ?? null,
  status: knowledge.status,
  ageSeconds: knowledge.age_seconds ?? null,
  markdown: (knowledge.sections ?? [])
    .map((section) => {
      const title = section.title ?? section.key ?? 'Board knowledge';
      if (section.kind === EntityKnowledgeSectionKind.Markdown) {
        return `## ${title}\n\n${section.body_markdown ?? ''}`;
      }

      return `## ${title}\n\n${formatStructuredKnowledge(section.data_json)}`;
    })
    .join('\n\n'),
});

const formatStructuredKnowledge = (dataJson?: string | null): string => {
  if (!dataJson) {
    return '_No data available._';
  }

  try {
    return renderKnowledgeValue(JSON.parse(dataJson));
  } catch {
    return '_Structured data unavailable._';
  }
};

const renderKnowledgeValue = (value: unknown, depth = 0): string => {
  const indent = '  '.repeat(depth);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${indent}- None`;
    }

    return value
      .map((entry) =>
        isKnowledgeContainer(entry)
          ? `${indent}-\n${renderKnowledgeValue(entry, depth + 1)}`
          : `${indent}- ${formatKnowledgeScalar(entry)}`,
      )
      .join('\n');
  }

  if (isKnowledgeObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return `${indent}- None`;
    }

    return entries
      .map(([key, entry]) =>
        isKnowledgeContainer(entry)
          ? `${indent}- **${key}:**\n${renderKnowledgeValue(entry, depth + 1)}`
          : `${indent}- **${key}:** ${formatKnowledgeScalar(entry)}`,
      )
      .join('\n');
  }

  return `${indent}${formatKnowledgeScalar(value)}`;
};

const isKnowledgeObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isKnowledgeContainer = (value: unknown): value is Record<string, unknown> | unknown[] =>
  Array.isArray(value) || isKnowledgeObject(value);

const formatKnowledgeScalar = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return value;
  }
  return String(value);
};

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
