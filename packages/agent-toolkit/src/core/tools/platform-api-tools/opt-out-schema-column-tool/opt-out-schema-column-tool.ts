import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  OptOutSchemaColumnMutation,
  OptOutSchemaColumnMutationVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { optOutSchemaColumnMutationDev } from './opt-out-schema-column-tool.graphql.dev';

export const optOutSchemaColumnToolSchema = {
  schemaId: z
    .string()
    .optional()
    .describe('The ID of the schema. Either schemaId or schemaName must be provided.'),
  schemaName: z
    .string()
    .optional()
    .describe('The name of the schema. Either schemaId or schemaName must be provided.'),
  columnId: z.string().describe('The ID of the column to set as opt-out by default.'),
};

export class OptOutSchemaColumnTool extends BaseMondayApiTool<typeof optOutSchemaColumnToolSchema> {
  name = 'opt_out_schema_column';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Opt Out Schema Column',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Set a schema column to opt-out by default. The column will not be automatically added to boards connected to this schema. Use opt_in_schema_column to reverse.';
  }

  getInputSchema(): typeof optOutSchemaColumnToolSchema {
    return optOutSchemaColumnToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof optOutSchemaColumnToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables: OptOutSchemaColumnMutationVariables = {
      schemaId: input.schemaId,
      schemaName: input.schemaName,
      columnId: input.columnId,
    };

    const res = await this.mondayApi.request<OptOutSchemaColumnMutation>(optOutSchemaColumnMutationDev, variables, {
      versionOverride: 'dev',
    });

    return {
      content: {
        message: `Column "${input.columnId}" set to opt-out by default on schema "${res.opt_out_schema_column?.name}"`,
        entity_id: res.opt_out_schema_column?.id,
        entity_name: res.opt_out_schema_column?.name,
        revision: res.opt_out_schema_column?.revision,
      },
    };
  }
}
