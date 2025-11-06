import { ToolInputType, ToolOutputType, ToolType } from 'src/core/tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { API_ENDPOINTS, HttpMethod } from '../consts/routes.consts';
import { ExportStorageDataResponse, exportStorageDataSchema } from './schemas/storage-schemas';

export class ExportStorageDataTool extends BaseMondayAppsTool<
  typeof exportStorageDataSchema.shape,
  ExportStorageDataResponse
> {
  name = 'monday_apps_export_storage_data';
  category = MondayAppsToolCategory.STORAGE;
  type: ToolType = ToolType.READ;
  annotations = createMondayAppsAnnotations({
    readOnlyHint: true,
    title: 'Export Storage Data',
  });

  getDescription(): string {
    return 'Export storage data from a Monday.com app';
  }

  getInputSchema() {
    return exportStorageDataSchema.shape;
  }

  async execute(
    input: ToolInputType<typeof exportStorageDataSchema.shape>,
  ): Promise<ToolOutputType<ExportStorageDataResponse>> {
    try {
      const { appId, accountId, fileFormat } = input;

      const query: Record<string, any> = {};
      if (fileFormat) {
        query.fileFormat = fileFormat;
      }

      const response = await this.executeApiRequest<ExportStorageDataResponse>(
        HttpMethod.GET,
        API_ENDPOINTS.STORAGE.EXPORT_DATA(appId, accountId),
        { query },
      );

      return {
        content: `Successfully exported storage data for app ID ${appId}, account ID ${accountId}.${
          response.downloadUrl ? ` Download URL: ${response.downloadUrl}` : ''
        }`,
        metadata: response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to export storage data: ${errorMessage}`,
        metadata: {
          statusCode: 500,
          error: errorMessage,
        } as ExportStorageDataResponse,
      };
    }
  }
}
