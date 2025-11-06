import { ToolInputType, ToolOutputType, ToolType } from 'src/core/tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { API_ENDPOINTS, HttpMethod } from '../consts/routes.consts';
import { StorageRecordsResponse, searchStorageRecordsSchema } from './schemas/storage-schemas';

export class SearchStorageRecordsTool extends BaseMondayAppsTool<
  typeof searchStorageRecordsSchema.shape,
  StorageRecordsResponse
> {
  name = 'monday_apps_search_storage_records';
  category = MondayAppsToolCategory.STORAGE;
  type: ToolType = ToolType.READ;
  annotations = createMondayAppsAnnotations({
    readOnlyHint: true,
    title: 'Search Storage Records',
  });

  getDescription(): string {
    return 'Search for storage records in a Monday.com app';
  }

  getInputSchema() {
    return searchStorageRecordsSchema.shape;
  }

  async execute(
    input: ToolInputType<typeof searchStorageRecordsSchema.shape>,
  ): Promise<ToolOutputType<StorageRecordsResponse>> {
    try {
      const { appId, accountId, term, cursor } = input;

      const query: Record<string, any> = { term };
      if (cursor) {
        query.cursor = cursor;
      }

      const response = await this.executeApiRequest<StorageRecordsResponse>(
        HttpMethod.GET,
        API_ENDPOINTS.STORAGE.GET_BY_TERM(appId, accountId, term),
        { query },
      );

      return {
        content: `Found ${response.records.length} storage records matching term '${term}' for app ID ${appId}, account ID ${accountId}.`,
        metadata: response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to search storage records: ${errorMessage}`,
        metadata: {
          statusCode: 500,
          error: errorMessage,
          term: input.term,
          records: [],
        } as StorageRecordsResponse,
      };
    }
  }
}
