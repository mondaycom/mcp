import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool } from '../base-tool/monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { API_ENDPOINTS, HttpMethod } from '../consts/routes.consts';
import { CreateAppResponse, createPlainAppSchema } from './schemas/app-schemas';

export class CreateAppTool extends BaseMondayAppsTool<typeof createPlainAppSchema.shape, CreateAppResponse> {
  name = 'monday_apps_create_app';
  category = MondayAppsToolCategory.APP;
  type: ToolType = ToolType.WRITE;

  getDescription(): string {
    return 'Create a new app with basic information';
  }

  getInputSchema() {
    return createPlainAppSchema.shape;
  }

  async execute(input: ToolInputType<typeof createPlainAppSchema.shape>): Promise<ToolOutputType<CreateAppResponse>> {
    try {
      const response = await this.executeApiRequest<CreateAppResponse>(HttpMethod.POST, API_ENDPOINTS.APPS.CREATE, {
        data: {
          name: input.name,
          description: input.description || '',
        },
      });

      return {
        content: `Created app "${input.name}" (ID: ${response.app.id}, Version: ${response.app_version.id})`,
        metadata: response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to create app: ${errorMessage}`,
        metadata: {
          statusCode: 500,
          error: errorMessage,
          app: { id: 0, name: '' },
          app_version: { id: 0, name: '' },
        },
      };
    }
  }
}
