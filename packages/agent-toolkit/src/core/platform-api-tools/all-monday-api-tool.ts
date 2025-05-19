import { z } from 'zod';
import { BaseMondayApiTool, MondayApiToolContext } from './base-monday-api-tool';
import { ToolInputType, ToolOutputType, ToolType } from '../tool';
import { buildClientSchema, GraphQLSchema, parse, validate } from 'graphql';
import { ApiClient } from '@mondaydotcomorg/api';
import fetch from 'cross-fetch';

const schemaCache: Record<string, GraphQLSchema> = {};

let mondayApiClient: ApiClient | null = null;

async function loadSchema(version: string): Promise<GraphQLSchema> {
  if (schemaCache[version]) {
    return schemaCache[version];
  }

  try {
    const url = `https://api.monday.com/v2/get_schema?version=${version}`;

    const response = await fetch(url);
    const { data } = await response.json();

    const schema = buildClientSchema(data);
    schemaCache[version] = schema;

    return schema;
  } catch (error) {
    throw new Error(`Failed to load GraphQL schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function validateOperation(queryString: string, version: string): Promise<string[]> {
  const schema = await loadSchema(version);
  const documentAST = parse(queryString);
  const errors = validate(schema, documentAST);
  return errors.map((error) => error.message);
}

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

  constructor(mondayApi: ApiClient, context?: MondayApiToolContext) {
    super(mondayApi, context);
    mondayApiClient = this.mondayApi;
  }

  getDescription(): string {
    return 'Execute any Monday.com API operation by generating GraphQL queries and mutations dynamically';
  }

  getInputSchema(): typeof allMondayApiToolSchema {
    return allMondayApiToolSchema;
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

      const validationErrors = await validateOperation(query, apiVersion);
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
