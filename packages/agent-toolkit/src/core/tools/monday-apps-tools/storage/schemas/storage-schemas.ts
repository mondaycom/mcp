import { z } from 'zod';
import { MondayApiResponse } from '../../base-tool/base-monday-apps-tool';

export interface StorageRecordsResponse extends MondayApiResponse {
  term: string;
  records: Array<{
    key: string;
    value: string;
    backendOnly: boolean;
  }>;
  cursor?: string;
}

export const searchStorageRecordsSchema = z.object({
  appId: z.number().describe('The unique identifier of the app whose storage you want to search. Get this from get_all_apps'),
  accountId: z.number().describe('The monday.com account ID to search storage within. Storage is isolated per account. Get this from the monday.com platform API'),
  term: z.string().describe('The search term to query against storage record keys and values. Supports partial matching to help find relevant records'),
  cursor: z.string().optional().describe('Pagination cursor returned from a previous search. Use this to fetch the next page of results when there are many matching records'),
});

export interface ExportStorageDataResponse extends MondayApiResponse {
  downloadUrl?: string;
}

export const exportStorageDataSchema = z.object({
  appId: z.number().describe('The unique identifier of the app whose storage data you want to export. Get this from get_all_apps'),
  accountId: z.number().describe('The monday.com account ID to export storage from. Each account has isolated storage data'),
  fileFormat: z.enum(['JSON', 'CSV']).optional().describe('The desired export format. JSON preserves data structure and is best for re-importing; CSV is easier to view in spreadsheet applications. Defaults to JSON if not specified'),
});
