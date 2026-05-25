import { z } from 'zod';
import { ingestItemsMutation, fetchJobStatusQuery } from './bulk-items.graphql';

export interface IngestItemsResponse {
  ingest_items: {
    job_id: string;
    upload_url: string;
  };
}

export interface JobStatusResponse {
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

export const itemsSchema = z
  .array(
    z.record(z.string(), z.string()).describe('A row object where keys are column IDs and values are strings'),
  )
  .min(1)
  .max(10000)
  .describe(
    'Array of item objects (up to 10,000). Each object represents a row — keys are column IDs (e.g. name, status, date4), values are strings. The "name" key is required in every row.',
  );

export const boardIdSchema = z.number().describe('The ID of the target board');

export const groupIdSchema = z.string().describe('The ID of the group to target. The operation only affects items in this specific group. To update items across multiple groups, call this tool once per group.');

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv(items: Record<string, string>[]): string {
  const columnIds = [...new Set(items.flatMap((item) => Object.keys(item)))];
  const header = columnIds.join(',');
  const rows = items.map((item) =>
    columnIds.map((col) => escapeCsvField(item[col] ?? '')).join(','),
  );
  return [header, ...rows].join('\n');
}

export async function pollJobStatus(
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

export async function executeIngestItems(
  mondayApi: { request: <T>(query: string, variables?: Record<string, any>, options?: any) => Promise<T> },
  params: { boardId: string; groupId: string; items: Record<string, string>[]; onMatch?: { match_column_id: string; behaviour: string } },
) {
  const variables: Record<string, any> = { boardId: params.boardId, groupId: params.groupId };
  if (params.onMatch) {
    variables.onMatch = params.onMatch;
  }

  const ingestRes = await mondayApi.request<IngestItemsResponse>(
    ingestItemsMutation,
    variables,
    { versionOverride: '2026-07' },
  );

  const { job_id, upload_url } = ingestRes.ingest_items;

  const csv = buildCsv(params.items);
  const uploadResponse = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/csv' },
    body: csv,
  });

  if (!uploadResponse.ok) {
    throw new Error(`S3 upload failed: HTTP ${uploadResponse.status}`);
  }

  const jobStatus = await pollJobStatus(mondayApi.request.bind(mondayApi), job_id);

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
