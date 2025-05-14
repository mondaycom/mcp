import { ToolOutputType, ToolType } from '../tool';
import { BaseMondayApiTool } from './base-monday-api-tool';
import { getGraphQLSchema } from '../../monday-graphql/queries.graphql';
import { GetGraphQlSchemaQuery } from '../../monday-graphql/generated/graphql';
import { z } from 'zod';

export const getGraphQLSchemaToolSchema = {
  random_string: z.string().describe('Dummy parameter for no-parameter tools').optional(),
};

export class GetGraphQLSchemaTool extends BaseMondayApiTool<typeof getGraphQLSchemaToolSchema> {
  name = 'get_graphql_schema';
  type = ToolType.ALL_API;

  getDescription(): string {
    return 'Fetch the Monday.com GraphQL schema structure including query and mutation definitions';
  }

  getInputSchema(): typeof getGraphQLSchemaToolSchema {
    return getGraphQLSchemaToolSchema;
  }

  async execute(): Promise<ToolOutputType<never>> {
    try {
      const res = await this.mondayApi.request<GetGraphQlSchemaQuery>(getGraphQLSchema);

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

      const formattedResponse = `
## GraphQL Schema
- Query Type: ${res.__schema?.queryType?.name}
- Mutation Type: ${res.__schema?.mutationType?.name}

## Query Fields
${queryFields}

## Mutation Fields
${mutationFields}

## Available Types
${typesList}

To get detailed information about a specific type, use the get_type_details tool with the type name.
For example: get_type_details(typeName: "Board") to see Board type details.
`;

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
