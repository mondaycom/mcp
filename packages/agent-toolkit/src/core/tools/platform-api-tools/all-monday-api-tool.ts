import { z } from 'zod';
import { BaseMondayApiTool, MondayApiToolContext, createMondayApiAnnotations } from './base-monday-api-tool';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import {
  buildClientSchema,
  DocumentNode,
  GraphQLSchema,
  IntrospectionQuery,
  OperationTypeNode,
  parse,
  validate,
} from 'graphql';
import { ApiClient } from '@mondaydotcomorg/api';
import { introspectionQuery } from '../../../monday-graphql';
import { API_VERSION } from '../../../utils/version.utils';
import { rethrowWithContext, ToolValidationError, INVALID_VARIABLES_JSON_CODE, GRAPHQL_VALIDATION_FAILED_CODE, GRAPHQL_SCHEMA_LOAD_FAILED_CODE } from '../../../utils/error.utils';
import { withPublicSchemaHeader } from './utils/api-client.utils';

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

  constructor(mondayApi: ApiClient | (() => ApiClient), context?: MondayApiToolContext) {
    super(typeof mondayApi === 'function' ? () => withPublicSchemaHeader(mondayApi()) : withPublicSchemaHeader(mondayApi), context);
  }

  getDescription(): string {
    return 'Execute any monday.com API operation by generating GraphQL queries and mutations dynamically. Make sure you ask only for the fields you need and nothing more. When providing the query/mutation - use get_graphql_schema and get_type_details tools first to understand the schema before crafting your query.';
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
      throw new ToolValidationError(
        `Failed to load GraphQL schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
        GRAPHQL_SCHEMA_LOAD_FAILED_CODE,
      );
    }
  }

  protected countGraphqlOperations(documentAST: DocumentNode): {
    graphql_queries: Record<string, number>;
    graphql_mutations: Record<string, number>;
  } {
    const graphql_queries: Record<string, number> = {};
    const graphql_mutations: Record<string, number> = {};

    for (const definition of documentAST.definitions) {
      if (definition.kind !== 'OperationDefinition') {
        continue;
      }

      const counts =
        definition.operation === OperationTypeNode.MUTATION
          ? graphql_mutations
          : definition.operation === OperationTypeNode.QUERY
            ? graphql_queries
            : null;

      if (!counts) {
        continue;
      }

      for (const selection of definition.selectionSet.selections) {
        if (selection.kind !== 'Field') {
          continue;
        }

        const fieldKey = selection.name.value;
        counts[fieldKey] = (counts[fieldKey] ?? 0) + 1;
      }
    }

    return { graphql_queries, graphql_mutations };
  }

  protected recordGraphqlOperationCounts(documentAST: DocumentNode): void {
    const { graphql_queries, graphql_mutations } = this.countGraphqlOperations(documentAST);
    this.sessionContext.metadata ??= {};
    this.sessionContext.metadata.graphql_queries = graphql_queries;
    this.sessionContext.metadata.graphql_mutations = graphql_mutations;
  }

  private async validateOperation(documentAST: DocumentNode, version: string): Promise<string[]> {
    const schema = await this.loadSchema(version);
    const errors = validate(schema, documentAST);
    return errors.map((error) => error.message);
  }

  protected async executeInternal(input: ToolInputType<typeof allMondayApiToolSchema>): Promise<ToolOutputType<never>> {
    const { query, variables } = input;

    let parsedVariables = {};
    try {
      parsedVariables = JSON.parse(variables);
    } catch (error) {
      throw new ToolValidationError(
        `Error parsing variables: ${error instanceof Error ? error.message : 'Unknown error'}`,
        INVALID_VARIABLES_JSON_CODE,
      );
    }

    const documentAST = parse(query);
    this.recordGraphqlOperationCounts(documentAST);

    const validationErrors = await this.validateOperation(documentAST, this.context?.apiVersion ?? API_VERSION);
    if (validationErrors.length > 0) {
      throw new ToolValidationError(validationErrors.join(', '), GRAPHQL_VALIDATION_FAILED_CODE);
    }

    try {
      const data = await this.mondayApi.request<GraphQLResponse>(query, parsedVariables);
      return {
        content: data,
      };
    } catch (error) {
      rethrowWithContext(error, 'execute GraphQL operation');
    }
  }
}
