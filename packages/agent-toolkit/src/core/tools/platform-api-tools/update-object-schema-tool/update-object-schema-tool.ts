import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  UpdateObjectSchemaMutation,
  UpdateObjectSchemaMutationVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { updateObjectSchemaMutation } from './update-object-schema-tool.graphql';

export const updateObjectSchemaToolSchema = {
  id: z.string().describe('The ID of the object schema to update.'),
  revision: z
    .number()
    .describe(
      'The current revision number for optimistic locking. Retrieve it first via get_object_schemas.',
    ),
  parentId: z.string().optional().describe('The ID of the parent object schema.'),
  description: z.string().optional().describe('The new description for this object schema.'),
};

export class UpdateObjectSchemaTool extends BaseMondayApiTool<typeof updateObjectSchemaToolSchema> {
  name = 'update_object_schema';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update Object Schema',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Update an account-level object schema. Requires the current revision number for optimistic locking — retrieve it first via get_object_schemas.';
  }

  getInputSchema(): typeof updateObjectSchemaToolSchema {
    return updateObjectSchemaToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof updateObjectSchemaToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables: UpdateObjectSchemaMutationVariables = {
      id: input.id,
      revision: input.revision,
      parentId: input.parentId,
      description: input.description,
    };

    const res = await this.mondayApi.request<UpdateObjectSchemaMutation>(updateObjectSchemaMutation, variables);

    return {
      content: {
        message: `Object schema "${res.update_object_schema?.name}" successfully updated`,
        schema_id: res.update_object_schema?.id,
        schema_name: res.update_object_schema?.name,
        revision: res.update_object_schema?.revision,
      },
    };
  }
}
