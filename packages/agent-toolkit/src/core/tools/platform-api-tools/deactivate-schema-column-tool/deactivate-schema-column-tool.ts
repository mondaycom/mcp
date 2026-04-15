import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  DeactivateSchemaColumnMutation,
  DeactivateSchemaColumnMutationVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { deactivateSchemaColumnMutationDev } from './deactivate-schema-column-tool.graphql.dev';

export const deactivateSchemaColumnToolSchema = {
  schemaId: z
    .string()
    .optional()
    .describe('The ID of the schema. Either schemaId or schemaName must be provided.'),
  schemaName: z
    .string()
    .optional()
    .describe('The name of the schema. Either schemaId or schemaName must be provided.'),
  columnId: z.string().describe('The ID of the column to deactivate (deprecate).'),
};

export class DeactivateSchemaColumnTool extends BaseMondayApiTool<typeof deactivateSchemaColumnToolSchema> {
  name = 'deactivate_schema_column';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Deactivate Schema Column',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Deprecate (soft-disable) a column on an account-level schema. The column is marked as inactive but not deleted. Use reactivate_schema_column to undo.';
  }

  getInputSchema(): typeof deactivateSchemaColumnToolSchema {
    return deactivateSchemaColumnToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof deactivateSchemaColumnToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables: DeactivateSchemaColumnMutationVariables = {
      schemaId: input.schemaId,
      schemaName: input.schemaName,
      columnId: input.columnId,
    };

    const res = await this.mondayApi.request<DeactivateSchemaColumnMutation>(
      deactivateSchemaColumnMutationDev,
      variables,
      { versionOverride: 'dev' },
    );

    return {
      content: {
        message: `Column "${input.columnId}" successfully deactivated on schema "${res.deactivate_schema_column?.name}"`,
        entity_id: res.deactivate_schema_column?.id,
        entity_name: res.deactivate_schema_column?.name,
        revision: res.deactivate_schema_column?.revision,
      },
    };
  }
}
