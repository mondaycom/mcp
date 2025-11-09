import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { API_ENDPOINTS, HttpMethod } from '../consts/routes.consts';
import { AppApiDataResponse } from './schemas/app-schemas';

export class GetAllAppsTool extends BaseMondayAppsTool<undefined, AppApiDataResponse> {
  name = 'monday_apps_get_all_apps';
  category = MondayAppsToolCategory.APP;
  type: ToolType = ToolType.READ;
  annotations = createMondayAppsAnnotations({
    readOnlyHint: true,
    title: 'Get All Apps',
  });

  getDescription(): string {
    return 'Retrieve all the development apps that the user has collaboration permissions for';
  }

  getInputSchema() {
    return undefined;
  }

  protected async executeInternal(_input?: ToolInputType<undefined>): Promise<ToolOutputType<AppApiDataResponse>> {
    try {
      const response = await this.executeApiRequest<AppApiDataResponse>(HttpMethod.GET, API_ENDPOINTS.APPS.GET_ALL);

      // Format the apps data for display
      const appsDetails = response.apps
        .map((app) => {
          const multiRegion = app.mondayCodeConfig?.isMultiRegion ? ' (Multi-Region)' : '';
          return `- ID: ${app.id}, Name: ${app.name}${multiRegion}`;
        })
        .join('\n');

      return {
        content: `Retrieved ${response.apps.length} apps:\n${appsDetails}`,
        metadata: response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to retrieve apps: ${errorMessage}`,
        metadata: {
          statusCode: 500,
          error: errorMessage,
          apps: [], // Add required apps property
        } as AppApiDataResponse,
      };
    }
  }
}
