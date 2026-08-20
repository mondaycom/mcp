import { z } from 'zod';
import {
  ViewKind,
  ItemsQueryOperator,
  ItemsQueryRuleOperator,
  ItemsOrderByDirection,
  CreateViewMutation,
  CreateViewMutationVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { createView } from './create-view-tool.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { ColumnTypeInfoFetchMode } from '../get-column-type-info/get-column-type-info-fetch-mode';

export const createViewToolSchema = {
  boardId: z.string().describe('The board ID to create the view on'),
  type: z.nativeEnum(ViewKind).default(ViewKind.Table).describe('The type of board view to create. Use TABLE for standard board views.'),
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
  settings: z
    .any()
    .optional()
    .describe(
      'Type-specific view settings as a JSON object (e.g. column visibility, group_by for TABLE). The shape varies by view type — call get_view_schema_by_type with the same ViewKind to discover the supported structure. For TABLE views, prefer the dedicated create_view_table tool which exposes a strongly-typed settings field.',
    ),
};

export class CreateViewTool extends BaseMondayApiTool<typeof createViewToolSchema, never> {
  name = 'create_view';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create View',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Create a new board view (tab) with optional filters and sorting. This creates a saved view on a monday.com board that users can switch to.

[REQUIRED PRECONDITION]: If you pass filters or sorting, call get_board_info first to get the board column IDs, column types, and status label indexes. Filter rules reference real column IDs and, for status columns, numeric label indexes — do not guess them. Before sending the filters, use get_column_type_info with fetchMode "${ColumnTypeInfoFetchMode.Guidelines}" and use data.guidelines.filter (null if that type has no documented rules).

Filter operators: any_of, not_any_of, is_empty, is_not_empty, greater_than, lower_than, between, contains_text, not_contains_text

Example filter for people column: { "rules": [{ "column_id": "people", "compare_value": ["person-12345"], "operator": "any_of" }] }
Example filter for status column: { "rules": [{ "column_id": "status", "compare_value": [1], "operator": "any_of" }] }`;
  }

  getInputSchema(): typeof createViewToolSchema {
    return createViewToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof createViewToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables = {
      boardId: input.boardId,
      type: input.type,
      name: input.name,
      filter: input.filter,
      sort: input.sort,
      settings: input.settings,
    } as CreateViewMutationVariables;

    const res = await this.mondayApi.request<CreateViewMutation>(createView, variables);

    if (!res.create_view) {
      return { content: 'Failed to create view - no response from API' };
    }

    return {
      content: `View "${res.create_view.name}" (ID: ${res.create_view.id}, type: ${res.create_view.type}) successfully created`,
    };
  }
}
