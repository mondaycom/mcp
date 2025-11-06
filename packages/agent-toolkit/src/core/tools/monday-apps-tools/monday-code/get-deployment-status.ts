import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { API_ENDPOINTS, HttpMethod } from '../consts/routes.consts';
import { DeploymentStatusResponse, getDeploymentStatusSchema } from './schemas/code-schemas';

export class GetDeploymentStatusTool extends BaseMondayAppsTool<
  typeof getDeploymentStatusSchema.shape,
  DeploymentStatusResponse
> {
  name = 'monday_apps_get_deployment_status';
  category = MondayAppsToolCategory.MONDAY_CODE;
  type: ToolType = ToolType.READ;
  annotations = createMondayAppsAnnotations({
    readOnlyHint: true,
  });

  getDescription(): string {
    return 'Get the deployment status for a specific app version';
  }

  getInputSchema() {
    return getDeploymentStatusSchema.shape;
  }

  async execute(
    input: ToolInputType<typeof getDeploymentStatusSchema.shape>,
  ): Promise<ToolOutputType<DeploymentStatusResponse>> {
    try {
      const { appVersionId } = input;

      const response = await this.executeApiRequest<DeploymentStatusResponse>(
        HttpMethod.GET,
        API_ENDPOINTS.CODE.GET_DEPLOYMENT_STATUS(appVersionId),
      );

      // Create a more detailed status message
      const statusDetails = [
        `Status: ${response.status || 'Unknown'}`,
        response.startTime ? `Started: ${new Date(response.startTime).toLocaleString()}` : null,
        response.endTime ? `Completed: ${new Date(response.endTime).toLocaleString()}` : null,
        response.error ? `Error: ${response.error}` : null,
        response.logs ? `Logs: ${response.logs}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      return {
        content: `Deployment status for app version ID ${appVersionId}:\n${statusDetails}`,
        metadata: response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to get deployment status: ${errorMessage}`,
        metadata: {
          statusCode: 500,
          error: errorMessage,
        } as DeploymentStatusResponse,
      };
    }
  }
}
