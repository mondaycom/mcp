import { z } from 'zod';
import {
  ItemsQueryOperator,
  ItemsQueryRuleOperator,
  ItemsOrderByDirection,
  SortDirection,
  CreateViewTableMutation,
  CreateViewTableMutationVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { createViewTable } from './create-view-table-tool.graphql';
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

export const createViewTableToolSchema = {
  boardId: z.string().describe('The board ID to create the table view on'),
  name: z.string().optional().describe('The name of the view (e.g. "High Priority Items", "My Tasks")'),
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
    .describe('Filter configuration for the view'),
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

export class CreateViewTableTool extends BaseMondayApiTool<typeof createViewTableToolSchema, never> {
  name = 'create_view_table';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Table View',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Create a new table-type board view with optional filters, sort, tags, and table-specific settings (column visibility/order and group-by). Use this instead of create_view when you need to configure table-specific settings. For a simple table view, create_view also works.

Filter operators: any_of, not_any_of, is_empty, is_not_empty, greater_than, lower_than, between, contains_text, not_contains_text

Example settings.columns: { "column_properties": [{ "column_id": "status", "visible": true }], "column_order": ["name", "status", "date"] }
Example settings.group_by: { "conditions": [{ "columnId": "status" }], "hideEmptyGroups": true }`;
  }

  getInputSchema(): typeof createViewTableToolSchema {
    return createViewTableToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof createViewTableToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables = {
      boardId: input.boardId,
      name: input.name,
      filter: input.filter,
      sort: input.sort,
      tags: input.tags,
      settings: input.settings,
    } as CreateViewTableMutationVariables;

    const res = await this.mondayApi.request<CreateViewTableMutation>(createViewTable, variables);

    if (!res.create_view_table) {
      return { content: 'Failed to create table view - no response from API' };
    }

    return {
      content: `Table view "${res.create_view_table.name}" (ID: ${res.create_view_table.id}, type: ${res.create_view_table.type}) successfully created`,
    };
  }
}
