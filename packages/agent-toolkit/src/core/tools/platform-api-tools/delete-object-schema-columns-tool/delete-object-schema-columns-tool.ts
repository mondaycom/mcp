import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  DeleteObjectSchemaColumnsMutation,
  DeleteObjectSchemaColumnsMutationVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { deleteObjectSchemaColumnsMutationDev } from './delete-object-schema-columns-tool.graphql.dev';

export const deleteObjectSchemaColumnsToolSchema = {
  objectSchemaId: z
    .string()
    .optional()
    .describe('The ID of the object schema to delete columns from. Either objectSchemaId or objectSchemaName must be provided.'),
  objectSchemaName: z
    .string()
    .optional()
    .describe('The name of the object schema to delete columns from. Either objectSchemaId or objectSchemaName must be provided.'),
  columnIds: z
    .array(z.string())
    .describe('IDs of the columns to permanently delete. Only allowed when no boards are connected to the schema.'),
};

export class DeleteObjectSchemaColumnsTool extends BaseMondayApiTool<typeof deleteObjectSchemaColumnsToolSchema> {
  name = 'delete_object_schema_columns';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Delete Object Schema Columns',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Permanently delete columns from an account-level object schema. Only allowed when no boards are connected to the schema. Use manage_object_schema_column with action=deactivate for a reversible alternative.';
  }

  getInputSchema(): typeof deleteObjectSchemaColumnsToolSchema {
    return deleteObjectSchemaColumnsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof deleteObjectSchemaColumnsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (!input.objectSchemaId && !input.objectSchemaName) {
      throw new Error('Either objectSchemaId or objectSchemaName must be provided');
    }

    const variables: DeleteObjectSchemaColumnsMutationVariables = {
      objectSchemaId: input.objectSchemaId,
      objectSchemaName: input.objectSchemaName,
      columnIds: input.columnIds,
    };

    const res = await this.mondayApi.request<DeleteObjectSchemaColumnsMutation>(
      deleteObjectSchemaColumnsMutationDev,
      variables,
      { versionOverride: 'dev' },
    );

    return {
      content: {
        message: `${input.columnIds.length} column(s) successfully deleted from object schema "${res.delete_object_schema_columns?.name}"`,
        schema_id: res.delete_object_schema_columns?.id,
        schema_name: res.delete_object_schema_columns?.name,
        revision: res.delete_object_schema_columns?.revision,
      },
    };
  }
}
