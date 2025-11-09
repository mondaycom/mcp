import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { API_ENDPOINTS, HttpMethod } from '../consts/routes.consts';
import { CreateAppResponse, createAppSchema } from './schemas/app-schemas';

export class CreateAppFromManifestTool extends BaseMondayAppsTool<typeof createAppSchema.shape, CreateAppResponse> {
  name = 'monday_apps_create_app_from_manifest';
  category = MondayAppsToolCategory.APP;
  type: ToolType = ToolType.WRITE;
  annotations = createMondayAppsAnnotations({
    title: 'Create App from Manifest',
  });

  getDescription(): string {
    return 'Create a new Monday.com app from a manifest file. The manifest file should be provided as a base64-encoded ZIP file containing the app configuration. Note: This feature is currently experimental and not ready for production use.';
  }

  getInputSchema() {
    return createAppSchema.shape;
  }

  protected async executeInternal(
    input: ToolInputType<typeof createAppSchema.shape>,
  ): Promise<ToolOutputType<CreateAppResponse>> {
    try {
      // Convert base64 to Blob for form data
      const manifestData = Buffer.from(input.manifestFile, 'base64');

      // Create FormData
      const formData = new FormData();
      const blob = new Blob([manifestData], { type: 'application/zip' });
      formData.append('file', blob, 'manifest.zip');

      const response = await this.executeApiRequest<CreateAppResponse>(
        HttpMethod.POST,
        API_ENDPOINTS.APPS.CREATE_FROM_MANIFEST,
        {
          data: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      return {
        content: `Successfully created app- ${JSON.stringify(response)}.`,
        metadata: response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to create app from manifest: ${errorMessage}`,
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
