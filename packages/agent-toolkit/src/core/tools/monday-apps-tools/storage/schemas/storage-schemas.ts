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
  appId: z.number().describe('The ID of the app to search storage records for'),
  accountId: z.number().describe('The ID of the account to search storage records for'),
  term: z.string().describe('The term to search for in the storage records'),
  cursor: z.string().optional().describe('The cursor for pagination'),
});

export interface ExportStorageDataResponse extends MondayApiResponse {
  downloadUrl?: string;
}

export const exportStorageDataSchema = z.object({
  appId: z.number().describe('The ID of the app to export storage data for'),
  accountId: z.number().describe('The ID of the account to export storage data for'),
  fileFormat: z.enum(['JSON', 'CSV']).optional().describe('The format of the exported file (JSON or CSV)'),
});

export interface RemoveAppStorageDataResponse extends MondayApiResponse {
  success?: boolean;
}

export const removeAppStorageDataSchema = z.object({
  appId: z.number().describe('The ID of the app to remove data for'),
  accountId: z.number().describe('The ID of the account to remove data for'),
});
