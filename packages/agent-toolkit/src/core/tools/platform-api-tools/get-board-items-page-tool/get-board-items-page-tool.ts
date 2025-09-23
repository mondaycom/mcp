import { z } from 'zod';
import { GetBoardItemsPageQuery, GetBoardItemsPageQueryVariables } from '../../../../monday-graphql/generated/graphql';
import { getBoardItemsPage } from './queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

export const getBoardItemsPageToolSchema = {
  boardId: z.number(),
  limit: z.number().min(1).max(1000).optional(),
  cursor: z.string().optional(),
  includeColumns: z.boolean().optional(),
};

export type GetBoardItemsPageToolInput = typeof getBoardItemsPageToolSchema;

export class GetBoardItemsPageTool extends BaseMondayApiTool<GetBoardItemsPageToolInput> {
  name = 'get_board_items_page';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Board Items Page',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Get all items from a monday.com board with pagination support and optional column values. ` +
      `Returns structured JSON with item details, creation/update timestamps, and pagination info. ` +
      `Use the 'cursor' parameter from the response to get the next page of results when 'has_more' is true.`;
  }


  getInputSchema(): GetBoardItemsPageToolInput {
    return getBoardItemsPageToolSchema;
  }
  
  protected async executeInternal(input: ToolInputType<GetBoardItemsPageToolInput>): Promise<ToolOutputType<never>> {
    const variables: GetBoardItemsPageQueryVariables = {
      boardId: input.boardId.toString(),
      limit: input.limit ?? 25,
      cursor: input.cursor,
      includeColumns: input.includeColumns ?? false,
    };

    const res = await this.mondayApi.request<GetBoardItemsPageQuery>(getBoardItemsPage, variables);

    const board = res.boards?.[0];
    const itemsPage = board?.items_page;
    const items = itemsPage?.items || [];

    const result = {
      board: {
        id: board?.id,
        name: board?.name,
      },
      items: items.map((item: any) => {
        const itemResult: any = {
          id: item.id,
          name: item.name,
          created_at: item.created_at,
          updated_at: item.updated_at,
        };

        if (input.includeColumns && item.column_values) {
          itemResult.column_values = {};
          item.column_values.forEach((cv: any) => {
            if (cv.value) {
              try {
                // Try to parse the value as JSON, fallback to raw value
                itemResult.column_values[cv.id] = JSON.parse(cv.value);
              } catch {
                // If not valid JSON, use the raw value
                itemResult.column_values[cv.id] = cv.value;
              }
            } else {
              // If no value, use the text or null
              itemResult.column_values[cv.id] = cv.text || null;
            }
          });
        }

        return itemResult;
      }),
      pagination: {
        has_more: !!itemsPage?.cursor,
        cursor: itemsPage?.cursor || null,
        count: items.length,
      },
    };

    return {
      content: JSON.stringify(result, null, 2),
    };
  }
}
