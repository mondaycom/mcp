import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  DeleteObjectSchemaMutation,
  DeleteObjectSchemaMutationVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { deleteObjectSchemaMutation } from './delete-object-schema-tool.graphql';

export const deleteObjectSchemaToolSchema = {
  id: z.string().optional().describe('The ID of the object schema to delete. Either id or name must be provided.'),
  name: z.string().optional().describe('The name of the object schema to delete. Either id or name must be provided.'),
};

export class DeleteObjectSchemaTool extends BaseMondayApiTool<typeof deleteObjectSchemaToolSchema> {
  name = 'delete_object_schema';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Delete Object Schema',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Delete an account-level object schema. Only allowed when no boards are connected to the schema. Provide either id or name.';
  }

  getInputSchema(): typeof deleteObjectSchemaToolSchema {
    return deleteObjectSchemaToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof deleteObjectSchemaToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (!input.id && !input.name) {
      throw new Error('Either id or name must be provided');
    }

    const variables: DeleteObjectSchemaMutationVariables = {
      id: input.id,
      name: input.name,
    };

    const res = await this.mondayApi.request<DeleteObjectSchemaMutation>(deleteObjectSchemaMutation, variables);

    return {
      content: {
        message: `Object schema "${res.delete_object_schema?.name}" successfully deleted`,
        schema_id: res.delete_object_schema?.id,
        schema_name: res.delete_object_schema?.name,
      },
    };
  }
}
