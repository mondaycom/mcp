import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { API_ENDPOINTS, HttpMethod } from '../consts/routes.consts';
import { RemoveAppStorageDataResponse, removeAppStorageDataSchema } from './schemas/storage-schemas';

export class RemoveAppStorageDataTool extends BaseMondayAppsTool<
  typeof removeAppStorageDataSchema.shape,
  RemoveAppStorageDataResponse
> {
  name = 'monday_apps_remove_app_storage_data';
  category = MondayAppsToolCategory.STORAGE;
  type: ToolType = ToolType.WRITE;
  annotations = createMondayAppsAnnotations({
    destructiveHint: true,
    title: 'Remove App Storage Data',
  });

  getDescription(): string {
    return 'Remove all storage data for a specific account on a specific app';
  }

  getInputSchema() {
    return removeAppStorageDataSchema.shape;
  }

  async execute(
    input: ToolInputType<typeof removeAppStorageDataSchema.shape>,
  ): Promise<ToolOutputType<RemoveAppStorageDataResponse>> {
    try {
      const { appId, accountId } = input;

      const response = await this.executeApiRequest<RemoveAppStorageDataResponse>(
        HttpMethod.DELETE,
        API_ENDPOINTS.STORAGE.REMOVE_APP_DATA(appId, accountId),
      );

      return {
        content: `Successfully removed all data for app ID ${appId}, account ID ${accountId}.`,
        metadata: response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to remove app data: ${errorMessage}`,
        metadata: {
          statusCode: 500,
          error: errorMessage,
          success: false,
        } as RemoveAppStorageDataResponse,
      };
    }
  }
}
