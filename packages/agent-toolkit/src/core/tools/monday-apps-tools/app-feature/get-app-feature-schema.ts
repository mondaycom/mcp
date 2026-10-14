import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { schemaManager, AppFeatureSchemaDefinition } from './schemas/schema-manager';

export interface GetAppFeatureSchemaResponse extends Record<string, unknown> {
  featureType?: string;
  schema?: AppFeatureSchemaDefinition;
  availableTypes?: string[];
  allSchemas?: AppFeatureSchemaDefinition[];
  message: string;
  statusCode: number;
}

export const getAppFeatureSchemaSchema = z.object({
  featureType: z
    .string()
    .optional()
    .describe(
      'The app feature type to get the schema for (e.g., AppFeatureStatusColumn, AppFeatureBoardView). If omitted, returns all available schemas.',
    ),
});

/**
 * Tool to retrieve app feature schemas
 * This allows MCP clients to understand the structure of the "data" field
 * when creating app features
 */
export class GetAppFeatureSchemaToool extends BaseMondayAppsTool<
  typeof getAppFeatureSchemaSchema.shape,
  GetAppFeatureSchemaResponse
> {
  name = 'monday_apps_get_app_feature_schema';
  category = MondayAppsToolCategory.APP_FEATURE;
  type: ToolType = ToolType.READ;
  annotations = createMondayAppsAnnotations({
    title: 'Get App Feature Schema',
  });

  getDescription(): string {
    return 'Retrieve the data schema for app feature types. Use this to understand what fields are required/available in the "data" parameter when creating an app feature. If no featureType is specified, returns a list of all available feature types and their schemas.';
  }

  getInputSchema() {
    return getAppFeatureSchemaSchema.shape;
  }

  protected async executeInternal(
    input?: ToolInputType<typeof getAppFeatureSchemaSchema.shape>,
  ): Promise<ToolOutputType<GetAppFeatureSchemaResponse>> {
    try {
      // Ensure schemas are initialized and not expired
      if (!schemaManager.isInitializedAndNotExpired()) {
        await schemaManager.initialize();
      }

      const { featureType } = input || {};

      // Check if there was a fetch error
      const fetchError = schemaManager.getFetchError();
      if (fetchError) {
        return {
          content: `Warning: Failed to fetch app feature schemas from the remote endpoint.\nError: ${fetchError}\n\nThe monday.com schema endpoint may be temporarily unavailable or there may be a network connectivity issue.\n\nYou can still create app features, but schema validation and hints will not be available.`,
          metadata: {
            statusCode: 503,
            message: 'Schema fetch failed',
            fetchError,
          },
        };
      }

      // If a specific feature type is requested
      if (featureType) {
        const schema = schemaManager.getSchema(featureType);

        if (!schema) {
          const availableTypes = schemaManager.getAvailableFeatureTypes();
          return {
            content: `Schema not found for feature type: ${featureType}\n\nAvailable feature types:\n${availableTypes.join('\n')}`,
            metadata: {
              statusCode: 404,
              featureType,
              availableTypes,
              message: 'Schema not found',
            },
          };
        }

        return {
          content: this.formatSchemaResponse(featureType, schema),
          metadata: {
            statusCode: 200,
            featureType,
            schema,
            message: 'Schema retrieved successfully',
          },
        };
      }

      // If no specific type requested, return all available types
      const availableTypes = schemaManager.getAvailableFeatureTypes();
      const allSchemas = schemaManager.getAllSchemas();

      return {
        content: this.formatAllSchemasResponse(availableTypes, allSchemas.schemas, allSchemas.fetchError),
        metadata: {
          statusCode: 200,
          availableTypes,
          allSchemas: allSchemas.schemas,
          fetchError: allSchemas.fetchError,
          message: `Found ${availableTypes.length} available feature types`,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to retrieve app feature schema: ${errorMessage}`,
        metadata: {
          statusCode: 500,
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Format a single schema response
   */
  private formatSchemaResponse(featureType: string, schema: AppFeatureSchemaDefinition): string {
    const lines: string[] = [
      `App Feature Schema: ${featureType}`,
      `Version: ${schema.version}`,
      `Status: ${schema.status}`,
      '',
    ];

    // Data Schema
    if (schema.dataSchema) {
      lines.push('Data Schema (JSON):');
      lines.push(JSON.stringify(schema.dataSchema, null, 2));
      lines.push('');
    }

    lines.push('Usage:');
    lines.push(
      `Call monday_apps_create_app_feature or monday_apps_update_app_feature with type="${featureType}" and structure the "data" parameter according to the schema above.`,
    );

    return lines.join('\n');
  }

  /**
   * Format response with all available schemas
   */
  private formatAllSchemasResponse(
    availableTypes: string[],
    schemas: AppFeatureSchemaDefinition[],
    fetchError?: string,
  ): string {
    const lines: string[] = [];

    // Show warning if schemas failed to fetch
    if (fetchError) {
      lines.push('⚠️  WARNING: Failed to fetch schemas from remote endpoint');
      lines.push(`Error: ${fetchError}`);
      lines.push('');
      lines.push('Schema validation and hints are not available.');
      lines.push('You can still create app features without schema validation.');
      lines.push('');
      return lines.join('\n');
    }

    lines.push(`Found ${availableTypes.length} available app feature types:`);
    lines.push('');

    // Group by category if available
    const byCategory: Record<string, string[]> = {};

    availableTypes.forEach((type) => {
      const schema = schemas.find((s) => s.name === type);
      const category = schema?.settings?.family || 'other';

      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(type);
    });

    lines.push(JSON.stringify(byCategory, null, 2));
    lines.push(
      'To get the detailed schema for a specific feature type, call this tool again with the featureType parameter.',
    );
    lines.push('Example: monday_apps_get_app_feature_schema featureType="AppFeatureStatusColumn"');

    return lines.join('\n');
  }
}
