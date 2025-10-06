import { z } from 'zod';

import { GetBoardItemsPageQuery, GetBoardItemsPageQueryVariables, ItemsOrderByDirection, ItemsQueryOperator, ItemsQueryRuleOperator, SmartSearchBoardItemIdsQuery, SmartSearchBoardItemIdsQueryVariables } from '../../../../monday-graphql/generated/graphql';
import { getBoardItemsPage, smartSearchGetBoardItemIds } from './get-board-items-page-tool.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 500;
const MIN_LIMIT = 1;

export const getBoardItemsPageToolSchema = {
  boardId: z.number().describe('The id of the board to get items from'),
  itemIds: z.array(z.number()).optional().describe('The ids of the items to get. The count of items should be less than 100.'),
  searchTerm: z.string().optional().describe(`
    The search term to use for the search.
    - Use this when: the user provides a vague, incomplete, or approximate search term (e.g., “marketing campaign”, “John’s task”, “budget-related”), and there isn’t a clear exact compare value for a specific field.
    - Do not use this when: the user specifies an exact value that maps directly to a column comparison (e.g., name contains "marketing campaign", status = "Done", priority = "High", owner = "Daniel"). In these cases, prefer structured compare filters.
  `),
  limit: z.number().min(MIN_LIMIT).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT).describe('The number of items to get'),
  cursor: z.string().optional().describe('The cursor to get the next page of items, use the nextCursor from the previous response. If the nextCursor was null, it means there are no more items to get'),
  includeColumns: z.boolean().optional().default(false).describe('Whether to include column values in the response'),

  filtersStringified: z.string().optional().describe('**ONLY FOR MICROSOFT COPILOT**: The filters to apply on the items. This is a stringified JSON object of "filters" field. Read "filters" field description for details how to use it.'),
  filters: z.array(z.object({
    columnId: z.string().describe('The id of the column to filter by'),
    compareAttribute: z.string().optional().describe('The attribute to compare the value to'),
    compareValue: z.any().describe('The value to compare the attribute to. This can be a string or index value depending on the column type.'),
    operator: z.nativeEnum(ItemsQueryRuleOperator).optional().default(ItemsQueryRuleOperator.AnyOf).describe('The operator to use for the filter'),
  })).optional().describe('The configuration of filters to apply on the items. Before sending the filters, use get_board_info tool to check "Filtering Guidelines" section for filtering by the column.'),
  filtersOperator: z.nativeEnum(ItemsQueryOperator).optional().default(ItemsQueryOperator.And).describe('The operator to use for the filters'),
  
  columnIds: z.array(z.string()).optional().describe('The ids of the columns to get, can be used to reduce the response size when user asks for specific columns. Works only when includeColumns is true. If not provided, all columns will be returned'),
  orderByStringified: z.string().optional().describe('**ONLY FOR MICROSOFT COPILOT**: The order by to apply on the items. This is a stringified JSON object of "orderBy" field. Read "orderBy" field description for details how to use it.'),
  orderBy: z.array(z.object({
    columnId: z.string().describe('The id of the column to order by'),
    direction: z.nativeEnum(ItemsOrderByDirection).optional().default(ItemsOrderByDirection.Asc).describe('The direction to order by'),
  })).optional().describe('The columns to order by, will control the order of the items in the response'),

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

  private parseAndAssignJsonField(input: ToolInputType<GetBoardItemsPageToolInput>, jsonKey: keyof ToolInputType<GetBoardItemsPageToolInput>, stringifiedJsonKey: keyof ToolInputType<GetBoardItemsPageToolInput>) {
    if(input[stringifiedJsonKey] && !input[jsonKey]) {
      try {
        (input as any)[jsonKey] = JSON.parse(input[stringifiedJsonKey] as string);
      } catch {
        throw new Error(`${stringifiedJsonKey} is not a valid JSON`);
      }
    }
  }
  
  protected async executeInternal(input: ToolInputType<GetBoardItemsPageToolInput>): Promise<ToolOutputType<never>> {
    // Passing filters + cursor returns an error as cursor has them encoded in it
    const canIncludeFilters = !input.cursor;

    if(canIncludeFilters && input.searchTerm) {
      input.itemIds = await this.getItemIdsFromSmartSearchAsync(input);

      if(input.itemIds!.length === 0) {
        return {
          content: `No items found matching the specified searchTerm`,
        };
      }
    }

    const variables: GetBoardItemsPageQueryVariables = {
      boardId: input.boardId.toString(),
      limit: input.limit,
      cursor: input.cursor,
      includeColumns: input.includeColumns,
      columnIds: input.columnIds
    };

    this.parseAndAssignJsonField(input, 'filters', 'filtersStringified');
    this.parseAndAssignJsonField(input, 'orderBy', 'orderByStringified');

    if(canIncludeFilters && (input.itemIds || input.filters || input.orderBy)) { 
      variables.queryParams = {
        ids: input.itemIds?.map(id => id.toString()),
        operator: input.filtersOperator,
        rules: input.filters?.map(filter => ({
          column_id: filter.columnId.toString(),
          compare_value: filter.compareValue,
          operator: filter.operator,
          compare_attribute: filter.compareAttribute,
        })),
        order_by: input.orderBy?.map(orderBy => ({
          column_id: orderBy.columnId,
          direction: orderBy.direction,
        }))
      }
    }

    const res = await this.mondayApi.request<GetBoardItemsPageQuery>(getBoardItemsPage, variables);
    const result = this.mapResult(res, input);

    return {
      content: JSON.stringify(result, null, 2),
    };
  }

  private mapResult(response: GetBoardItemsPageQuery, input: ToolInputType<GetBoardItemsPageToolInput>): any {
    const board = response.boards?.[0];
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

    return result;
  }

  private async getItemIdsFromSmartSearchAsync(input: ToolInputType<GetBoardItemsPageToolInput>): Promise<number[]> {
    const smartSearchVariables: SmartSearchBoardItemIdsQueryVariables = {
      boardId: input.boardId.toString(),
      searchTerm: input.searchTerm!,
    };

    const smartSearchRes = await this.mondayApi.request<SmartSearchBoardItemIdsQuery>(smartSearchGetBoardItemIds, smartSearchVariables);
    
    const itemIdsFromSmartSearch = smartSearchRes.search_items?.results?.map(result => Number(result.data.id)) ?? [];

    const initialItemIds = input.itemIds ?? [];
    
    if(initialItemIds.length === 0) {
      return itemIdsFromSmartSearch;
    }

    const allowedIds = new Set<number>(initialItemIds);
    return itemIdsFromSmartSearch.filter(id => allowedIds.has(id));
  }
}
