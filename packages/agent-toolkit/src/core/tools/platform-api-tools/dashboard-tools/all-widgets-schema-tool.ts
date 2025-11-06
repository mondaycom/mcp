import {
  GetAllWidgetsSchemaQuery,
  GetAllWidgetsSchemaQueryVariables,
} from '../../../../monday-graphql/generated/graphql';
import { getAllWidgetsSchema } from './dashboard-queries.graphql';
import { ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

export class AllWidgetsSchemaTool extends BaseMondayApiTool<Record<string, never>, never> {
  name = 'all_widgets_schema';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get All Widget Schemas',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Fetch complete JSON Schema 7 definitions for all available widget types in monday.com.
    
    This tool is essential before creating widgets as it provides:
    - Complete schema definitions for all supported widgets
    - Required and optional fields for each widget type
    - Data type specifications and validation rules
    - Detailed descriptions of widget capabilities
    
    Use this tool when you need to:
    - Understand widget configuration requirements before creating widgets
    - Validate widget settings against official schemas
    - Plan widget implementations with proper data structures
    
    The response includes JSON Schema 7 definitions that describe exactly what settings each widget type accepts.`;
  }

  getInputSchema(): Record<string, never> {
    return {};
  }

  protected async executeInternal(): Promise<ToolOutputType<never>> {
    try {
      // Execute the GraphQL query (no variables needed)
      const variables: GetAllWidgetsSchemaQueryVariables = {};
      const res = await this.mondayApi.request<GetAllWidgetsSchemaQuery>(getAllWidgetsSchema, variables);

      // Check if we got schema data
      if (!res.all_widgets_schema || res.all_widgets_schema.length === 0) {
        throw new Error('No widget schemas found - API returned empty response');
      }

      // Format the widget schemas for better readability
      const formattedSchemas: Record<string, any> = {};

      let schemaCount = 0;
      for (const widgetSchema of res.all_widgets_schema) {
        if (widgetSchema?.widget_type && widgetSchema?.schema) {
          const schemaObj =
            typeof widgetSchema.schema === 'string' ? JSON.parse(widgetSchema.schema) : widgetSchema.schema;

          const dynamicDescription =
            schemaObj?.description || schemaObj?.title || `${widgetSchema.widget_type} widget for data visualization`;

          formattedSchemas[widgetSchema.widget_type] = {
            type: widgetSchema.widget_type,
            description: dynamicDescription,
            schema: widgetSchema.schema,
          };
          schemaCount++;
        }
      }

      if (schemaCount === 0) {
        throw new Error('No valid widget schemas found in API response');
      }

      // Create comprehensive response with schema information
      const schemaOverview = Object.keys(formattedSchemas)
        .map((widgetType) => `• **${widgetType}**: ${formattedSchemas[widgetType].description}`)
        .join('\n');

      return {
        content: `**Widget Schemas Retrieved Successfully!**

🎯 **Available Widget Types** (${schemaCount} schemas found):
${schemaOverview}

**Complete JSON Schema 7 Definitions:**

${JSON.stringify(formattedSchemas, null, 2)}

**Schema Compliance Tips:**
- All required fields MUST be provided in widget settings
- Enum values must match exactly as specified in the schema
- Data types must conform to the schema definitions
- Nested objects must follow the exact structure

⚡ **Next Steps:**
- Use these schemas to validate widget settings before calling 'create_widget'
- Reference the schema structure when planning widget configurations
- Ensure 100% compliance with field requirements and data types`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch widget schemas: ${errorMessage}`);
    }
  }
}
