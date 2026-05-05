import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { ColumnTypeInfoFetchMode } from '../get-column-type-info/get-column-type-info-fetch-mode';
import {
  CanOverrideField,
  ColumnType,
  CreateObjectSchemaColumnInput,
  CreateObjectSchemaColumnsMutation,
  CreateObjectSchemaColumnsMutationVariables,
  UpdateObjectSchemaColumnsMutation,
  UpdateObjectSchemaColumnsMutationVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { createObjectSchemaColumnsMutation } from './create-object-schema-columns.graphql';
import { updateObjectSchemaColumnsMutation } from './update-object-schema-columns.graphql';

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

const createColumnSchema = z.object({
  type: z.string().describe(
    `Column type (e.g. text, status, numbers, date, dropdown, people). Call get_column_type_info with fetchMode "${ColumnTypeInfoFetchMode.Schema}" for a type's settings schema.`,
  ),
  title: z.string().describe('Column title.'),
  description: z.string().optional().describe('Column description.'),
  defaults: z
    .record(z.unknown())
    .optional()
    .describe(
      `Type-specific column settings. Call get_column_type_info with fetchMode "${ColumnTypeInfoFetchMode.Schema}" before populating this field to understand the valid structure.`,
    ),
  policy: policyInputSchema,
  opt_out_by_default: z.boolean().optional().describe('If true, the column will not be automatically added to boards connected to this schema.'),
});

const updateColumnSchema = z.object({
  column_id: z.string().describe('The ID of the column to update.'),
  title: z.string().optional().describe('New column title.'),
  description: z.string().optional().describe('New column description.'),
  defaults: z
    .record(z.unknown())
    .optional()
    .describe(
      `Type-specific column settings. Call get_column_type_info with fetchMode "${ColumnTypeInfoFetchMode.Schema}" before populating this field.`,
    ),
  opt_out_by_default: z.boolean().optional().describe('If true, the column will not be automatically added to boards connected to this schema.'),
  policy: policyInputSchema,
});

export const manageObjectSchemaColumnsToolSchema = {
  action: z
    .enum(['create', 'update'])
    .describe(
      'The operation to perform on columns. ' +
        `create: adds new columns to the schema. Each column requires type and title. Call get_column_type_info with fetchMode "${ColumnTypeInfoFetchMode.Schema}" first to understand valid defaults per column type. ` +
        'update: modifies existing columns. Each entry must include column_id. Only send the columns you want to modify — other columns are unaffected. ' +
        'Use opt_out_by_default=true to opt a column out (stop auto-adding to boards), or opt_out_by_default=false to opt in (restore auto-adding).',
    ),
  objectSchemaId: z.string().optional().describe('The ID of the object schema. Either objectSchemaId or objectSchemaName must be provided.'),
  objectSchemaName: z.string().optional().describe('The name of the object schema. Either objectSchemaId or objectSchemaName must be provided.'),
  columns: z.array(z.union([createColumnSchema, updateColumnSchema])).describe('Array of columns to create or update.'),
};

export class ManageObjectSchemaColumnsTool extends BaseMondayApiTool<typeof manageObjectSchemaColumnsToolSchema> {
  name = 'manage_object_schema_columns';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Manage Object Schema Columns',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return (
      'Create or update columns on an account-level object schema. Column changes are propagated to all boards connected to the schema. ' +
      `create: adds new columns. Each column requires type and title. Call get_column_type_info with fetchMode "${ColumnTypeInfoFetchMode.Schema}" first to understand valid defaults per column type. ` +
      'update: modifies existing columns. Each entry must include column_id. Only send the columns you want to modify — other columns are unaffected. ' +
      'Use opt_out_by_default=true to stop a column from being auto-added to boards (opt out), or opt_out_by_default=false to restore auto-adding (opt in).'
    );
  }

  getInputSchema(): typeof manageObjectSchemaColumnsToolSchema {
    return manageObjectSchemaColumnsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof manageObjectSchemaColumnsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (!input.objectSchemaId && !input.objectSchemaName) {
      throw new Error('Either objectSchemaId or objectSchemaName must be provided');
    }

    if (input.action === 'create') {
      const columns = input.columns.map((col) => {
        const c = col as z.infer<typeof createColumnSchema>;
        return {
          type: c.type as ColumnType,
          title: c.title,
          description: c.description,
          defaults: c.defaults,
          opt_out_by_default: c.opt_out_by_default,
          policy: {
            can_override: (c.policy?.can_override ?? []) as CanOverrideField[],
            cannot_delete: c.policy?.cannot_delete ?? false,
          },
        } as CreateObjectSchemaColumnInput;
      });

      const variables: CreateObjectSchemaColumnsMutationVariables = {
        objectSchemaId: input.objectSchemaId,
        objectSchemaName: input.objectSchemaName,
        columns,
      };

      const res = await this.mondayApi.request<CreateObjectSchemaColumnsMutation>(
        createObjectSchemaColumnsMutation,
        variables,
      );

      return {
        content: {
          message: `Columns successfully added to object schema "${res.create_object_schema_columns?.name}"`,
          schema_id: res.create_object_schema_columns?.id,
          schema_name: res.create_object_schema_columns?.name,
          revision: res.create_object_schema_columns?.revision,
        },
      };
    } else {
      const variables: UpdateObjectSchemaColumnsMutationVariables = {
        objectSchemaId: input.objectSchemaId,
        objectSchemaName: input.objectSchemaName,
        columns: input.columns.map((col) => {
          const c = col as z.infer<typeof updateColumnSchema>;
          return {
            column_id: c.column_id,
            title: c.title,
            description: c.description,
            defaults: c.defaults,
            opt_out_by_default: c.opt_out_by_default,
            policy: c.policy
              ? { can_override: (c.policy.can_override ?? []) as CanOverrideField[], cannot_delete: c.policy.cannot_delete ?? false }
              : undefined,
          };
        }),
      };

      const res = await this.mondayApi.request<UpdateObjectSchemaColumnsMutation>(
        updateObjectSchemaColumnsMutation,
        variables,
      );

      return {
        content: {
          message: `Columns successfully updated on object schema "${res.update_object_schema_columns?.name}"`,
          schema_id: res.update_object_schema_columns?.id,
          schema_name: res.update_object_schema_columns?.name,
          revision: res.update_object_schema_columns?.revision,
        },
      };
    }
  }
}
