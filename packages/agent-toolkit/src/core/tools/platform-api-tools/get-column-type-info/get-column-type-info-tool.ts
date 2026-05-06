import { z } from 'zod';
import { getColumnTypeSchema } from './get-column-type-schema.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { NonDeprecatedColumnType } from 'src/utils/types';
import { API_REFERENCE_URL } from '../utils/constants';
import {
  buildFilterGuidelinesForColumnType,
  getColumnAggregationGuidelines,
} from '../utils/column-filter-aggregation-guidelines';
import { ColumnTypeInfoFetchMode } from './get-column-type-info-fetch-mode';

export const getNonDeprecatedColumnTypeInfoToolSchema = {
  columnType: z
    .nativeEnum(NonDeprecatedColumnType)
    .describe('The column type to retrieve information for (e.g., "text", "status", "date", "numbers")'),
  fetchMode: z
    .nativeEnum(ColumnTypeInfoFetchMode)
    .optional()
    .default(ColumnTypeInfoFetchMode.Schema)
    .describe(
      `fetchMode "${ColumnTypeInfoFetchMode.Schema}": JSON settings schema only (GraphQL). ` +
      `fetchMode "${ColumnTypeInfoFetchMode.Guidelines}": guidelines.filter and guidelines.aggregation only — no GraphQL round-trip.`,
    ),
};

export class GetColumnTypeInfoTool extends BaseMondayApiTool<typeof getNonDeprecatedColumnTypeInfoToolSchema> {
  name = 'get_column_type_info';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Column Type Info',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      'Retrieves comprehensive information about a specific column type. ' +
      `Use fetchMode "${ColumnTypeInfoFetchMode.Schema}" (default) to get the JSON schema definition from the API — use this before creating or updating columns (e.g. create_column) to understand structure, validation rules, and available properties for column settings. ` +
      `Use fetchMode "${ColumnTypeInfoFetchMode.Guidelines}" to get only guidelines.filter and guidelines.aggregation for building items_page filters and board insights counts (no schema, no GraphQL round-trip). `
    );
  }

  getInputSchema(): typeof getNonDeprecatedColumnTypeInfoToolSchema {
    return getNonDeprecatedColumnTypeInfoToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getNonDeprecatedColumnTypeInfoToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (input.fetchMode === ColumnTypeInfoFetchMode.Guidelines) {
      return {
        content: {
          message: `Column type guidelines for ${input.columnType}`,
          data: {
            guidelines: {
              filter: buildFilterGuidelinesForColumnType(input.columnType),
              aggregation: getColumnAggregationGuidelines(),
            },
          },
          url: API_REFERENCE_URL,
        },
      };
    }

    const variables = {
      type: input.columnType,
    };

    const res = await this.mondayApi.request<any>(getColumnTypeSchema, variables);

    if (!res?.get_column_type_schema) {
      return {
        content: `Information for column type "${input.columnType}" not found or not available.`,
      };
    }

    return {
      content: {
        message: `Column type schema for ${input.columnType}`,
        data: { schema: res.get_column_type_schema },
        url: API_REFERENCE_URL,
      },
    };
  }
}
