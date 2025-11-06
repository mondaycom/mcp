import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { API_ENDPOINTS, HttpMethod } from '../consts/routes.consts';
import { TunnelTokenResponse, getTunnelTokenSchema } from './schemas/code-schemas';

export class GetTunnelTokenTool extends BaseMondayAppsTool<typeof getTunnelTokenSchema.shape, TunnelTokenResponse> {
  name = 'monday_apps_get_tunnel_token';
  category = MondayAppsToolCategory.MONDAY_CODE;
  type: ToolType = ToolType.READ;
  annotations = createMondayAppsAnnotations({
    readOnlyHint: true,
    title: 'Get Tunnel Token',
  });

  getDescription(): string {
    return 'Get a tunnel token for exposing code running on the local machine';
  }

  getInputSchema() {
    return getTunnelTokenSchema.shape;
  }

  async execute(input: ToolInputType<typeof getTunnelTokenSchema.shape>): Promise<ToolOutputType<TunnelTokenResponse>> {
    try {
      const { appId } = input;

      const query = appId ? { appId } : undefined;

      const response = await this.executeApiRequest<TunnelTokenResponse>(
        HttpMethod.PUT,
        API_ENDPOINTS.CODE.TUNNEL_TOKEN,
        { query },
      );

      return {
        content: `Successfully retrieved tunnel token. Domain: ${response.domain}`,
        metadata: response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to get tunnel token: ${errorMessage}`,
        metadata: {
          statusCode: 500,
          error: errorMessage,
          token: '',
          domain: '',
        } as TunnelTokenResponse,
      };
    }
  }
}
