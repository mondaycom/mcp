import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { API_ENDPOINTS, HttpMethod } from '../consts/routes.consts';
import { CreateAppFeatureResponse, createAppFeatureSchema } from './schemas/app-feature-schemas';

export class CreateAppFeatureTool extends BaseMondayAppsTool<
  typeof createAppFeatureSchema.shape,
  CreateAppFeatureResponse
> {
  name = 'monday_apps_create_app_feature';
  category = MondayAppsToolCategory.APP_FEATURE;
  type: ToolType = ToolType.WRITE;
  annotations = createMondayAppsAnnotations({
    title: 'Create App Feature',
  });

  getDescription(): string {
    return 'Create a new app feature for an app version';
  }

  getInputSchema() {
    return createAppFeatureSchema.shape;
  }

  async execute(
    input: ToolInputType<typeof createAppFeatureSchema.shape>,
  ): Promise<ToolOutputType<CreateAppFeatureResponse>> {
    try {
      const { appId, appVersionId, name, type, data } = input;

      // Prepare the request body
      const requestBody = {
        name,
        type,
        data: data || {},
      };

      const response = await this.executeApiRequest<CreateAppFeatureResponse>(
        HttpMethod.POST,
        API_ENDPOINTS.APP_FEATURES.CREATE(appId, appVersionId),
        { data: requestBody },
      );

      const { app_feature } = response;
      return {
        content: `Successfully created app feature '${app_feature.name}' (ID: ${app_feature.id}) of type ${app_feature.type} for app ID ${app_feature.app_id}, version ID ${app_feature.app_version_id}. Feature state: ${app_feature.state}`,
        metadata: response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to create app feature: ${errorMessage}`,
        metadata: {
          statusCode: 500,
          error: errorMessage,
          app_feature: {
            id: 0,
            app_id: input.appId,
            app_version_id: input.appVersionId,
            app_feature_reference_id: 0,
            source_app_feature_id: null,
            name: input.name,
            type: input.type,
            state: 'error',
            user_id: 0,
            data: input.data || {},
            schema: null,
            status: null,
            client_instance_token: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            current_release: null,
            configured_secret_names: [],
          },
          app_feature_reference: {
            id: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            live_app_feature_id: 0,
            app_feature_reference_id: 0,
          },
        } as CreateAppFeatureResponse,
      };
    }
  }
}
