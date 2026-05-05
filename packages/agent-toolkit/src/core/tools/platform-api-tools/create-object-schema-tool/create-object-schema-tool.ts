import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  CreateObjectSchemaMutation,
  CreateObjectSchemaMutationVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { createObjectSchemaMutation } from './create-object-schema-tool.graphql';

export const createObjectSchemaToolSchema = {
  name: z
    .string()
    .describe(
      'A unique human-readable name for this object schema. Must be 3-15 characters, contain only lowercase letters, numbers, and underscores, and include at least one letter.',
    ),
  parentId: z.string().optional().describe('The ID of the parent object schema.'),
  description: z.string().optional().describe('The description for this object schema.'),
};

export class CreateObjectSchemaTool extends BaseMondayApiTool<typeof createObjectSchemaToolSchema> {
  name = 'create_object_schema';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Object Schema',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Create a new account-level object schema. Schemas define the structure and columns of boards.';
  }

  getInputSchema(): typeof createObjectSchemaToolSchema {
    return createObjectSchemaToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof createObjectSchemaToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables: CreateObjectSchemaMutationVariables = {
      name: input.name,
      parentId: input.parentId,
      description: input.description,
    };

    const res = await this.mondayApi.request<CreateObjectSchemaMutation>(createObjectSchemaMutation, variables);

    return {
      content: {
        message: `Object schema "${res.create_object_schema?.name}" successfully created`,
        schema_id: res.create_object_schema?.id,
        schema_name: res.create_object_schema?.name,
        revision: res.create_object_schema?.revision,
      },
    };
  }
}
