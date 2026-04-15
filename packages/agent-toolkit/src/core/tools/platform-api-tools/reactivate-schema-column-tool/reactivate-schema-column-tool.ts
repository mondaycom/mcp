import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  ReactivateSchemaColumnMutation,
  ReactivateSchemaColumnMutationVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { reactivateSchemaColumnMutationDev } from './reactivate-schema-column-tool.graphql.dev';

export const reactivateSchemaColumnToolSchema = {
  schemaId: z
    .string()
    .optional()
    .describe('The ID of the schema. Either schemaId or schemaName must be provided.'),
  schemaName: z
    .string()
    .optional()
    .describe('The name of the schema. Either schemaId or schemaName must be provided.'),
  columnId: z.string().describe('The ID of the column to reactivate.'),
};

export class ReactivateSchemaColumnTool extends BaseMondayApiTool<typeof reactivateSchemaColumnToolSchema> {
  name = 'reactivate_schema_column';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Reactivate Schema Column',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Reactivate a previously deactivated (deprecated) column on an account-level schema.';
  }

  getInputSchema(): typeof reactivateSchemaColumnToolSchema {
    return reactivateSchemaColumnToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof reactivateSchemaColumnToolSchema>,
  ): Promise<ToolOutputType<never>> {
<<<<<<< HEAD
    if (!input.schemaId && !input.schemaName) {
      throw new Error('Either schemaId or schemaName must be provided');
    }

=======
>>>>>>> 770d725 (feat(agent-toolkit): add data-structure schema management tools (v5.2.0))
    const variables: ReactivateSchemaColumnMutationVariables = {
      schemaId: input.schemaId,
      schemaName: input.schemaName,
      columnId: input.columnId,
    };

    const res = await this.mondayApi.request<ReactivateSchemaColumnMutation>(
      reactivateSchemaColumnMutationDev,
      variables,
      { versionOverride: 'dev' },
    );

    return {
      content: {
        message: `Column "${input.columnId}" successfully reactivated on schema "${res.reactivate_schema_column?.name}"`,
<<<<<<< HEAD
        schema_id: res.reactivate_schema_column?.id,
        schema_name: res.reactivate_schema_column?.name,
=======
        entity_id: res.reactivate_schema_column?.id,
        entity_name: res.reactivate_schema_column?.name,
>>>>>>> 770d725 (feat(agent-toolkit): add data-structure schema management tools (v5.2.0))
        revision: res.reactivate_schema_column?.revision,
      },
    };
  }
}
