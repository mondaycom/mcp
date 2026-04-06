import { z } from 'zod';
import { ReadDocsQuery, ReadDocsQueryVariables, DocsOrderBy } from 'src/monday-graphql/generated/graphql/graphql';
import { exportMarkdownFromDoc } from 'src/monday-graphql/queries.graphql';
import { readDocs, getDocComments } from './read-docs-tool.graphql';
import {
  GetDocVersionHistoryQuery,
  GetDocVersionHistoryQueryVariables,
  GetDocVersionDiffQuery,
  GetDocVersionDiffQueryVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { getDocVersionHistory, getDocVersionDiff } from './read-docs-tool.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

// Types for the GetDocComments query (manually defined as codegen has a pre-existing conflict)
type GetDocCommentsQueryVariables = {
  boardId: string;
  itemsLimit?: number;
  updatesLimit?: number;
};

type DocCommentCreator = {
  id: string;
  name: string;
};

type DocCommentReply = {
  id: string;
  text_body?: string | null;
  body: string;
  created_at?: string | null;
  creator?: DocCommentCreator | null;
};

type DocCommentUpdate = {
  id: string;
  text_body?: string | null;
  body: string;
  created_at?: string | null;
  creator?: DocCommentCreator | null;
  replies?: DocCommentReply[] | null;
};

type DocCommentItem = {
  id: string;
  name: string;
  updates?: DocCommentUpdate[] | null;
};

type GetDocCommentsQuery = {
  boards?: Array<{
    items_page?: {
      items?: DocCommentItem[] | null;
    } | null;
  }> | null;
};

const QueryByIdEnum = z.enum(['ids', 'object_ids', 'workspace_ids']);

const MAX_DIFF_POINTS = 10;

export const readDocsToolSchema = {
  mode: z
    .enum(['content', 'version_history'])
    .optional()
    .default('content')
    .describe(
      'The operation mode. "content" (default) fetches documents with their markdown content. "version_history" fetches the edit history of a single document.',
    ),

  // --- content mode fields ---
  type: QueryByIdEnum.optional().describe(
    'Query type for content mode: "ids", "object_ids", or "workspace_ids". Required when mode is "content".',
  ),
  ids: z
    .array(z.string())
    .optional()
    .describe('Array of ID values. In content mode: matches the query type (ids/object_ids/workspace_ids). In version_history mode: provide the single document object_id here (e.g., ids: ["5001466606"]).'),
  limit: z
    .number()
    .optional()
    .describe('Number of docs per page (default: 25). Only used in content mode.'),
  order_by: z
    .nativeEnum(DocsOrderBy)
    .optional()
    .describe('Order in which to retrieve docs. Only used in content mode.'),
  page: z
    .number()
    .optional()
    .describe('Page number to return (starts at 1). Only used in content mode.'),
  include_blocks: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'If true, includes the blocks array (block IDs, types, positions, content) in the response. Required when you plan to call update_doc. Defaults to false to reduce response size. Only used in content mode.',
    ),
  include_comments: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'If true, fetches all comments and replies on the document. Comments are stored at the item level within the doc backing board. Defaults to false. Only used in content mode.',
    ),
  comments_limit: z
    .number()
    .optional()
    .default(50)
    .describe(
      'Maximum number of comments (updates) to fetch per item when include_comments is true. Defaults to 50. Only used in content mode.',
    ),

  // --- version_history mode fields ---
  version_history_limit: z
    .number()
    .optional()
    .describe(
      'Maximum number of restoring points to return. Use this when the user asks for "last N changes". Only used in version_history mode.',
    ),
  since: z
    .string()
    .optional()
    .describe(
      'ISO 8601 date string to filter version history from (e.g., "2026-03-15T00:00:00Z"). If omitted, returns the full history. Only used in version_history mode.',
    ),
  until: z
    .string()
    .optional()
    .describe(
      'ISO 8601 date string to filter version history until (e.g., "2026-03-16T23:59:59Z"). Defaults to now. Only used in version_history mode.',
    ),
  include_diff: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'If true, fetches content diffs between consecutive restoring points. May be slower due to additional API calls. Only used in version_history mode.',
    ),
};

export class ReadDocsTool extends BaseMondayApiTool<typeof readDocsToolSchema> {
  name = 'read_docs';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Read Documents',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Get information about monday.com documents. Supports two modes:

MODE: "content" (default) — Fetch documents with their full markdown content.
- Requires: type ("ids" | "object_ids" | "workspace_ids") and ids array
- Supports pagination via page/limit. Check has_more_pages in response.
- If type "ids" returns no results, automatically retries with object_ids.
- Set include_blocks: true to include block IDs, types, and positions in the response — required before calling update_doc.
- Set include_comments: true to fetch all comments and replies on the document. Use comments_limit to control how many comments per item (default 50).

MODE: "version_history" — Fetch the edit history of a single document.
- Requires: ids with the document's object_id (use the object_id field from content mode results, NOT the id field).
- The object_id is the numeric ID visible in the document URL.
- Returns restoring points sorted newest-first. Use version_history_limit to cap results (e.g., "last 3 changes" → version_history_limit: 3).
- Use since/until to filter by time range. If omitted, returns full history.
- Set include_diff: true to see what content changed between versions (fetches up to ${MAX_DIFF_POINTS} diffs, may be slower).
- Examples:
  - { mode: "version_history", ids: ["5001466606"], version_history_limit: 3 }
  - { mode: "version_history", ids: ["5001466606"], since: "2026-03-11T00:00:00Z", include_diff: true }`;
  }

  getInputSchema(): typeof readDocsToolSchema {
    return readDocsToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof readDocsToolSchema>): Promise<ToolOutputType<never>> {
    if (input.mode === 'version_history') {
      return this.executeVersionHistory(input);
    }
    return this.executeContent(input);
  }

  private async executeContent(input: ToolInputType<typeof readDocsToolSchema>): Promise<ToolOutputType<never>> {
    try {
      if (!input.type || !input.ids || input.ids.length === 0) {
        return { content: 'Error: type and ids are required when mode is "content".' };
      }

      let ids: string[] | undefined;
      let object_ids: string[] | undefined;
      let workspace_ids: string[] | undefined;

      switch (input.type) {
        case 'ids':
          ids = input.ids;
          break;
        case 'object_ids':
          object_ids = input.ids;
          break;
        case 'workspace_ids':
          workspace_ids = input.ids;
          break;
      }

      const includeBlocks = input.include_blocks ?? false;
      const variables: ReadDocsQueryVariables & { includeBlocks: boolean } = {
        ids,
        object_ids,
        limit: input.limit || 25,
        order_by: input.order_by,
        page: input.page,
        workspace_ids,
        includeBlocks,
      };

      let res = await this.mondayApi.request<ReadDocsQuery>(readDocs, variables);

      if ((!res.docs || res.docs.length === 0) && ids) {
        const fallbackVariables: ReadDocsQueryVariables & { includeBlocks: boolean } = {
          ids: undefined,
          object_ids: ids,
          limit: input.limit || 25,
          order_by: input.order_by,
          page: input.page,
          workspace_ids,
          includeBlocks,
        };
        res = await this.mondayApi.request<ReadDocsQuery>(readDocs, fallbackVariables);
      }

      if (!res.docs || res.docs.length === 0) {
        const pageInfo = input.page ? ` (page ${input.page})` : '';
        return { content: `No documents found matching the specified criteria${pageInfo}.` };
      }

      const includeComments = input.include_comments ?? false;
      const commentsLimit = input.comments_limit ?? 50;

      return this.enrichDocsWithMarkdown(res.docs, variables, includeBlocks, includeComments, commentsLimit);
    } catch (error) {
      return { content: `Error reading documents: ${error instanceof Error ? error.message : 'Unknown error occurred'}` };
    }
  }

  private async executeVersionHistory(input: ToolInputType<typeof readDocsToolSchema>): Promise<ToolOutputType<never>> {
    const { include_diff, since, until, version_history_limit } = input;
    const objectId = input.ids?.[0];

    if (!objectId) {
      return { content: 'Error: ids is required when mode is "version_history". Provide the document object_id.' };
    }

    try {
      const variables: GetDocVersionHistoryQueryVariables = { docId: objectId, since, until };
      const historyResult = await this.mondayApi.request<GetDocVersionHistoryQuery>(getDocVersionHistory, variables);

      let restoringPoints = historyResult?.doc_version_history?.restoring_points;

      if (!restoringPoints || restoringPoints.length === 0) {
        return {
          content: `No version history found for document ${objectId}${since ? ` from ${since}` : ''}.`,
        };
      }

      if (!include_diff) {
        if (version_history_limit) {
          restoringPoints = restoringPoints.slice(0, version_history_limit);
        }
        return {
          content: { doc_id: objectId, since, until, restoring_points: restoringPoints },
        };
      }

      // Cap at MAX_DIFF_POINTS to limit the number of diff API calls.
      // Fetch one extra point beyond the user's limit so the oldest visible point
      // has a "previous" snapshot to diff against — without it the last point
      // always comes back with no diff.
      const userLimit = Math.min(version_history_limit ?? MAX_DIFF_POINTS, MAX_DIFF_POINTS);
      const pointsToFetch = restoringPoints.slice(0, userLimit + 1);
      const truncated = restoringPoints.length > userLimit;

      const restoringPointsWithDiffs = await Promise.allSettled(
        pointsToFetch.map(async (point, i) => {
          if (i === pointsToFetch.length - 1 || !point.date) {
            return point;
          }
          const prevPoint = pointsToFetch[i + 1];
          if (!prevPoint?.date) {
            return point;
          }
          const diffVariables: GetDocVersionDiffQueryVariables = {
            docId: objectId,
            date: point.date,
            prevDate: prevPoint.date,
          };
          const diffResult = await this.mondayApi.request<GetDocVersionDiffQuery>(getDocVersionDiff, diffVariables);
          return { ...point, diff: diffResult?.doc_version_diff?.blocks ?? [] };
        }),
      ).then((results) => results.map((r, i) => (r.status === 'fulfilled' ? r.value : pointsToFetch[i])));

      // Drop the extra context point — it was only needed to compute the last diff.
      const finalPoints = restoringPointsWithDiffs.slice(0, userLimit);

      return {
        content: {
          doc_id: objectId,
          since,
          until,
          restoring_points: finalPoints,
          ...(truncated && { truncated: true, total_count: restoringPoints.length }),
        },
      };
    } catch (error) {
      return {
        content: `Error fetching version history for document ${objectId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async fetchDocComments(objectId: string, commentsLimit: number) {
    try {
      const variables: GetDocCommentsQueryVariables = {
        boardId: objectId,
        itemsLimit: 100,
        updatesLimit: commentsLimit,
      };

      const res = await this.mondayApi.request<GetDocCommentsQuery>(getDocComments, variables);
      const items = res.boards?.[0]?.items_page?.items;

      if (!items) return [];

      const comments: Array<{
        id: string;
        text_body?: string | null;
        body: string;
        created_at?: string | null;
        creator: { id: string; name: string } | null;
        item_id: string;
        item_name: string;
        replies: Array<{
          id: string;
          text_body?: string | null;
          body: string;
          created_at?: string | null;
          creator: { id: string; name: string } | null;
        }>;
      }> = [];

      for (const item of items) {
        if (!item.updates || item.updates.length === 0) continue;

        for (const update of item.updates) {
          comments.push({
            id: update.id,
            text_body: update.text_body,
            body: update.body,
            created_at: update.created_at,
            creator: update.creator ? { id: update.creator.id, name: update.creator.name } : null,
            item_id: item.id,
            item_name: item.name,
            replies: (update.replies ?? []).map((reply) => ({
              id: reply.id,
              text_body: reply.text_body,
              body: reply.body,
              created_at: reply.created_at,
              creator: reply.creator ? { id: reply.creator.id, name: reply.creator.name } : null,
            })),
          });
        }
      }

      return comments;
    } catch (error) {
      return `Error fetching comments: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async enrichDocsWithMarkdown(
    docs: NonNullable<ReadDocsQuery['docs']>,
    variables: ReadDocsQueryVariables,
    includeBlocks: boolean,
    includeComments: boolean = false,
    commentsLimit: number = 50,
  ): Promise<ToolOutputType<never>> {
    type ExportMarkdownFromDocMutationVariables = {
      docId: string;
      blockIds?: string[];
    };

    type ExportMarkdownFromDocMutation = {
      export_markdown_from_doc: {
        success: boolean;
        markdown?: string;
        error?: string;
      };
    };

    const docsInfo = await Promise.all(
      docs
        .filter((doc): doc is NonNullable<typeof doc> => doc !== null)
        .map(async (doc) => {
          let blocksAsMarkdown = '';
          try {
            const markdownVariables: ExportMarkdownFromDocMutationVariables = { docId: doc.id };
            const markdownRes = await this.mondayApi.request<ExportMarkdownFromDocMutation>(
              exportMarkdownFromDoc,
              markdownVariables,
            );
            if (markdownRes.export_markdown_from_doc.success && markdownRes.export_markdown_from_doc.markdown) {
              blocksAsMarkdown = markdownRes.export_markdown_from_doc.markdown;
            } else {
              blocksAsMarkdown = `Error getting markdown: ${markdownRes.export_markdown_from_doc.error || 'Unknown error'}`;
            }
          } catch (error) {
            blocksAsMarkdown = `Error getting markdown: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }

          let comments: Awaited<ReturnType<ReadDocsTool['fetchDocComments']>> | undefined;
          if (includeComments && doc.object_id) {
            comments = await this.fetchDocComments(doc.object_id, commentsLimit);
          }

          return {
            id: doc.id,
            object_id: doc.object_id,
            name: doc.name,
            doc_kind: doc.doc_kind,
            created_at: doc.created_at,
            created_by: doc.created_by?.name || 'Unknown',
            url: doc.url,
            relative_url: doc.relative_url,
            workspace: doc.workspace?.name || 'Unknown',
            workspace_id: doc.workspace_id,
            doc_folder_id: doc.doc_folder_id,
            settings: doc.settings,
            ...(includeBlocks && {
              blocks: (doc.blocks ?? [])
                .filter((b): b is NonNullable<typeof b> => b != null)
                .map((b) => ({
                  id: b.id,
                  type: b.type,
                  parent_block_id: b.parent_block_id,
                  position: b.position,
                  content: b.content,
                })),
            }),
            blocks_as_markdown: blocksAsMarkdown,
            ...(includeComments && { comments }),
          };
        }),
    );

    const currentPage = variables.page || 1;
    const limit = variables.limit || 25;
    const docsCount = docsInfo.length;
    const hasMorePages = docsCount === limit;

    return {
      content: {
        message: `Documents retrieved (${docsInfo.length})`,
        pagination: {
          current_page: currentPage,
          limit,
          count: docsCount,
          has_more_pages: hasMorePages,
        },
        data: docsInfo,
      },
    };
  }
}
