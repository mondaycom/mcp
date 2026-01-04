import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { API_ENDPOINTS, HttpMethod } from '../consts/routes.consts';
import { AppVersionApiDataResponse, getAppVersionSchema } from './schemas/app-version-schemas';

export class GetAppVersionTool extends BaseMondayAppsTool<typeof getAppVersionSchema.shape, AppVersionApiDataResponse> {
  name = 'monday_apps_get_app_version';
  category = MondayAppsToolCategory.APP_VERSION;
  type: ToolType = ToolType.READ;
  annotations = createMondayAppsAnnotations({
    readOnlyHint: true,
  });

  getDescription(): string {
    return "Retrieve detailed data for a specific app version by version ID. Returns comprehensive information including the version name, number, status, associated app ID, and configuration details. Use this to inspect a particular version's configuration.";
  }

  getInputSchema() {
    return getAppVersionSchema.shape;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getAppVersionSchema.shape>,
  ): Promise<ToolOutputType<AppVersionApiDataResponse>> {
    try {
      const { versionId } = input;

      const response = await this.executeApiRequest<AppVersionApiDataResponse>(
        HttpMethod.GET,
        API_ENDPOINTS.APP_VERSIONS.GET_BY_ID(versionId),
      );

      return {
        content:
          `Successfully retrieved details for app version ID ${versionId}:\n` +
          `Name: ${response.appVersion.name}\n` +
          `App ID: ${response.appVersion.appId}\n` +
          `Version Number: ${response.appVersion.versionNumber}\n` +
          `Status: ${response.appVersion.status}`,
        metadata: response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to retrieve app version: ${errorMessage}`,
        metadata: {
          appVersion: {
            id: input.versionId,
            name: '',
            appId: 0,
            versionNumber: '',
            status: '',
            mondayCodeConfig: {
              isMultiRegion: false,
            },
          },
        } as AppVersionApiDataResponse,
      };
    }
  }
}
