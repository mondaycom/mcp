import { z } from 'zod';
import { getDocVersionHistory, getDocVersionDiff } from 'src/monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

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
    .describe(
      'If true, fetches the actual content diff for each consecutive pair of restoring points (what was added/deleted/changed). This provides more detail but takes longer. Defaults to false.',
    ),
};

interface RestoringPoint {
  date: string;
  user_ids: string[];
  type: string | null;
}

interface DiffBlock {
  id: string;
  type: string;
  summary: string;
  changes: {
    added: boolean;
    deleted: boolean;
    changed: boolean;
  };
}

interface VersionHistoryResponse {
  doc_version_history: {
    doc_id: string;
    restoring_points: RestoringPoint[];
  };
}

interface VersionDiffResponse {
  doc_version_diff: {
    doc_id: string;
    blocks: DiffBlock[];
  };
}

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
    return `Get the version history of a monday.com document. Returns a timeline of changes with timestamps and the users who made edits.

USE CASES:
- "What changes happened in this doc in the last day?"
- "Who edited this document recently?"
- "When was this document last modified and by whom?"
- "Show me the edit history for this doc"

BASIC USAGE (who edited and when):
  { doc_id: "123", since: "2026-03-15T00:00:00Z" }

WITH DIFFS (what actually changed):
  { doc_id: "123", since: "2026-03-15T00:00:00Z", include_diff: true }

RESPONSE FORMAT:
- Each restoring point represents a snapshot (grouped in ~5 minute intervals)
- user_ids are the IDs of users who made changes in that window
- When include_diff is true, each restoring point also includes a summary of what blocks were added, deleted, or changed

NOTE: The doc_id is the id field from read_docs, not the object_id. If you only have the object_id, first use read_docs to get the id.`;
  }

  getInputSchema(): typeof getDocVersionHistoryToolSchema {
    return getDocVersionHistoryToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getDocVersionHistoryToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const { doc_id, include_diff } = input;

    const since = input.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const until = input.until || new Date().toISOString();

    try {
      const historyResult = await this.mondayApi.request<VersionHistoryResponse>(getDocVersionHistory, {
        docId: doc_id,
        since,
        until,
      });

      const restoringPoints = historyResult?.doc_version_history?.restoring_points;

      if (!restoringPoints || restoringPoints.length === 0) {
        return { content: `No version history found for document ${doc_id} in the specified time range (${since} to ${until}).` };
      }

      if (include_diff && restoringPoints.length >= 2) {
        return await this.buildResponseWithDiffs(doc_id, restoringPoints, since, until);
      }

      return { content: this.formatHistoryResponse(doc_id, restoringPoints, since, until) };
    } catch (error) {
      return {
        content: `Error fetching version history for document ${doc_id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async buildResponseWithDiffs(
    docId: string,
    restoringPoints: RestoringPoint[],
    since: string,
    until: string,
  ): Promise<ToolOutputType<never>> {
    const lines: string[] = [
      `Document ${docId} — Version history (${since} to ${until})`,
      `Found ${restoringPoints.length} versions:\n`,
    ];

    for (let i = 0; i < restoringPoints.length; i++) {
      const point = restoringPoints[i];
      const userList = point.user_ids.join(', ');
      const typeLabel = point.type === 'publish' ? ' [Published]' : '';
      lines.push(`${i + 1}. ${point.date} — Users: ${userList}${typeLabel}`);

      if (i < restoringPoints.length - 1) {
        const prevPoint = restoringPoints[i + 1];
        try {
          const diffResult = await this.mondayApi.request<VersionDiffResponse>(getDocVersionDiff, {
            docId,
            date: point.date,
            prevDate: prevPoint.date,
          });

          const blocks = diffResult?.doc_version_diff?.blocks;
          if (blocks && blocks.length > 0) {
            for (const block of blocks) {
              lines.push(`   - ${block.summary}`);
            }
          } else {
            lines.push('   - No content changes detected');
          }
        } catch {
          lines.push('   - (Could not fetch diff details)');
        }
      }

      lines.push('');
    }

    return { content: lines.join('\n') };
  }

  private formatHistoryResponse(
    docId: string,
    restoringPoints: RestoringPoint[],
    since: string,
    until: string,
  ): string {
    const lines: string[] = [
      `Document ${docId} — Version history (${since} to ${until})`,
      `Found ${restoringPoints.length} versions:\n`,
    ];

    for (let i = 0; i < restoringPoints.length; i++) {
      const point = restoringPoints[i];
      const userList = point.user_ids.join(', ');
      const typeLabel = point.type === 'publish' ? ' [Published]' : '';
      lines.push(`${i + 1}. ${point.date} — Users: ${userList}${typeLabel}`);
    }

    lines.push(
      '\nTip: To see what actually changed, call this tool again with include_diff: true',
    );

    return lines.join('\n');
  }
}
