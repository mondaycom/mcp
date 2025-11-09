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
  appId: z.number().describe('The unique identifier of the app to promote. You can get this from the get_all_apps tool'),
  versionId: z
    .number()
    .optional()
    .describe('The specific version ID to promote to live/production. If not provided, the latest draft version will be automatically promoted. Use get_app_versions to find available version IDs'),
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
  manifestFile: z.string().describe('The manifest file as a base64-encoded string. The original file must be a ZIP archive containing your app configuration (manifest.json, views, features, etc.)'),
});

export const createPlainAppSchema = z.object({
  name: z.string().describe('The display name for your app. This will be visible to users in the monday.com marketplace and UI. Should be clear and descriptive'),
  description: z.string().optional().describe('An optional detailed description of what your app does and its main features. This helps users understand the app\'s purpose'),
});
