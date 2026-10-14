import { ToolOutputType, ToolType, ToolInputType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';
import { getGraphQLSchema } from '../../../monday-graphql/queries.graphql';
import { GetGraphQlSchemaQuery } from 'src/monday-graphql/generated/graphql/graphql';
import { z } from 'zod';

export const getGraphQLSchemaToolSchema = {
  random_string: z.string().describe('Dummy parameter for no-parameter tools').optional(),
  operationType: z
    .enum(['read', 'write'])
    .describe('Type of operation: "read" for queries, "write" for mutations')
    .optional(),
};

export class GetGraphQLSchemaTool extends BaseMondayApiTool<typeof getGraphQLSchemaToolSchema> {
  name = 'get_graphql_schema';
  type = ToolType.ALL_API;
  annotations = createMondayApiAnnotations({
    title: 'Get GraphQL Schema',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Fetch the monday.com GraphQL schema structure including query and mutation definitions. This tool returns available query fields, mutation fields, and a list of GraphQL types in the schema. You can filter results by operation type (read/write) to focus on either queries or mutations.';
  }

  getInputSchema(): typeof getGraphQLSchemaToolSchema {
    return getGraphQLSchemaToolSchema;
  }

  protected async executeInternal(
    input?: ToolInputType<typeof getGraphQLSchemaToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const res = await this.mondayApi.request<GetGraphQlSchemaQuery>(getGraphQLSchema);
      const operationType = input?.operationType;

      const schemaAny = res.__schema as any;

      const queryFieldsData =
        operationType !== 'write'
          ? (res.queryType?.fields?.map((field) => ({ name: field.name, description: field.description ?? null })) ?? [])
          : undefined;

      const mutationFieldsData =
        operationType !== 'read'
          ? (res.mutationType?.fields?.map((field) => ({ name: field.name, description: field.description ?? null })) ?? [])
          : undefined;

      const typesData =
        schemaAny?.types
          ?.filter((type: any) => type.name && !type.name.startsWith('__'))
          .map((type: any) => ({ name: type.name, kind: type.kind ?? 'unknown' })) ?? [];

      return {
        content: {
          message: 'GraphQL schema retrieved',
          ...(queryFieldsData !== undefined && { query_fields: queryFieldsData }),
          ...(mutationFieldsData !== undefined && { mutation_fields: mutationFieldsData }),
          types: typesData,
        },
      };
    } catch (error) {
      return {
        content: `Error fetching GraphQL schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
