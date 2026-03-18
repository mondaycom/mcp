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
    return (
      'Get the version history of a monday.com document. Returns a timeline of restoring points with timestamps and the users who made edits. ' +
      'Use since/until to filter by date range (defaults to the last 24 hours). ' +
      'Set include_diff to true to also fetch what content blocks were added, deleted, or changed between each version. ' +
      'NOTE: doc_id is the id field from read_docs, not the object_id.'
    );
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

    const restoringPointsWithDiffs = await Promise.all(
      restoringPoints.map(async (point, i) => {
        if (i === restoringPoints.length - 1 || !point.date) {
          return point;
        }
        const prevPoint = restoringPoints[i + 1];
        const diffVariables: GetDocVersionDiffQueryVariables = {
          docId: doc_id,
          date: point.date,
          prevDate: prevPoint?.date ?? '',
        };
        const diffResult = await this.mondayApi.request<GetDocVersionDiffQuery>(getDocVersionDiff, diffVariables);
        return { ...point, diff: diffResult?.doc_version_diff?.blocks ?? [] };
      }),
    );

    return {
      content: JSON.stringify({ doc_id, since, until, restoring_points: restoringPointsWithDiffs }, null, 2),
    };
  }
}
