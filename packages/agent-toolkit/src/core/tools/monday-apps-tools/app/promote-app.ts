import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { API_ENDPOINTS, HttpMethod } from '../consts/routes.consts';
import { PromoteAppResponse, promoteAppSchema } from './schemas/app-schemas';

export class PromoteAppTool extends BaseMondayAppsTool<typeof promoteAppSchema.shape, PromoteAppResponse> {
  name = 'monday_apps_promote_app';
  category = MondayAppsToolCategory.APP;
  type: ToolType = ToolType.WRITE;
  annotations = createMondayAppsAnnotations({
    destructiveHint: true,
    title: 'Promote App',
  });

  getDescription(): string {
    return 'Promote an app version to live';
  }

  getInputSchema() {
    return promoteAppSchema.shape;
  }

  async execute(input: ToolInputType<typeof promoteAppSchema.shape>): Promise<ToolOutputType<PromoteAppResponse>> {
    try {
      const { appId, versionId } = input;
      const data = versionId ? { versionId } : undefined;

      const response = await this.executeApiRequest<PromoteAppResponse>(
        HttpMethod.POST,
        API_ENDPOINTS.APPS.PROMOTE(appId),
        { data },
      );

      return {
        content: `Successfully started promotion for app ID ${appId}${versionId ? ` and version ID ${versionId}` : ''}.`,
        metadata: response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to promote app: ${errorMessage}`,
        metadata: {
          statusCode: 500,
          error: errorMessage,
          appId: input.appId, // Add required appId property
        } as PromoteAppResponse,
      };
    }
  }
}
