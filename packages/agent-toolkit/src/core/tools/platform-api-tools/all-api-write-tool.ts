import { parse, OperationDefinitionNode } from 'graphql';
import { AllMondayApiTool, allMondayApiToolSchema } from './all-monday-api-tool';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { createMondayApiAnnotations, MondayApiToolContext } from './base-monday-api-tool';
import { ApiClient } from '@mondaydotcomorg/api';

export class AllApiWriteTool extends AllMondayApiTool {
  name = 'all_api_write';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Run Mutation on the monday.com API',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  });

  constructor(mondayApi: ApiClient, context?: MondayApiToolContext) {
    super(mondayApi, context);
  }

  getDescription(): string {
    return 'Execute GraphQL mutations against the monday.com API to create, update, or delete data. Only mutations are accepted — queries are rejected with an error before the request is sent. Use this tool when you need to make changes to monday.com data. Use get_graphql_schema and get_type_details tools first to understand the schema before crafting your mutation.';
  }

  protected async executeInternal(input: ToolInputType<typeof allMondayApiToolSchema>): Promise<ToolOutputType<never>> {
    const document = parse(input.query);
    const operation = document.definitions.find(
      (d): d is OperationDefinitionNode => d.kind === 'OperationDefinition',
    );

    if (operation && operation.operation !== 'mutation') {
      throw new Error('all_api_write only accepts mutations. Read queries are not allowed — use all_api_read instead.');
    }

    return super.executeInternal(input);
  }
}
