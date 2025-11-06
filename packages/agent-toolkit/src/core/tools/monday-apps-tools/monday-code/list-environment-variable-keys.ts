import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { API_ENDPOINTS, HttpMethod } from '../consts/routes.consts';
import { EnvVarKeysResponse, listEnvVarKeysSchema } from './schemas/code-schemas';

export class ListEnvironmentVariableKeysTool extends BaseMondayAppsTool<
  typeof listEnvVarKeysSchema.shape,
  EnvVarKeysResponse
> {
  name = 'monday_apps_list_environment_variable_keys';
  category = MondayAppsToolCategory.MONDAY_CODE;
  type: ToolType = ToolType.READ;
  annotations = createMondayAppsAnnotations({
    readOnlyHint: true,
    title: 'List Environment Variable Keys',
  });

  getDescription(): string {
    return 'List all environment variable keys for an app';
  }

  getInputSchema() {
    return listEnvVarKeysSchema.shape;
  }

  async execute(input: ToolInputType<typeof listEnvVarKeysSchema.shape>): Promise<ToolOutputType<EnvVarKeysResponse>> {
    try {
      const { appId } = input;

      const response = await this.executeApiRequest<EnvVarKeysResponse>(
        HttpMethod.GET,
        API_ENDPOINTS.CODE.GET_ENV_KEYS(appId),
      );

      return {
        content: `Found ${response.keys.length} environment variable keys for app ID ${appId}.`,
        metadata: response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to list environment variable keys: ${errorMessage}`,
        metadata: {
          statusCode: 500,
          error: errorMessage,
          keys: [],
        } as EnvVarKeysResponse,
      };
    }
  }
}
