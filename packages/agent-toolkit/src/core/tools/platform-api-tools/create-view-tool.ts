import { z } from 'zod';
import {
  ViewKind,
  ItemsQueryOperator,
  ItemsQueryRuleOperator,
} from '../../../monday-graphql/generated/graphql/graphql';
import { createView } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const createViewToolSchema = {
  boardId: z.string().describe('The board ID to create the view on'),
  type: z.nativeEnum(ViewKind).describe('The type of view to create (TABLE, FORM, DASHBOARD, APP)'),
  name: z.string().optional().describe('The name of the view (e.g. "High Priority Items", "My Tasks")'),
  filter: z
    .object({
      rules: z
        .array(
          z.object({
            column_id: z.string().describe('The column ID to filter by'),
            compare_value: z.any().describe('The value(s) to compare against'),
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
        direction: z.enum(['asc', 'desc']).optional().describe('Sort direction (defaults to asc)'),
      }),
    )
    .optional()
    .describe('Sort configuration for the view'),
};

type CreateViewResult = {
  create_view?: {
    id: string;
    name: string;
    type: string;
  } | null;
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
    return `Create a board view with optional filters and sorting.

Supported view types:
- TABLE: Standard table view (most common)
- FORM: Data entry form
- DASHBOARD: Dashboard display
- APP: App-specific view

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
    };

    const res = await this.mondayApi.request<CreateViewResult>(createView, variables);

    if (!res.create_view) {
      return { content: 'Failed to create view - no response from API' };
    }

    return {
      content: `View "${res.create_view.name}" (ID: ${res.create_view.id}, type: ${res.create_view.type}) successfully created`,
    };
  }
}
