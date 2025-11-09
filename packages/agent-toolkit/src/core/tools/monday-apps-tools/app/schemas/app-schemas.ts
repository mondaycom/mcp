import { z } from 'zod';
import { MondayApiResponse } from '../../base-tool/base-monday-apps-tool';

export interface AppApiDataResponse extends MondayApiResponse {
  apps: Array<{
    id: number;
    name: string;
    mondayCodeConfig?: {
      isMultiRegion: boolean;
    };
  }>;
}

export interface PromoteAppResponse extends MondayApiResponse {
  appId: number;
}

export const promoteAppSchema = z.object({
  appId: z.number().describe('The ID of the app to promote'),
  versionId: z
    .number()
    .optional()
    .describe('The version ID to promote. If not provided, the latest draft will be used'),
});

export interface CreateAppResponse extends MondayApiResponse {
  app: {
    id: number;
    name: string;
  };
  app_version: {
    id: number;
    name: string;
  };
}

export const createAppSchema = z.object({
  manifestFile: z.string().describe('The base64 encoded manifest file content'),
});

export const createPlainAppSchema = z.object({
  name: z.string().describe('The name of the app'),
  description: z.string().optional().describe('The description of the app'),
});
