import { z } from 'zod';
import { AppFeatureType } from '../../consts/apps.consts';
import { MondayApiResponse } from '../../base-tool/base-monday-apps-tool';

export interface AppFeature {
  id: number;
  app_id: number;
  app_version_id: number;
  app_feature_reference_id: number;
  source_app_feature_id: number | null;
  name: string;
  type: AppFeatureType | string;
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
  appVersionId: z.number().describe('The unique identifier of the app version to retrieve features from. Features are version-specific. Get version IDs from get_app_versions'),
  type: z
    .union([z.nativeEnum(AppFeatureType), z.string()])
    .optional()
    .describe('Optional filter to retrieve only features of a specific type. Examples: AppFeatureStatusColumn, AppFeatureBoardView, AppFeatureItemView, AppFeatureDashboardWidget, AppFeatureObject. Leave empty to get all features'),
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
  appId: z.number().describe('The unique identifier of the app to add the feature to. Get from get_all_apps'),
  appVersionId: z.number().describe('The specific version ID to add the feature to (typically a draft version). Features are tied to specific versions. Get from get_app_versions'),
  name: z.string().describe('A descriptive name for this feature instance. This helps identify the feature in your app configuration and management UI'),
  type: z.union([z.nativeEnum(AppFeatureType), z.string()]).describe('The feature type that determines how it integrates with monday.com. Examples: AppFeatureStatusColumn (custom status column), AppFeatureBoardView (board view), AppFeatureItemView (item view), AppFeatureDashboardWidget (widget)'),
  data: z.record(z.any()).optional().describe('Feature-specific configuration data as a JSON object. The structure depends on the feature type'),
});
