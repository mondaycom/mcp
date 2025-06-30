import { z } from 'zod';
import { BaseMondayApiTool, MondayApiToolContext, createMondayApiAnnotations } from './base-monday-api-tool';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { buildClientSchema, GraphQLSchema, IntrospectionQuery, parse, validate } from 'graphql';
import { ApiClient } from '@mondaydotcomorg/api';
import { introspectionQuery } from '../../../monday-graphql';

export const allMondayApiToolSchema = {
  query: z.string().describe('Custom GraphQL query/mutation. you need to provide the full query / mutation'),
  variables: z.string().describe('JSON string containing the variables for the GraphQL operation'),
};

interface GraphQLResponse {
  data?: unknown;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: string[];
  }>;
}

export class AllMondayApiTool extends BaseMondayApiTool<typeof allMondayApiToolSchema> {
  name = 'all_monday_api';
  type = ToolType.ALL_API;
  annotations = createMondayApiAnnotations({
    title: 'Run Query or Mutation on any monday.com API',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  });
  private static schemaCache: Record<string, GraphQLSchema> = {};

  constructor(mondayApi: ApiClient, context?: MondayApiToolContext) {
    super(mondayApi, context);
  }

  getDescription(): string {
    return 'Execute any Monday.com API operation by generating GraphQL queries and mutations dynamically. Make sure you ask only for the fields you need and nothing more. When providing the query/mutation - use get_graphql_schema and get_type_details tools first to understand the schema before crafting your query.';
  }

  getInputSchema(): typeof allMondayApiToolSchema {
    return allMondayApiToolSchema;
  }

  private async loadSchema(version: string): Promise<GraphQLSchema> {
    if (AllMondayApiTool.schemaCache[version]) {
      return AllMondayApiTool.schemaCache[version];
    }

    try {
      const response = await this.mondayApi.rawRequest<IntrospectionQuery>(introspectionQuery);
      const { data } = response;

      const schema = buildClientSchema(data);
      AllMondayApiTool.schemaCache[version] = schema;

      return schema;
    } catch (error) {
      throw new Error(`Failed to load GraphQL schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async validateOperation(queryString: string, version: string): Promise<string[]> {
    const schema = await this.loadSchema(version);
    const documentAST = parse(queryString);
    const errors = validate(schema, documentAST);
    return errors.map((error) => error.message);
  }

  async execute(input: ToolInputType<typeof allMondayApiToolSchema>): Promise<ToolOutputType<never>> {
    const { query, variables } = input;

    try {
      let parsedVariables = {};
      try {
        parsedVariables = JSON.parse(variables);
      } catch (error) {
        return {
          content: `Error parsing variables: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }

      const apiVersion = this.mondayApi.apiVersion;

      const validationErrors = await this.validateOperation(query, apiVersion);
      if (validationErrors.length > 0) {
        return {
          content: validationErrors.join(', '),
        };
      }

      const data = await this.mondayApi.request<GraphQLResponse>(query, parsedVariables);

      return {
        content: JSON.stringify(data),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (error instanceof Error && 'response' in error) {
        const clientError = error as any;
        if (clientError.response?.errors) {
          return {
            content: clientError.response.errors.map((e: any) => e.message).join(', '),
          };
        }
      }

      return {
        content: errorMessage,
      };
    }
  }
}
