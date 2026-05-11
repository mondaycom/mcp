import { z } from 'zod';
import {
  ItemsQueryOperator,
  ItemsQueryRuleOperator,
  ItemsOrderByDirection,
  SortDirection,
  UpdateViewTableMutation,
  UpdateViewTableMutationVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { updateViewTable } from './update-view-table-tool.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

const columnPropertySchema = z.object({
  column_id: z.string().describe('The ID of the column'),
  visible: z.boolean().describe('Whether the column is visible'),
});

const tableSettingsSchema = z
  .object({
    columns: z
      .object({
        column_properties: z
          .array(columnPropertySchema)
          .optional()
          .describe('Visibility configuration for main board columns'),
        subitems_column_properties: z
          .array(columnPropertySchema)
          .optional()
          .describe('Visibility configuration for subitem columns'),
        floating_columns_count: z.number().int().optional().describe('Number of floating columns to display'),
        column_order: z.array(z.string()).optional().describe('Ordered list of column IDs'),
      })
      .optional()
      .describe('Column visibility and order configuration'),
    group_by: z
      .object({
        conditions: z
          .array(
            z.object({
              columnId: z.string().describe('ID of the column to group by'),
              config: z
                .object({
                  sortSettings: z
                    .object({
                      direction: z.nativeEnum(SortDirection).describe('Sort direction (ASC or DESC)'),
                      type: z.string().optional().describe('Type of sorting to apply'),
                    })
                    .optional(),
                })
                .optional(),
            }),
          )
          .describe('Group-by conditions'),
        hideEmptyGroups: z.boolean().optional().describe('Whether to hide groups with no items'),
      })
      .optional()
      .describe('Group-by configuration for the table view'),
  })
  .optional()
  .describe('Table-specific view settings (column visibility/order, group-by)');

export const updateViewTableToolSchema = {
  viewId: z.string().describe('The ID of the table view to update'),
  boardId: z.string().describe('The board ID the view belongs to'),
  name: z.string().optional().describe('New name for the view (omit to leave unchanged)'),
  filter: z
    .object({
      rules: z
        .array(
          z.object({
            column_id: z.string().describe('The column ID to filter by'),
            compare_value: z.any().default([]).describe('The value(s) to compare against'),
            operator: z
              .nativeEnum(ItemsQueryRuleOperator)
              .optional()
              .describe('The comparison operator (defaults to any_of)'),
          }),
        )
        .optional()
        .describe('Filter rules'),
      operator: z
        .nativeEnum(ItemsQueryOperator)
        .optional()
        .describe('Logical operator between rules (defaults to and)'),
    })
    .optional()
    .describe('Filter configuration to apply to the view'),
  sort: z
    .array(
      z.object({
        column_id: z.string().describe('The column ID to sort by'),
        direction: z.nativeEnum(ItemsOrderByDirection).optional().describe('Sort direction (defaults to asc)'),
      }),
    )
    .optional()
    .describe('Sort configuration for the view'),
  tags: z.array(z.string()).optional().describe('Tags to apply to the view'),
  settings: tableSettingsSchema,
};

export class UpdateViewTableTool extends BaseMondayApiTool<typeof updateViewTableToolSchema, never> {
  name = 'update_view_table';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update Table View',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Update an existing table-type board view — change its name, filters, sort, tags, or table-specific settings (column visibility/order and group-by). Provide only the fields you want to change. Omitted fields are left unchanged.

Filter operators: any_of, not_any_of, is_empty, is_not_empty, greater_than, lower_than, between, contains_text, not_contains_text

Example settings.columns: { "column_properties": [{ "column_id": "status", "visible": true }], "column_order": ["name", "status", "date"] }
Example settings.group_by: { "conditions": [{ "columnId": "status" }], "hideEmptyGroups": true }`;
  }

  getInputSchema(): typeof updateViewTableToolSchema {
    return updateViewTableToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof updateViewTableToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables = {
      viewId: input.viewId,
      boardId: input.boardId,
      name: input.name,
      filter: input.filter,
      sort: input.sort,
      tags: input.tags,
      settings: input.settings,
    } as UpdateViewTableMutationVariables;

    const res = await this.mondayApi.request<UpdateViewTableMutation>(updateViewTable, variables);

    if (!res.update_view_table) {
      return { content: 'Failed to update table view - no response from API' };
    }

    return {
      content: `Table view "${res.update_view_table.name}" (ID: ${res.update_view_table.id}, type: ${res.update_view_table.type}) successfully updated`,
    };
  }
}
