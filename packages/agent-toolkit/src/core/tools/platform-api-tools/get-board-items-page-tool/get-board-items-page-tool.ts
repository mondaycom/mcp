import { z } from 'zod';
import { GetBoardItemsPageQuery, GetBoardItemsPageQueryVariables, ItemsQueryOperator, ItemsQueryRuleOperator } from '../../../../monday-graphql/generated/graphql';
import { getBoardItemsPage } from './get-board-items-page-tool.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 500;
const MIN_LIMIT = 1;

export const getBoardItemsPageToolSchema = {
  boardId: z.number().describe('The id of the board to get items from'),
  itemIds: z.array(z.number()).optional().describe('The ids of the items to get. The count of items should be less than 100.'),
  limit: z.number().min(MIN_LIMIT).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT).describe('The number of items to get'),
  cursor: z.string().optional().describe('The cursor to get the next page of items, use the nextCursor from the previous response. If the nextCursor was null, it means there are no more items to get'),
  includeColumns: z.boolean().optional().default(false).describe('Whether to include column values in the response'),
  filters: z.array(z.object({
    columnId: z.number().describe('The id of the column to filter by'),
    compareAttribute: z.string().optional().describe('The attribute to compare the value to'),
    compareValue: z.any().describe('The value to compare the attribute to. This can be a string or index value depending on the column type.'),
    operator: z.nativeEnum(ItemsQueryRuleOperator).optional().default(ItemsQueryRuleOperator.AnyOf).describe('The operator to use for the filter'),
  })).optional().describe('The configuration of filters to apply on the items'),
  filtersOperator: z.nativeEnum(ItemsQueryOperator).optional().default(ItemsQueryOperator.And).describe('The operator to use for the filters'),
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
      `Use the 'nextCursor' parameter from the response to get the next page of results when 'has_more' is true.`;
  }


  getInputSchema(): GetBoardItemsPageToolInput {
    return getBoardItemsPageToolSchema;
  }
  
  protected async executeInternal(input: ToolInputType<GetBoardItemsPageToolInput>): Promise<ToolOutputType<never>> {
    const variables: GetBoardItemsPageQueryVariables = {
      boardId: input.boardId.toString(),
      limit: input.limit,
      cursor: input.cursor,
      includeColumns: input.includeColumns,
      queryParams: {
        ids: input.itemIds?.map(id => id.toString()),
        operator: input.filtersOperator,
        rules: input.filters?.map(filter => ({
          column_id: filter.columnId.toString(),
          compare_value: filter.compareValue,
          operator: filter.operator,
          compare_attribute: filter.compareAttribute,
        }))
      }
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
        nextCursor: itemsPage?.cursor || null,
        count: items.length,
      },
    };

    return {
      content: JSON.stringify(result, null, 2),
    };
  }
}
