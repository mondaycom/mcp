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
  appId: z.number().describe('The ID of the app to get versions for'),
});

export const getAppVersionSchema = z.object({
  versionId: z.number().describe('The ID of the app version to get'),
});
