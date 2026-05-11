import { z } from 'zod';
import {
  ViewKind,
  ItemsQueryOperator,
  ItemsQueryRuleOperator,
  ItemsOrderByDirection,
  UpdateViewMutation,
  UpdateViewMutationVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { updateView } from './update-view-tool.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

export const updateViewToolSchema = {
  viewId: z.string().describe('The ID of the view to update'),
  boardId: z.string().describe('The board ID the view belongs to'),
  type: z
    .nativeEnum(ViewKind)
    .default(ViewKind.Table)
    .describe('The type of the board view being updated. Use TABLE for standard board views.'),
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
  settings: z
    .any()
    .optional()
    .describe(
      'Type-specific view settings as a JSON object (e.g. column visibility, group_by for TABLE). The shape varies by view type — call get_view_schema_by_type with the same ViewKind to discover the supported structure. For TABLE views, prefer the dedicated update_view_table tool which exposes a strongly-typed settings field.',
    ),
};

export class UpdateViewTool extends BaseMondayApiTool<typeof updateViewToolSchema, never> {
  name = 'update_view';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update View',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Update an existing board view (tab) — change its name, filter rules, or sort order. Provide only the fields you want to change. Omitted fields are left unchanged.

Filter operators: any_of, not_any_of, is_empty, is_not_empty, greater_than, lower_than, between, contains_text, not_contains_text

Example filter for people column: { "rules": [{ "column_id": "people", "compare_value": ["person-12345"], "operator": "any_of" }] }
Example filter for status column: { "rules": [{ "column_id": "status", "compare_value": [1], "operator": "any_of" }] }`;
  }

  getInputSchema(): typeof updateViewToolSchema {
    return updateViewToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof updateViewToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables = {
      viewId: input.viewId,
      boardId: input.boardId,
      type: input.type,
      name: input.name,
      filter: input.filter,
      sort: input.sort,
      settings: input.settings,
    } as UpdateViewMutationVariables;

    const res = await this.mondayApi.request<UpdateViewMutation>(updateView, variables);

    if (!res.update_view) {
      return { content: 'Failed to update view - no response from API' };
    }

    return {
      content: `View "${res.update_view.name}" (ID: ${res.update_view.id}, type: ${res.update_view.type}) successfully updated`,
    };
  }
}
