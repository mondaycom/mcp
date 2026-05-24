import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { ingestItemsMutation, fetchJobStatusQuery } from './create-bulk-items.graphql';

const onMatchSchema = z
  .object({
    match_column_id: z.string().describe('The column ID to match existing items against for upsert'),
    behaviour: z.enum(['UPSERT', 'SKIP']).describe('UPSERT to update matched items, SKIP to ignore them'),
  })
  .optional()
  .describe('If provided, enables upsert mode. When omitted, all rows are created as new items.');

export const createBulkItemsSchema = {
  board_id: z.number().describe('The ID of the target board to create items on'),
  group_id: z.string().optional().default('topics').describe('The ID of the group to create items in. Defaults to "topics".'),
  items: z
    .array(
      z.record(z.string(), z.string()).describe('A row object where keys are column IDs and values are strings'),
    )
    .min(1)
    .max(10000)
    .describe(
      'Array of item objects (up to 10,000). Each object represents a row — keys are column IDs (e.g. name, status, date4), values are strings. The "name" key is required in every row.',
    ),
  on_match: onMatchSchema,
};

interface IngestItemsResponse {
  ingest_items: {
    job_id: string;
    upload_url: string;
  };
}

interface JobStatusResponse {
  fetch_job_status: {
    status: string;
    progress_percentage: number;
    fully_imported: boolean;
    counts: {
      submitted: number;
      invalid: number;
      skipped: number;
      created: number;
      updated: number;
      failed: number;
    };
    failure_reason: string | null;
    failure_message: string | null;
  };
}

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

function buildCsv(items: Record<string, string>[]): string {
  const columnIds = [...new Set(items.flatMap((item) => Object.keys(item)))];
  const header = columnIds.join(',');
  const rows = items.map((item) =>
    columnIds.map((col) => escapeCsvField(item[col] ?? '')).join(','),
  );
  return [header, ...rows].join('\n');
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function pollJobStatus(
  request: <T>(query: string, variables?: Record<string, any>, options?: any) => Promise<T>,
  jobId: string,
): Promise<JobStatusResponse['fetch_job_status']> {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const res = await request<JobStatusResponse>(fetchJobStatusQuery, { jobId }, { versionOverride: '2026-07' });
    const status = res.fetch_job_status;
    if (status.fully_imported) {
      return status;
    }
    if (status.failure_reason) {
      return status;
    }
  }
  throw new Error('Polling timed out after 60 seconds');
}

export class CreateBulkItemsTool extends BaseMondayApiTool<typeof createBulkItemsSchema, never> {
  name = 'create_bulk_items';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Bulk Items',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return (
      'Bulk create or update up to 10,000 items on a monday.com board using the ingest_items mutation. ' +
      'Provide an array of row objects where keys are column IDs (e.g. name, status, date4) and values are strings. ' +
      'Optionally provide on_match to enable upsert mode — matched items are updated or skipped instead of duplicated. ' +
      'Returns the job ID and final counts (created, updated, skipped, invalid, failed).'
    );
  }

  getInputSchema(): typeof createBulkItemsSchema {
    return createBulkItemsSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof createBulkItemsSchema>): Promise<ToolOutputType<never>> {
    const { board_id, group_id, items, on_match } = input;

    const variables: Record<string, any> = { boardId: String(board_id), groupId: group_id };
    if (on_match) {
      variables.onMatch = { match_column_id: on_match.match_column_id, behaviour: on_match.behaviour };
    }

    const ingestRes = await this.mondayApi.request<IngestItemsResponse>(
      ingestItemsMutation,
      variables,
      { versionOverride: '2026-07' },
    );

    const { job_id, upload_url } = ingestRes.ingest_items;

    const csv = buildCsv(items);
    const uploadResponse = await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/csv' },
      body: csv,
    });

    if (!uploadResponse.ok) {
      throw new Error(`S3 upload failed: HTTP ${uploadResponse.status}`);
    }

    const jobStatus = await pollJobStatus(
      this.mondayApi.request.bind(this.mondayApi),
      job_id,
    );

    if (jobStatus.failure_reason) {
      return {
        content: {
          job_id,
          error: jobStatus.failure_reason,
          message: jobStatus.failure_message,
        },
      };
    }

    return {
      content: {
        job_id,
        counts: jobStatus.counts,
      },
    };
  }
}
