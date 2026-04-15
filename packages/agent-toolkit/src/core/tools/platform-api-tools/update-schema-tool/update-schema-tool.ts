import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  UpdateSchemaMutation,
  UpdateSchemaMutationVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { updateSchemaMutationDev } from './update-schema-tool.graphql.dev';

export const updateSchemaToolSchema = {
  id: z.string().describe('The ID of the schema to update.'),
  revision: z
    .number()
    .int()
    .describe('Current revision number of the schema, used for optimistic locking. Retrieve via get_schemas.'),
  parentId: z.string().optional().describe('The ID of the new parent schema.'),
  description: z.string().optional().describe('New description for the schema.'),
};

export class UpdateSchemaTool extends BaseMondayApiTool<typeof updateSchemaToolSchema> {
  name = 'update_schema';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update Schema',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Update an account-level schema. Requires the current revision number for optimistic locking — retrieve it first via get_schemas.';
  }

  getInputSchema(): typeof updateSchemaToolSchema {
    return updateSchemaToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof updateSchemaToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables: UpdateSchemaMutationVariables = {
      id: input.id,
      revision: input.revision,
      parentId: input.parentId,
      description: input.description,
    };

    const res = await this.mondayApi.request<UpdateSchemaMutation>(updateSchemaMutationDev, variables, {
      versionOverride: 'dev',
    });

    return {
      content: {
        message: `Schema "${res.update_schema?.name}" successfully updated`,
        entity_id: res.update_schema?.id,
        entity_name: res.update_schema?.name,
        revision: res.update_schema?.revision,
      },
    };
  }
}
