import { z } from 'zod';
import { MondayApiResponse } from '../../base-tool/base-monday-apps-tool';

export interface AppVersionsApiDataResponse extends MondayApiResponse {
  appVersions: Array<{
    id: number;
    name: string;
    appId: number;
    versionNumber: string;
    status: string;
    mondayCodeConfig?: {
      isMultiRegion: boolean;
    };
  }>;
}

export interface AppVersionApiDataResponse extends MondayApiResponse {
  appVersion: {
    id: number;
    name: string;
    appId: number;
    versionNumber: string;
    status: string;
    mondayCodeConfig?: {
      isMultiRegion: boolean;
    };
  };
}

export const getAppVersionsSchema = z.object({
  appId: z
    .number()
    .describe(
      'The unique identifier of the app to retrieve version history for. Each app can have multiple versions (draft, live, deprecated). Get app IDs from get_all_apps',
    ),
});

export const getAppVersionSchema = z.object({
  versionId: z
    .number()
    .describe(
      'The unique identifier of the specific app version to retrieve. Version IDs are returned from get_app_versions and represent individual snapshots of your app configuration',
    ),
});
