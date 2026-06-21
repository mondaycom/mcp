import { parse, OperationDefinitionNode } from 'graphql';
import { AllMondayApiTool, allMondayApiToolSchema } from './all-monday-api-tool';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { createMondayApiAnnotations, MondayApiToolContext } from './base-monday-api-tool';
import { ApiClient } from '@mondaydotcomorg/api';

export class AllApiReadTool extends AllMondayApiTool {
  name = 'all_api_read';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Run read-only Query on the monday.com API',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  constructor(mondayApi: ApiClient, context?: MondayApiToolContext) {
    super(mondayApi, context);
  }

  getDescription(): string {
    return 'Execute read-only GraphQL queries against the monday.com API. Only queries are accepted — mutations are rejected with an error before the request is sent. Use this tool to fetch data without making any changes. Use get_graphql_schema and get_type_details tools first to understand the schema before crafting your query.';
  }

  protected async executeInternal(input: ToolInputType<typeof allMondayApiToolSchema>): Promise<ToolOutputType<never>> {
    const document = parse(input.query);
    const operation = document.definitions.find(
      (d): d is OperationDefinitionNode => d.kind === 'OperationDefinition',
    );

    if (operation?.operation === 'mutation') {
      throw new Error('all_api_read only accepts read queries. Mutations are not allowed — use all_api_write instead.');
    }

    return super.executeInternal(input);
  }
}
