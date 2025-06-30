import { z } from 'zod';
import { GetBoardItemsByNameQuery, GetBoardItemsByNameQueryVariables } from '../../../monday-graphql/generated/graphql';
import { getBoardItemsByName } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const getItemsToolSchema = {
  term: z.string(),
};

export const getItemsInBoardToolSchema = {
  boardId: z.number(),
  ...getItemsToolSchema,
};

export type GetItemsToolInput = typeof getItemsToolSchema | typeof getItemsInBoardToolSchema;

export class GetBoardItemsTool extends BaseMondayApiTool<GetItemsToolInput> {
  name = 'get_board_items_by_name';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Board Items',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Get items by board id and term';
  }

  getInputSchema(): GetItemsToolInput {
    if (this.context?.boardId) {
      return getItemsToolSchema;
    }

    return getItemsInBoardToolSchema;
  }

  async execute(input: ToolInputType<GetItemsToolInput>): Promise<ToolOutputType<never>> {
    const boardId = this.context?.boardId ?? (input as ToolInputType<typeof getItemsInBoardToolSchema>).boardId;
    const variables: GetBoardItemsByNameQueryVariables = {
      boardId: boardId.toString(),
      term: input.term,
    };

    const res = await this.mondayApi.request<GetBoardItemsByNameQuery>(getBoardItemsByName, variables);

    // TODO: support pagination
    return {
      content: `Items ${res.boards?.[0]?.items_page?.items?.map((item) => `name: ${item.name}, id: ${item.id}`).join(', ')} successfully fetched`,
    };
  }
}
