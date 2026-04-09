import { z } from 'zod';
import { GetBoardSchemaQuery, GetBoardSchemaQueryVariables } from 'src/monday-graphql/generated/graphql/graphql';
import { getBoardSchema } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const getBoardSchemaToolSchema = {
  boardId: z.number().describe('The id of the board to get the schema of'),
};

export class GetBoardSchemaTool extends BaseMondayApiTool<typeof getBoardSchemaToolSchema | undefined> {
  name = 'get_board_schema';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Board Schema',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Get board schema (columns and groups) by board id';
  }

  getInputSchema(): typeof getBoardSchemaToolSchema | undefined {
    if (this.context?.boardId) {
      return undefined;
    }

    return getBoardSchemaToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getBoardSchemaToolSchema | undefined>,
  ): Promise<ToolOutputType<never>> {
    const boardId = this.context?.boardId ?? (input as ToolInputType<typeof getBoardSchemaToolSchema>).boardId;
    const variables: GetBoardSchemaQueryVariables = {
      boardId: boardId.toString(),
    };

    const res = await this.mondayApi.request<GetBoardSchemaQuery>(getBoardSchema, variables);

    return {
      content: {
        message: 'Board schema retrieved',
        board_id: boardId,
        columns:
          res.boards?.[0]?.columns?.map((column) => ({ id: column?.id, title: column?.title, type: column?.type })) ??
          [],
        groups: res.boards?.[0]?.groups?.map((group) => ({ id: group?.id, title: group?.title })) ?? [],
      },
    };
  }
}
