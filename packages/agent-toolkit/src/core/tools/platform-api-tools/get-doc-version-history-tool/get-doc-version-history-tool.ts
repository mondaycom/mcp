import { z } from 'zod';
import { getDocVersionHistory, getDocVersionDiff } from './get-doc-version-history-tool.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  GetDocVersionHistoryQuery,
  GetDocVersionHistoryQueryVariables,
  GetDocVersionDiffQuery,
  GetDocVersionDiffQueryVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';

export const getDocVersionHistoryToolSchema = {
  doc_id: z
    .string()
    .min(1)
    .describe(
      'The document ID to get version history for. This is the id field returned by read_docs (not the object_id).',
    ),
  since: z
    .string()
    .optional()
    .describe(
      'ISO 8601 date string to filter restoring points from (e.g., "2026-03-15T00:00:00Z"). Only changes after this date will be returned. Defaults to 24 hours ago if not provided.',
    ),
  until: z
    .string()
    .optional()
    .describe(
      'ISO 8601 date string to filter restoring points until (e.g., "2026-03-16T23:59:59Z"). Only changes before this date will be returned. Defaults to now if not provided.',
    ),
  include_diff: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'If true, fetches the actual content diff for each consecutive pair of restoring points (what was added/deleted/changed). Defaults to false.',
    ),
};

const MAX_DIFF_POINTS = 10;

export class GetDocVersionHistoryTool extends BaseMondayApiTool<typeof getDocVersionHistoryToolSchema> {
  name = 'get_doc_version_history';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Document Version History',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Get the version history of a monday.com document. Returns a timeline of restoring points with timestamps and the users who made edits. Results are limited to the specified time range (defaults to the last 24 hours).

USAGE EXAMPLES:
- Who edited this doc today: { doc_id: "123", since: "2026-03-18T00:00:00Z" }
- What changed in the last week: { doc_id: "123", since: "2026-03-11T00:00:00Z", include_diff: true }

NOTE: doc_id is the id field from read_docs, not the object_id. When include_diff is true, diffs are fetched for up to ${MAX_DIFF_POINTS} restoring points and may be slower due to additional API calls.`;
  }

  getInputSchema(): typeof getDocVersionHistoryToolSchema {
    return getDocVersionHistoryToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getDocVersionHistoryToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const { doc_id, include_diff } = input;

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
}
