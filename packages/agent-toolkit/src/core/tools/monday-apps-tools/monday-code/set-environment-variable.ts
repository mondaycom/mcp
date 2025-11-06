import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { API_ENDPOINTS, HttpMethod } from '../consts/routes.consts';
import { EnvVarResponse, setEnvVarSchema } from './schemas/code-schemas';

export class SetEnvironmentVariableTool extends BaseMondayAppsTool<typeof setEnvVarSchema.shape, EnvVarResponse> {
  name = 'monday_apps_set_environment_variable';
  category = MondayAppsToolCategory.MONDAY_CODE;
  type: ToolType = ToolType.WRITE;
  annotations = createMondayAppsAnnotations({
    title: 'Set Environment Variable',
    destructiveHint: true,
  });

  getDescription(): string {
    return 'Set an environment variable for an app';
  }

  getInputSchema() {
    return setEnvVarSchema.shape;
  }

  async execute(input: ToolInputType<typeof setEnvVarSchema.shape>): Promise<ToolOutputType<EnvVarResponse>> {
    try {
      const { appId, key, value } = input;

      const response = await this.executeApiRequest<EnvVarResponse>(
        HttpMethod.PUT,
        API_ENDPOINTS.CODE.MANAGE_ENV(appId, key),
        { data: { value } },
      );

      return {
        content: `Successfully set environment variable '${key}' for app ID ${appId}.`,
        metadata: response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to set environment variable: ${errorMessage}`,
        metadata: {
          statusCode: 500,
          error: errorMessage,
        } as EnvVarResponse,
      };
    }
  }
}
