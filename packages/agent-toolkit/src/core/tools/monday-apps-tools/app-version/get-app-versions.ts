import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { API_ENDPOINTS, HttpMethod } from '../consts/routes.consts';
import { AppVersionsApiDataResponse, getAppVersionsSchema } from './schemas/app-version-schemas';

export class GetAppVersionsTool extends BaseMondayAppsTool<
  typeof getAppVersionsSchema.shape,
  AppVersionsApiDataResponse
> {
  name = 'monday_apps_get_app_versions';
  category = MondayAppsToolCategory.APP_VERSION;
  type: ToolType = ToolType.READ;
  annotations = createMondayAppsAnnotations({
    readOnlyHint: true,
  });

  getDescription(): string {
    return 'Retrieve all the app versions of an app';
  }

  getInputSchema() {
    return getAppVersionsSchema.shape;
  }

  async execute(
    input: ToolInputType<typeof getAppVersionsSchema.shape>,
  ): Promise<ToolOutputType<AppVersionsApiDataResponse>> {
    try {
      const { appId } = input;

      const response = await this.executeApiRequest<AppVersionsApiDataResponse>(
        HttpMethod.GET,
        API_ENDPOINTS.APP_VERSIONS.GET_ALL(appId),
      );

      // Create a detailed summary of versions
      const versionsSummary = response.appVersions
        .map((version) =>
          [
            `- Version ${version.versionNumber} (ID: ${version.id})`,
            `  Name: ${version.name}`,
            `  Status: ${version.status}`,
          ].join('\n'),
        )
        .join('\n');

      return {
        content: `Successfully retrieved ${response.appVersions.length} versions for app ID ${appId}:\n\n${versionsSummary}`,
        metadata: response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to retrieve app versions: ${errorMessage}`,
        metadata: {
          statusCode: 500,
          error: errorMessage,
          appVersions: [], // Add required appVersions property
        } as AppVersionsApiDataResponse,
      };
    }
  }
}
