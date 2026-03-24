import { z } from 'zod';
import { ReadDocsQuery, ReadDocsQueryVariables, DocsOrderBy } from 'src/monday-graphql/generated/graphql/graphql';
import { exportMarkdownFromDoc } from 'src/monday-graphql/queries.graphql';
import { readDocs } from './read-docs-tool.graphql';
import {
  GetDocVersionHistoryQuery,
  GetDocVersionHistoryQueryVariables,
  GetDocVersionDiffQuery,
  GetDocVersionDiffQueryVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { getDocVersionHistory, getDocVersionDiff } from './read-docs-tool.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

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
    .describe('Array of ID values matching the query type. Required when mode is "content".'),
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

  // --- version_history mode fields ---
  doc_id: z
    .string()
    .optional()
    .describe(
      'The document ID to get version history for. This is the id field from content mode (not the object_id). Required when mode is "version_history".',
    ),
  since: z
    .string()
    .optional()
    .describe(
      'ISO 8601 date string to filter version history from (e.g., "2026-03-15T00:00:00Z"). Defaults to 24 hours ago. Only used in version_history mode.',
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

MODE: "version_history" — Fetch the edit history of a single document.
- Requires: doc_id (the id field from content mode, not object_id)
- Defaults to the last 24 hours. Use since/until to widen the range.
- Set include_diff: true to see what content changed between versions (fetches up to ${MAX_DIFF_POINTS} diffs, may be slower).`;
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

      if (!res.docs?.some((doc) => doc != null) && ids) {
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

      if (!res.docs?.some((doc) => doc != null)) {
        const pageInfo = input.page ? ` (page ${input.page})` : '';
        return { content: `No documents found matching the specified criteria${pageInfo}.` };
      }

      return this.enrichDocsWithMarkdown(res.docs, variables, includeBlocks);
    } catch (error) {
      return { content: `Error reading documents: ${error instanceof Error ? error.message : 'Unknown error occurred'}` };
    }
  }

  private async executeVersionHistory(input: ToolInputType<typeof readDocsToolSchema>): Promise<ToolOutputType<never>> {
    const { doc_id, include_diff } = input;

    if (!doc_id) {
      return { content: 'Error: doc_id is required when mode is "version_history".' };
    }

    const since = input.since ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const until = input.until ?? new Date().toISOString();

    try {
      const variables: GetDocVersionHistoryQueryVariables = { docId: doc_id, since, until };
      const historyResult = await this.mondayApi.request<GetDocVersionHistoryQuery>(getDocVersionHistory, variables);

      const restoringPoints = historyResult?.doc_version_history?.restoring_points;

      if (!restoringPoints || restoringPoints.length === 0) {
        return {
          content: `No version history found for document ${doc_id} in the specified time range (${since} to ${until}).`,
        };
      }

      if (!include_diff) {
        return {
          content: JSON.stringify({ doc_id, since, until, restoring_points: restoringPoints }, null, 2),
        };
      }

      const pointsToFetch = restoringPoints.slice(0, MAX_DIFF_POINTS);
      const truncated = restoringPoints.length > MAX_DIFF_POINTS;

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
            docId: doc_id,
            date: point.date,
            prevDate: prevPoint.date,
          };
          const diffResult = await this.mondayApi.request<GetDocVersionDiffQuery>(getDocVersionDiff, diffVariables);
          return { ...point, diff: diffResult?.doc_version_diff?.blocks ?? [] };
        }),
      ).then((results) => results.map((r, i) => (r.status === 'fulfilled' ? r.value : pointsToFetch[i])));

      return {
        content: JSON.stringify(
          {
            doc_id,
            since,
            until,
            restoring_points: restoringPointsWithDiffs,
            ...(truncated && { truncated: true, total_count: restoringPoints.length }),
          },
          null,
          2,
        ),
      };
    } catch (error) {
      return {
        content: `Error fetching version history for document ${doc_id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async enrichDocsWithMarkdown(
    docs: NonNullable<ReadDocsQuery['docs']>,
    variables: ReadDocsQueryVariables,
    includeBlocks: boolean,
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
