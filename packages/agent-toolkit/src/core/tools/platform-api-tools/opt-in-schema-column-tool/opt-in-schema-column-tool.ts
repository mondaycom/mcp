import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  OptInSchemaColumnMutation,
  OptInSchemaColumnMutationVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { optInSchemaColumnMutationDev } from './opt-in-schema-column-tool.graphql.dev';

export const optInSchemaColumnToolSchema = {
  schemaId: z
    .string()
    .optional()
    .describe('The ID of the schema. Either schemaId or schemaName must be provided.'),
  schemaName: z
    .string()
    .optional()
    .describe('The name of the schema. Either schemaId or schemaName must be provided.'),
  columnId: z.string().describe('The ID of the column to set as opt-in by default.'),
};

export class OptInSchemaColumnTool extends BaseMondayApiTool<typeof optInSchemaColumnToolSchema> {
  name = 'opt_in_schema_column';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Opt In Schema Column',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Set a schema column to opt-in by default. The column will be automatically added to boards connected to this schema. Use opt_out_schema_column to reverse.';
  }

  getInputSchema(): typeof optInSchemaColumnToolSchema {
    return optInSchemaColumnToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof optInSchemaColumnToolSchema>,
  ): Promise<ToolOutputType<never>> {
<<<<<<< HEAD
    if (!input.schemaId && !input.schemaName) {
      throw new Error('Either schemaId or schemaName must be provided');
    }

=======
>>>>>>> 770d725 (feat(agent-toolkit): add data-structure schema management tools (v5.2.0))
    const variables: OptInSchemaColumnMutationVariables = {
      schemaId: input.schemaId,
      schemaName: input.schemaName,
      columnId: input.columnId,
    };

    const res = await this.mondayApi.request<OptInSchemaColumnMutation>(optInSchemaColumnMutationDev, variables, {
      versionOverride: 'dev',
    });

    return {
      content: {
        message: `Column "${input.columnId}" set to opt-in by default on schema "${res.opt_in_schema_column?.name}"`,
<<<<<<< HEAD
        schema_id: res.opt_in_schema_column?.id,
        schema_name: res.opt_in_schema_column?.name,
=======
        entity_id: res.opt_in_schema_column?.id,
        entity_name: res.opt_in_schema_column?.name,
>>>>>>> 770d725 (feat(agent-toolkit): add data-structure schema management tools (v5.2.0))
        revision: res.opt_in_schema_column?.revision,
      },
    };
  }
}
