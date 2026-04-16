import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  DeleteSchemaColumnsMutation,
  DeleteSchemaColumnsMutationVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { deleteSchemaColumnsMutationDev } from './delete-schema-columns-tool.graphql.dev';

export const deleteSchemaColumnsToolSchema = {
  schemaId: z
    .string()
    .optional()
    .describe('The ID of the schema to delete columns from. Either schemaId or schemaName must be provided.'),
  schemaName: z
    .string()
    .optional()
    .describe('The name of the schema to delete columns from. Either schemaId or schemaName must be provided.'),
  columnIds: z
    .array(z.string())
    .describe(
      'IDs of the columns to permanently delete. Only allowed when no boards are connected to the schema.',
    ),
};

export class DeleteSchemaColumnsTool extends BaseMondayApiTool<typeof deleteSchemaColumnsToolSchema> {
  name = 'delete_entity_columns';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Delete Schema Columns',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Permanently delete columns from an account-level schema. Only allowed when no boards are connected to the schema. Use deactivate_schema_column for a reversible alternative.';
  }

  getInputSchema(): typeof deleteSchemaColumnsToolSchema {
    return deleteSchemaColumnsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof deleteSchemaColumnsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables: DeleteSchemaColumnsMutationVariables = {
      entityId: input.schemaId,
      entityName: input.schemaName,
      columnIds: input.columnIds,
    };

    const res = await this.mondayApi.request<DeleteSchemaColumnsMutation>(
      deleteSchemaColumnsMutationDev,
      variables,
      { versionOverride: 'dev' },
    );

    return {
      content: {
        message: `${input.columnIds.length} column(s) successfully deleted from schema "${res.delete_entity_columns?.name}"`,
        schema_id: res.delete_entity_columns?.id,
        schema_name: res.delete_entity_columns?.name,
        revision: res.delete_entity_columns?.revision,
      },
    };
  }
}
