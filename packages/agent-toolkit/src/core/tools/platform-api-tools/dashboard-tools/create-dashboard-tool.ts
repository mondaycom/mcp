import { z } from 'zod';
import {
  DashboardKind,
  CreateDashboardMutation,
  CreateDashboardMutationVariables,
} from '../../../../monday-graphql/generated/graphql';
import { createDashboard } from './dashboard-queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

export const createDashboardToolSchema = {
  name: z
    .string()
    .min(1, 'Dashboard name is required')
    .describe('Human-readable dashboard title (UTF-8 chars)'),
  workspace_id: z
    .string()
    .describe('ID of the workspace that will own the dashboard'),
  board_ids: z
    .array(z.string())
    .min(1, 'At least one board ID is required')
    .max(50, 'A maximum of 50 board IDs are allowed')
    .describe('List of board IDs as strings (min 1 element)'),
  kind: z.nativeEnum(DashboardKind).default(DashboardKind.Public).describe('Visibility level: PUBLIC or PRIVATE'),
  board_folder_id: z
    .string()
    .optional()
    .describe('Optional folder ID within workspace to place this dashboard (if not provided, dashboard will be placed in workspace root)'),
};

export class CreateDashboardTool extends BaseMondayApiTool<typeof createDashboardToolSchema, never> {
  name = 'create_dashboard';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Dashboard',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Use this tool to create a new monday.com dashboard that aggregates data from one or more boards. 
    Dashboards provide visual representations of board data through widgets and charts.
    
    Use this tool when users want to:
    - Create a dashboard to visualize board data
    - Aggregate information from multiple boards
    - Set up a data visualization container for widgets`;
  }

  getInputSchema(): typeof createDashboardToolSchema {
    return createDashboardToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof createDashboardToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      // Prepare GraphQL variables
      const variables: CreateDashboardMutationVariables = {
        name: input.name,
        workspace_id: input.workspace_id,
        board_ids: input.board_ids,
        kind: input.kind,
        board_folder_id: input.board_folder_id,
      };

      // Execute the GraphQL mutation
      const res = await this.mondayApi.request<CreateDashboardMutation>(createDashboard, variables);

      // Check if the dashboard was created successfully
      if (!res.create_dashboard) {
        throw new Error('Failed to create dashboard');
      }

      const dashboard = res.create_dashboard;

      // Format success response with dashboard details
      const folderInfo = dashboard.board_folder_id ? ` in folder ${dashboard.board_folder_id}` : ' in workspace root';

      const visibilityInfo =
        dashboard.kind === DashboardKind.Public
          ? '(visible to all workspace members)'
          : '(private - visible only to invited users)';

      return {
        content: `✅ Dashboard "${dashboard.name}" successfully created!

Dashboard Details:
• ID: ${dashboard.id}
• Name: ${dashboard.name}
• Workspace ID: ${dashboard.workspace_id}${folderInfo}
• Visibility: ${dashboard.kind} ${visibilityInfo}
• Connected Boards: ${input.board_ids.length} board(s)

Next Steps:
1. Use 'all_widgets_schema' to understand available widget types
2. Understand the connected boards structure, columns, and metadata. Map board ids to column ids
3. Plan Domain-Beneficial Widgets - Strategic widget planning based on real data analysis
4. Use 'create_widget' to add widgets to the dashboard`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create dashboard: ${errorMessage}`);
    }
  }
}
