import { parse, getOperationAST, OperationTypeNode } from 'graphql';
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
    return 'Execute GraphQL mutations against the monday.com API to create, update, or delete data. Only mutations are accepted — queries are rejected with an error before the request is sent. Use get_graphql_schema and get_type_details tools first to understand the schema before crafting your mutation.';
  }

  protected async executeInternal(input: ToolInputType<typeof allMondayApiToolSchema>): Promise<ToolOutputType<never>> {
    const documentAST = parse(input.query);
    this.recordGraphqlOperationCounts(documentAST);

    const operation = getOperationAST(documentAST);

    if (operation && operation.operation !== OperationTypeNode.MUTATION) {
      throw new Error('all_api_write only accepts mutations. Read queries are not allowed.');
    }

    return super.executeInternal(input);
  }
}
