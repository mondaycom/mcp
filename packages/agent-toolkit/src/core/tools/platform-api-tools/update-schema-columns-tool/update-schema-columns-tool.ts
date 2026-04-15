import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  UpdateSchemaColumnsMutation,
  UpdateSchemaColumnsMutationVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { updateSchemaColumnsMutationDev } from './update-schema-columns-tool.graphql.dev';

const columnUpdateSchema = z.object({
  column_id: z.string().describe('The ID of the column to update.'),
  title: z.string().optional().describe('New column title.'),
  description: z.string().optional().describe('New column description.'),
  defaults: z
    .record(z.unknown())
    .optional()
    .describe(
      'Type-specific column settings. Call get_column_type_info with the column type before populating this field to understand the valid structure.',
    ),
  opt_out_by_default: z
    .boolean()
    .optional()
    .describe('If true, the column will not be automatically added to boards connected to this schema.'),
});

export const updateSchemaColumnsToolSchema = {
  schemaId: z
    .string()
    .optional()
    .describe('The ID of the schema to update columns on. Either schemaId or schemaName must be provided.'),
  schemaName: z
    .string()
    .optional()
    .describe('The name of the schema to update columns on. Either schemaId or schemaName must be provided.'),
  columns: z.array(columnUpdateSchema).describe('Array of columns to update. Only include the columns you want to modify — other columns are unaffected. Each entry must include column_id.'),
};

export class UpdateSchemaColumnsTool extends BaseMondayApiTool<typeof updateSchemaColumnsToolSchema> {
  name = 'update_schema_columns';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update Schema Columns',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Update columns on an account-level schema. Changes are propagated to all boards connected to the schema. You can send only the columns you want to modify — other columns are unaffected. IMPORTANT: Before calling this tool, call get_column_type_info for each column type whose defaults you intend to modify.';
  }

  getInputSchema(): typeof updateSchemaColumnsToolSchema {
    return updateSchemaColumnsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof updateSchemaColumnsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables: UpdateSchemaColumnsMutationVariables = {
      schemaId: input.schemaId,
      schemaName: input.schemaName,
      columns: input.columns,
    };

    const res = await this.mondayApi.request<UpdateSchemaColumnsMutation>(
      updateSchemaColumnsMutationDev,
      variables,
      { versionOverride: 'dev' },
    );

    return {
      content: {
        message: `Columns successfully updated on schema "${res.update_schema_columns?.name}"`,
        entity_id: res.update_schema_columns?.id,
        entity_name: res.update_schema_columns?.name,
        revision: res.update_schema_columns?.revision,
      },
    };
  }
}
