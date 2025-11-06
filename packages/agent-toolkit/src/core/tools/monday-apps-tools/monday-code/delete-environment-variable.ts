import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { API_ENDPOINTS, HttpMethod } from '../consts/routes.consts';
import { EnvVarResponse, deleteEnvVarSchema } from './schemas/code-schemas';

export class DeleteEnvironmentVariableTool extends BaseMondayAppsTool<typeof deleteEnvVarSchema.shape, EnvVarResponse> {
  name = 'monday_apps_delete_environment_variable';
  category = MondayAppsToolCategory.MONDAY_CODE;
  type: ToolType = ToolType.WRITE;
  annotations = createMondayAppsAnnotations({
    destructiveHint: true,
    title: 'Delete Environment Variable',
  });

  getDescription(): string {
    return 'Delete an environment variable for an app';
  }

  getInputSchema() {
    return deleteEnvVarSchema.shape;
  }

  async execute(input: ToolInputType<typeof deleteEnvVarSchema.shape>): Promise<ToolOutputType<EnvVarResponse>> {
    try {
      const { appId, key } = input;

      const response = await this.executeApiRequest<EnvVarResponse>(
        HttpMethod.DELETE,
        API_ENDPOINTS.CODE.MANAGE_ENV(appId, key),
      );

      return {
        content: `Successfully deleted environment variable '${key}' for app ID ${appId}.`,
        metadata: response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to delete environment variable: ${errorMessage}`,
        metadata: {
          statusCode: 500,
          error: errorMessage,
        } as EnvVarResponse,
      };
    }
  }
}
