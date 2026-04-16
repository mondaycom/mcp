import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  CanOverrideField,
  ColumnType,
  CreateEntityColumnInput,
  CreateSchemaColumnsMutation,
  CreateSchemaColumnsMutationVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { createSchemaColumnsMutationDev } from './create-schema-columns-tool.graphql.dev';

const policyInputSchema = z
  .object({
    can_override: z
      .array(z.enum(['title', 'description', 'settings']))
      .optional()
      .describe('Fields that boards can override. Allowed values: title, description, settings.'),
    cannot_delete: z.boolean().optional().describe('If true, the column cannot be deleted from boards.'),
  })
  .optional()
  .describe('Controls board-level permissions for this column. If omitted, defaults to: no field overrides allowed, column can be deleted by boards.');

const columnInputSchema = z.object({
  type: z
    .string()
    .describe(
      'Column type (e.g. text, status, numbers, date, dropdown, people). Use get_column_type_info to see available types.',
    ),
  title: z.string().describe('Column title.'),
  description: z.string().optional().describe('Column description.'),
  defaults: z
    .record(z.unknown())
    .optional()
    .describe(
      'Type-specific column settings. Call get_column_type_info with the column type before populating this field to understand the valid structure.',
    ),
  policy: policyInputSchema,
  opt_out_by_default: z
    .boolean()
    .optional()
    .describe('If true, the column will not be automatically added to boards connected to this schema.'),
});

export const createSchemaColumnsToolSchema = {
  schemaId: z
    .string()
    .optional()
    .describe('The ID of the schema to add columns to. Either schemaId or schemaName must be provided.'),
  schemaName: z
    .string()
    .optional()
    .describe('The name of the schema to add columns to. Either schemaId or schemaName must be provided.'),
  columns: z.array(columnInputSchema).describe('Array of columns to create on the schema.'),
};

export class CreateSchemaColumnsTool extends BaseMondayApiTool<typeof createSchemaColumnsToolSchema> {
  name = 'create_schema_columns';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Schema Columns',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Add columns to an account-level schema. Columns added to a schema are propagated to all boards connected to that schema. IMPORTANT: Before calling this tool, call get_column_type_info for each column type you intend to create to understand the valid structure for the defaults field.';
  }

  getInputSchema(): typeof createSchemaColumnsToolSchema {
    return createSchemaColumnsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof createSchemaColumnsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const columns = input.columns.map((col) => ({
      type: col.type as ColumnType,
      title: col.title,
      description: col.description,
      defaults: col.defaults,
      opt_out_by_default: col.opt_out_by_default,
      policy: {
        can_override: (col.policy?.can_override ?? []) as CanOverrideField[],
        cannot_delete: col.policy?.cannot_delete ?? false,
      },
    }));

    const variables: CreateSchemaColumnsMutationVariables = {
      schemaId: input.schemaId,
      schemaName: input.schemaName,
      columns: columns as CreateEntityColumnInput[],
    };

    const res = await this.mondayApi.request<CreateSchemaColumnsMutation>(
      createSchemaColumnsMutationDev,
      variables,
      { versionOverride: 'dev' },
    );

    return {
      content: {
        message: `Columns successfully added to schema "${res.create_schema_columns?.name}"`,
        schema_id: res.create_schema_columns?.id,
        schema_name: res.create_schema_columns?.name,
        revision: res.create_schema_columns?.revision,
      },
    };
  }
}
