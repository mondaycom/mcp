import { z } from 'zod';
import { GetBoardSchemaQuery, GetBoardSchemaQueryVariables } from '../../../monday-graphql/generated/graphql';
import { getBoardSchema } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool } from './base-monday-api-tool';

export const getBoardSchemaToolSchema = {
  boardId: z.number().describe('The id of the board to get the schema of'),
};

export class GetBoardSchemaTool extends BaseMondayApiTool<typeof getBoardSchemaToolSchema | undefined> {
  name = 'get_board_schema';
  type = ToolType.READ;

  getDescription(): string {
    return 'Get board schema (columns and groups) by board id';
  }

  getInputSchema(): typeof getBoardSchemaToolSchema | undefined {
    if (this.context?.boardId) {
      return undefined;
    }

    return getBoardSchemaToolSchema;
  }

  async execute(input: ToolInputType<typeof getBoardSchemaToolSchema | undefined>): Promise<ToolOutputType<never>> {
    const boardId = this.context?.boardId ?? (input as ToolInputType<typeof getBoardSchemaToolSchema>).boardId;
    const variables: GetBoardSchemaQueryVariables = {
      boardId: boardId.toString(),
    };

    const res = await this.mondayApi.request<GetBoardSchemaQuery>(getBoardSchema, variables);

    return {
      content: `The current schema of the board ${boardId} is: 
    \n\nColumns:\n ${res.boards?.[0]?.columns?.map((column) => `Id - ${column?.id}\n Title - ${column?.title}\n Type - ${column?.type}`).join('\n')}
    \n\nGroups:\n ${res.boards?.[0]?.groups?.map((group) => `Id - ${group?.id}\n Title - ${group?.title}`).join('\n')}`,
    };
  }
}
