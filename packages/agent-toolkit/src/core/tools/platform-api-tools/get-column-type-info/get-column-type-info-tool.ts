import { z } from 'zod';
import { ColumnType } from '../../../../monday-graphql/generated/graphql';
import { getColumnTypeSchema } from './get-column-type-schema.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

export const getColumnTypeInfoToolSchema = {
  columnType: z.nativeEnum(ColumnType).describe('The column type to retrieve information for (e.g., "text", "status", "date", "numbers")'),
};

export class GetColumnTypeInfoTool extends BaseMondayApiTool<typeof getColumnTypeInfoToolSchema> {
  name = 'get_column_type_info';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Column Type Info',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Retrieves comprehensive information about a specific column type, including JSON schema definition and other metadata. Use this before creating columns with the create_column tool to understand the structure, validation rules, and available properties for column settings.';
  }

  getInputSchema(): typeof getColumnTypeInfoToolSchema {
    return getColumnTypeInfoToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof getColumnTypeInfoToolSchema>): Promise<ToolOutputType<never>> {
    const variables = {
      type: input.columnType,
    };

    const res = await this.mondayApi.request<any>(getColumnTypeSchema, variables);

    if (!res?.get_column_type_schema) {
      return {
        content: `Information for column type "${input.columnType}" not found or not available.`,
      };
    }

    const columnTypeInfo = {
      schema: res.get_column_type_schema,
    };

    return {
      content: `Column Type Information for "${input.columnType}":\n\n${JSON.stringify(columnTypeInfo, null, 2)}`,
    };
  }
} 
