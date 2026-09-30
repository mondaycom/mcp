import { ApiClient } from '@mondaydotcomorg/api';
import { ReadDocsQuery } from 'src/monday-graphql/generated/graphql/graphql';
import { boardViewDocs } from './board-view-doc.utils.graphql';

// Typed by hand rather than through codegen: board_view_docs is newer than the schema snapshot the
// generated types are built from. The selection set matches readDocs, hence the shared doc type.
type BoardViewDoc = NonNullable<NonNullable<ReadDocsQuery['docs']>[number]>;

type BoardViewDocsQuery = {
  board_view_docs?: Array<BoardViewDoc | null> | null;
};

export type BoardViewDocsOptions = {
  includeBlocks?: boolean;
  blocksLimit?: number;
  blocksPage?: number;
};

/**
 * Docs that live as a board view are not reachable by doc id or object id through the docs()
 * query, because it filters out objects nested inside another object. They have to be resolved
 * through the board they live on.
 */
export async function fetchBoardViewDocs(
  mondayApi: ApiClient,
  boardId: string,
  viewId?: string,
  options: BoardViewDocsOptions = {},
): Promise<BoardViewDoc[]> {
  const res = await mondayApi.request<BoardViewDocsQuery>(boardViewDocs, {
    boardId,
    viewId,
    includeBlocks: options.includeBlocks ?? false,
    blocksLimit: options.blocksLimit,
    blocksPage: options.blocksPage,
  });
  return (res.board_view_docs ?? []).filter((doc): doc is BoardViewDoc => doc != null);
}

export type ResolvedBoardViewDoc = { ok: true; doc: BoardViewDoc } | { ok: false; error: string };

export async function resolveBoardViewDoc(
  mondayApi: ApiClient,
  boardId: string,
  viewId?: string,
): Promise<ResolvedBoardViewDoc> {
  let docs: BoardViewDoc[];
  try {
    docs = await fetchBoardViewDocs(mondayApi, boardId, viewId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      ok: false,
      error: `Failed to resolve the doc of board ${boardId}${viewId ? ` view ${viewId}` : ''}: ${message}`,
    };
  }

  if (docs.length === 0) {
    return { ok: false, error: noDocsFoundMessage(boardId, viewId) };
  }

  if (docs.length > 1) {
    const names = docs.map((doc) => doc.name).join(', ');
    return {
      ok: false,
      error: `Board ${boardId} has ${docs.length} doc views (${names}). Pass view_id to pick one — it is the <view_id> in https://<slug>.monday.com/boards/${boardId}/views/<view_id>.`,
    };
  }

  return { ok: true, doc: docs[0] };
}

export function noDocsFoundMessage(boardId: string, viewId?: string): string {
  return viewId
    ? `No doc found for view ${viewId} on board ${boardId}. The view may not be a doc view, or the doc may not have been opened yet.`
    : `Board ${boardId} has no doc views.`;
}
