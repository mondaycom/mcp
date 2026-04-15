import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  GetObjectSchemasQuery,
  GetObjectSchemasQueryVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { getObjectSchemasQuery } from './get-object-schemas-tool.graphql';

export const getObjectSchemasToolSchema = {
  ids: z.array(z.string()).optional().describe('List of object schema IDs to retrieve. Mutually exclusive with names.'),
  names: z.array(z.string()).optional().describe('List of object schema names to retrieve. Mutually exclusive with ids.'),
  limit: z.number().optional().describe('Number of results per page. Default 25, max 100.'),
  page: z.number().optional().describe('1-indexed page number. Default 1.'),
  excludeCreatedByMonday: z
    .boolean()
    .optional()
    .describe('If true, returns only user-created schemas and excludes default monday.com schemas.'),
};

export class GetObjectSchemasTool extends BaseMondayApiTool<typeof getObjectSchemasToolSchema> {
  name = 'get_object_schemas';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Object Schemas',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Retrieve account-level object schemas by their IDs or names. Schemas define the structure and columns of boards. Provide ids or names to filter specific schemas. Omit both to list all schemas (paginated).';
  }

  getInputSchema(): typeof getObjectSchemasToolSchema {
    return getObjectSchemasToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getObjectSchemasToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables: GetObjectSchemasQueryVariables = {
      ids: input.ids,
      names: input.names,
      limit: input.limit,
      page: input.page,
      excludeCreatedByMonday: input.excludeCreatedByMonday,
    };

    const res = await this.mondayApi.request<GetObjectSchemasQuery>(getObjectSchemasQuery, variables);

    const schemas = res.get_object_schemas ?? [];

    return {
      content: {
        message: `Retrieved ${schemas.length} object schema(s)`,
        schemas,
      },
    };
  }
}
