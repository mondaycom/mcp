import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  DeleteSchemaColumnsMutation,
  DeleteSchemaColumnsMutationVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { deleteSchemaColumnsMutationDev } from './delete-schema-columns-tool.graphql.dev';

export const deleteSchemaColumnsToolSchema = {
<<<<<<< HEAD
  schemaId: z
    .string()
    .optional()
    .describe('The ID of the schema to delete columns from. Either schemaId or schemaName must be provided.'),
  schemaName: z
    .string()
    .optional()
    .describe('The name of the schema to delete columns from. Either schemaId or schemaName must be provided.'),
=======
  entityId: z
    .string()
    .optional()
    .describe(
      'The ID of the schema (entity) to delete columns from. Either entityId or entityName must be provided.',
    ),
  entityName: z
    .string()
    .optional()
    .describe(
      'The name of the schema (entity) to delete columns from. Either entityId or entityName must be provided.',
    ),
>>>>>>> 770d725 (feat(agent-toolkit): add data-structure schema management tools (v5.2.0))
  columnIds: z
    .array(z.string())
    .describe(
      'IDs of the columns to permanently delete. Only allowed when no boards are connected to the schema.',
    ),
};

export class DeleteSchemaColumnsTool extends BaseMondayApiTool<typeof deleteSchemaColumnsToolSchema> {
<<<<<<< HEAD
  name = 'delete_schema_columns';
=======
  name = 'delete_entity_columns';
>>>>>>> 770d725 (feat(agent-toolkit): add data-structure schema management tools (v5.2.0))
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
<<<<<<< HEAD
    if (!input.schemaId && !input.schemaName) {
      throw new Error('Either schemaId or schemaName must be provided');
    }

    const variables: DeleteSchemaColumnsMutationVariables = {
      entityId: input.schemaId,
      entityName: input.schemaName,
=======
    const variables: DeleteSchemaColumnsMutationVariables = {
      entityId: input.entityId,
      entityName: input.entityName,
>>>>>>> 770d725 (feat(agent-toolkit): add data-structure schema management tools (v5.2.0))
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
<<<<<<< HEAD
        schema_id: res.delete_entity_columns?.id,
        schema_name: res.delete_entity_columns?.name,
=======
        entity_id: res.delete_entity_columns?.id,
        entity_name: res.delete_entity_columns?.name,
>>>>>>> 770d725 (feat(agent-toolkit): add data-structure schema management tools (v5.2.0))
        revision: res.delete_entity_columns?.revision,
      },
    };
  }
}
