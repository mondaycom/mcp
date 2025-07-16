import { ToolOutputType, ToolType, ToolInputType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';
import { getGraphQLSchema } from '../../../monday-graphql/queries.graphql';
import { GetGraphQlSchemaQuery } from '../../../monday-graphql/generated/graphql';
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
    return 'Fetch the Monday.com GraphQL schema structure including query and mutation definitions. This tool returns available query fields, mutation fields, and a list of GraphQL types in the schema. You can filter results by operation type (read/write) to focus on either queries or mutations.';
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

      const queryFields =
        res.queryType?.fields
          ?.map((field) => `- ${field.name}${field.description ? `: ${field.description}` : ''}`)
          .join('\n') || 'No query fields found';

      const mutationFields =
        res.mutationType?.fields
          ?.map((field) => `- ${field.name}${field.description ? `: ${field.description}` : ''}`)
          .join('\n') || 'No mutation fields found';

      const schemaAny = res.__schema as any;
      const typesList =
        schemaAny?.types
          ?.filter((type: any) => type.name && !type.name.startsWith('__')) // Filter out introspection types
          .map((type: any) => `- ${type.name} (${type.kind || 'unknown'})`)
          .join('\n') || 'No types found';

      // Build response based on operation type
      let formattedResponse = '## GraphQL Schema\n';

      if (!operationType || operationType === 'read') {
        formattedResponse += `- Query Type: ${res.__schema?.queryType?.name}\n\n`;
        formattedResponse += `## Query Fields\n${queryFields}\n\n`;
      }

      if (!operationType || operationType === 'write') {
        formattedResponse += `- Mutation Type: ${res.__schema?.mutationType?.name}\n\n`;
        formattedResponse += `## Mutation Fields\n${mutationFields}\n\n`;
      }

      formattedResponse += `## Available Types\n${typesList}\n\n`;
      formattedResponse += `To get detailed information about a specific type, use the get_type_details tool with the type name.\nFor example: get_type_details(typeName: "Board") to see Board type details.`;

      return {
        content: formattedResponse,
      };
    } catch (error) {
      return {
        content: `Error fetching GraphQL schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
