import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  DeleteSchemaMutation,
  DeleteSchemaMutationVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { deleteSchemaMutationDev } from './delete-schema-tool.graphql.dev';

export const deleteSchemaToolSchema = {
  id: z.string().optional().describe('The ID of the schema to delete. Either id or name must be provided.'),
  name: z.string().optional().describe('The name of the schema to delete. Either id or name must be provided.'),
};

export class DeleteSchemaTool extends BaseMondayApiTool<typeof deleteSchemaToolSchema> {
  name = 'delete_schema';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Delete Schema',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Delete an account-level schema. Only allowed when no boards are connected to the schema. Provide either id or name.';
  }

  getInputSchema(): typeof deleteSchemaToolSchema {
    return deleteSchemaToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof deleteSchemaToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables: DeleteSchemaMutationVariables = {
      id: input.id,
      name: input.name,
    };

    const res = await this.mondayApi.request<DeleteSchemaMutation>(deleteSchemaMutationDev, variables, {
      versionOverride: 'dev',
    });

    return {
      content: {
        message: `Schema "${res.delete_schema?.name}" successfully deleted`,
        entity_id: res.delete_schema?.id,
        entity_name: res.delete_schema?.name,
      },
    };
  }
}
