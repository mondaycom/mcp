import { z } from 'zod';
import {
  ExternalWidget,
  WidgetParentKind,
  CreateWidgetMutation,
  CreateWidgetMutationVariables,
} from '../../../../monday-graphql/generated/graphql';
import { createWidget } from './dashboard-queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

export const createWidgetToolSchema = {
  parent_container_id: z
    .string()
    .describe('ID of the parent container (dashboard ID or board view ID)'),
  parent_container_type: z.nativeEnum(WidgetParentKind).describe('Type of parent container: DASHBOARD or BOARD_VIEW'),
  widget_kind: z.nativeEnum(ExternalWidget).describe('Type of widget to create: i.e CHART, NUMBER, BATTERY'),
  widget_name: z
    .string()
    .min(1, 'Widget name is required')
    .max(255, 'Widget name must be 255 characters or less')
    .describe('Widget display name (1-255 UTF-8 chars)'),
  settings: z
    .record(z.unknown())
    .describe(
      'Widget-specific settings as JSON object conforming to widget schema. Use all_widgets_schema tool to get the required schema for each widget type.',
    ),
};

export class CreateWidgetTool extends BaseMondayApiTool<typeof createWidgetToolSchema, never> {
  name = 'create_widget';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Widget',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Create a new widget in a dashboard or board view with specific configuration settings.
    
    This tool creates data visualization widgets that display information from monday.com boards:
    **Parent Containers:**
    - **DASHBOARD**: Place widget in a dashboard (most common use case)
    - **BOARD_VIEW**: Place widget in a specific board view
    
    **Critical Requirements:**
    1. **Schema Compliance**: Widget settings MUST conform to the JSON schema for the specific widget type
    2. **Use all_widgets_schema first**: Always fetch widget schemas before creating widgets
    3. **Validate settings**: Ensure all required fields are provided and data types match
    
    **Workflow:**
    1. Use 'all_widgets_schema' to get schema definitions
    2. Prepare widget settings according to the schema
    3. Use this tool to create the widget`;
  }

  getInputSchema(): typeof createWidgetToolSchema {
    return createWidgetToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof createWidgetToolSchema>): Promise<ToolOutputType<never>> {
    try {
      // Prepare GraphQL variables
      const variables: CreateWidgetMutationVariables = {
        parent: {
          kind: input.parent_container_type,
          id: input.parent_container_id,
        },
        kind: input.widget_kind,
        name: input.widget_name,
        settings: input.settings,
      };

      // Execute the GraphQL mutation
      const res = await this.mondayApi.request<CreateWidgetMutation>(createWidget, variables);

      // Check if the widget was created successfully
      if (!res.create_widget) {
        throw new Error('Failed to create widget');
      }

      const widget = res.create_widget;

      // Format success response with widget details
      const parentInfo =
        widget.parent?.kind === WidgetParentKind.Dashboard
          ? `dashboard ${widget.parent.id}`
          : `board view ${widget.parent?.id}`;

      return {
        content: `✅ Widget "${widget.name}" successfully created!

**Widget Details:**
• **ID**: ${widget.id}
• **Name**: ${widget.name}
• **Type**: ${widget.kind}
• **Location**: Placed in ${parentInfo}

**Widget Configuration:**
• **Settings Applied**: ${JSON.stringify(input.settings, null, 2)}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create ${input.widget_kind} widget: ${errorMessage}`);
    }
  }
}
