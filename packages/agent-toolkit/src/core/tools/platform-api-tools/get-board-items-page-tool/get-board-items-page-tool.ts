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
    columnId: z.string().describe('The id of the column to filter by'),
    compareAttribute: z.string().optional().describe('The attribute to compare the value to'),
    compareValue: z.any().describe('The value to compare the attribute to. This can be a string or index value depending on the column type.'),
    operator: z.nativeEnum(ItemsQueryRuleOperator).optional().default(ItemsQueryRuleOperator.AnyOf).describe('The operator to use for the filter'),
  })).optional().describe(`The configuration of filters to apply on the items. Before sending the filters, use get_board_info tool to check types of columns on a board.
    Then depending on the column type, you will filter, check out relevant API reference from list below to understand how to filter by the column.
    
    `),
  filtersOperator: z.nativeEnum(ItemsQueryOperator).optional().default(ItemsQueryOperator.And).describe('The operator to use for the filters'),
};

// *API References:*
//     - button - https://developer.monday.com/api-reference/docs/button
//     - checkbox - https://developer.monday.com/api-reference/docs/checkbox
//     - color_picker - https://developer.monday.com/api-reference/docs/color-picker
//     - board_relation - https://developer.monday.com/api-reference/docs/connect
//     - country - https://developer.monday.com/api-reference/docs/country
//     - creation_log - https://developer.monday.com/api-reference/docs/creation-log
//     - date - https://developer.monday.com/api-reference/docs/date
//     - dependency - https://developer.monday.com/api-reference/docs/dependency
//     - dropdown - https://developer.monday.com/api-reference/docs/dropdown
//     - email - https://developer.monday.com/api-reference/docs/email
//     - file - https://developer.monday.com/api-reference/docs/assets
//     - formula - https://developer.monday.com/api-reference/docs/formula
//     - hour - https://developer.monday.com/api-reference/docs/hour
//     - item_id - https://developer.monday.com/api-reference/docs/item-id
//     - last_updated - https://developer.monday.com/api-reference/docs/last-updated
//     - link - https://developer.monday.com/api-reference/docs/link
//     - location - https://developer.monday.com/api-reference/docs/location
//     - long_text - https://developer.monday.com/api-reference/docs/long-text-1
//     - mirror - https://developer.monday.com/api-reference/docs/mirror
//     - doc - https://developer.monday.com/api-reference/docs/document
//     - name - https://developer.monday.com/api-reference/docs/item-name
//     - numbers - https://developer.monday.com/api-reference/docs/number
//     - people - https://developer.monday.com/api-reference/docs/people
//     - phone - https://developer.monday.com/api-reference/docs/phone
//     - rating - https://developer.monday.com/api-reference/docs/rating
//     - status - https://developer.monday.com/api-reference/docs/status
//     - tags - https://developer.monday.com/api-reference/docs/tags
//     - text - https://developer.monday.com/api-reference/docs/text
//     - timeline - https://developer.monday.com/api-reference/docs/timeline
//     - time_tracking - https://developer.monday.com/api-reference/docs/time-tracking-1
//     - vote - https://developer.monday.com/api-reference/docs/vote
//     - week - https://developer.monday.com/api-reference/docs/week
//     - world_clock - https://developer.monday.com/api-reference/docs/world-clock

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
      includeColumns: input.includeColumns
    };

    if(input.itemIds || input.filters) { 
      variables.queryParams = {
        ids: input.itemIds?.map(id => id.toString()),
        operator: input.filtersOperator,
        rules: input.filters?.map(filter => ({
          column_id: filter.columnId.toString(),
          compare_value: filter.compareValue,
          operator: filter.operator,
          compare_attribute: filter.compareAttribute,
        }))
      }
    }

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
