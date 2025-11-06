import { z } from 'zod';
import { MondayApiResponse } from '../../base-tool/base-monday-apps-tool';

export interface AppFeature {
  id: number;
  app_id: number;
  app_version_id: number;
  app_feature_reference_id: number;
  source_app_feature_id: number | null;
  name: string;
  type: string;
  state: string;
  user_id: number;
  data: Record<string, any>;
  schema: boolean | null;
  status: string | null;
  [key: string]: any;
}

export interface AppFeaturesResponse extends MondayApiResponse {
  appFeatures: AppFeature[];
}

export const getAppFeaturesSchema = z.object({
  appVersionId: z.number().describe('The ID of the app version to get features for'),
  type: z.string().optional().describe('Filter by app feature type'),
});

export interface AppFeatureReference {
  id: number;
  created_at: string;
  updated_at: string;
  live_app_feature_id: number;
  app_feature_reference_id: number;
}

export interface DetailedAppFeature extends AppFeature {
  client_instance_token: string;
  created_at: string;
  updated_at: string;
  current_release: string | null;
  configured_secret_names: string[];
}

export interface CreateAppFeatureResponse extends MondayApiResponse {
  app_feature: DetailedAppFeature;
  app_feature_reference: AppFeatureReference;
}

export const createAppFeatureSchema = z.object({
  appId: z.number().describe('The ID of the app'),
  appVersionId: z.number().describe('The ID of the app version'),
  name: z.string().describe('The name of the app feature'),
  type: z.string().describe('The type of the app feature'),
  data: z.record(z.any()).optional().describe('Additional data for the app feature'),
});
