import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  GetSchemasQuery,
  GetSchemasQueryVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
<<<<<<< HEAD
import { getSchemasQueryDev } from './get-schemas-tool.graphql.dev';
=======
import { getSchemasMutationDev } from './get-schemas-tool.graphql.dev';
>>>>>>> 770d725 (feat(agent-toolkit): add data-structure schema management tools (v5.2.0))

export const getSchemasToolSchema = {
  ids: z
    .array(z.string())
    .optional()
    .describe('List of schema IDs to retrieve. Mutually exclusive with names.'),
  names: z
    .array(z.string())
    .optional()
    .describe('List of schema names to retrieve. Mutually exclusive with ids.'),
  limit: z.number().optional().describe('Number of results per page. Default 25, max 100.'),
  page: z.number().optional().describe('1-indexed page number. Default 1.'),
};

export class GetSchemasTool extends BaseMondayApiTool<typeof getSchemasToolSchema> {
  name = 'get_schemas';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Schemas',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
<<<<<<< HEAD
    return 'Retrieve account-level schemas by their IDs or names. Schemas define the structure and columns of boards. Provide ids or names to filter specific schemas. Omit both to list all schemas (paginated).';
=======
    return 'Retrieve account-level schemas by their IDs or names. Schemas define the structure and columns of boards. Provide ids or names to filter specific schemas; omit both to list all schemas (paginated).';
>>>>>>> 770d725 (feat(agent-toolkit): add data-structure schema management tools (v5.2.0))
  }

  getInputSchema(): typeof getSchemasToolSchema {
    return getSchemasToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getSchemasToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables: GetSchemasQueryVariables = {
      ids: input.ids,
      names: input.names,
      limit: input.limit,
      page: input.page,
    };

<<<<<<< HEAD
    const res = await this.mondayApi.request<GetSchemasQuery>(getSchemasQueryDev, variables, {
=======
    const res = await this.mondayApi.request<GetSchemasQuery>(getSchemasMutationDev, variables, {
>>>>>>> 770d725 (feat(agent-toolkit): add data-structure schema management tools (v5.2.0))
      versionOverride: 'dev',
    });

    const schemas = res.get_schemas ?? [];

    return {
      content: {
        message: `Retrieved ${schemas.length} schema(s)`,
        schemas,
      },
    };
  }
}
