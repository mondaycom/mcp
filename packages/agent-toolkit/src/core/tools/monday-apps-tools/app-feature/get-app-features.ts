import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool } from '../base-tool/monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { API_ENDPOINTS, HttpMethod } from '../consts/routes.consts';
import { AppFeaturesResponse, getAppFeaturesSchema } from './schemas/app-feature-schemas';

export class GetAppFeaturesTool extends BaseMondayAppsTool<typeof getAppFeaturesSchema.shape, AppFeaturesResponse> {
  name = 'monday_apps_get_app_features';
  category = MondayAppsToolCategory.APP_FEATURE;
  type: ToolType = ToolType.READ;

  getDescription(): string {
    return 'Retrieve app features by app version id';
  }

  getInputSchema() {
    return getAppFeaturesSchema.shape;
  }

  async execute(input: ToolInputType<typeof getAppFeaturesSchema.shape>): Promise<ToolOutputType<AppFeaturesResponse>> {
    try {
      const { appVersionId, type } = input;

      const query: Record<string, any> = {};
      if (type) {
        query.type = type;
      }

      const response = await this.executeApiRequest<AppFeaturesResponse>(
        HttpMethod.GET,
        API_ENDPOINTS.APP_FEATURES.GET_ALL(appVersionId),
        { query },
      );

      const features = response.appFeatures || [];
      const featuresCount = features.length;

      const featuresSummary = features
        .map((feature) => `${feature.name} (ID: ${feature.id}, Type: ${feature.type}, State: ${feature.state})`)
        .join(', ');

      return {
        content:
          `Successfully retrieved ${featuresCount} app features for app version ID ${appVersionId}${type ? ` of type ${type}` : ''}.\n` +
          `Features: ${featuresSummary || 'No features found'}`,
        metadata: {
          ...response,
          statusCode: response.statusCode,
          headers: response.headers,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to retrieve app features: ${errorMessage}`,
        metadata: {
          statusCode: 500,
          error: errorMessage,
          appFeatures: [],
        } as AppFeaturesResponse,
      };
    }
  }
}
