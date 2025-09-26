import { z } from 'zod';
import { GetBoardItemsPageQuery, GetBoardItemsPageQueryVariables, ItemsOrderByDirection, ItemsQueryOperator, ItemsQueryRuleOperator, SmartSearchBoardItemIdsQuery, SmartSearchBoardItemIdsQueryVariables } from '../../../../monday-graphql/generated/graphql';
import { getBoardItemsPage, smartSearchGetBoardItemIds } from './get-board-items-page-tool.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 500;
const MIN_LIMIT = 1;

enum SearchTermType {
  NameContains = 'name_contains_text',
  NameNotContains = 'name_not_contains_text',
  GeneralSearch = 'general_search',
}

export const getBoardItemsPageToolSchema = {
  boardId: z.number().describe('The id of the board to get items from'),
  itemIds: z.array(z.number()).optional().describe('The ids of the items to get. The count of items should be less than 100.'),
  searchTerm: z.string().optional().describe(`
    The search term to use for the search.
    - Use this when: the user provides a vague, incomplete, or approximate search term (e.g., “marketing campaign”, “John’s task”, “budget-related”), and there isn’t a clear exact compare value for a specific field.
    - Do not use this when: the user specifies an exact value that maps directly to a column comparison (e.g., status = "Done", priority = "High", owner = "Daniel"). In these cases, prefer structured compare filters.
  `),
  limit: z.number().min(MIN_LIMIT).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT).describe('The number of items to get'),
  cursor: z.string().optional().describe('The cursor to get the next page of items, use the nextCursor from the previous response. If the nextCursor was null, it means there are no more items to get'),
  includeColumns: z.boolean().optional().default(false).describe('Whether to include column values in the response'),
  columnIds: z.array(z.string()).optional().describe('The ids of the columns to get, can be used to reduce the response size when user asks for specific columns. Works only when includeColumns is true. If not provided, all columns will be returned'),
  orderBy: z.array(z.object({
    columnId: z.string().describe('The id of the column to order by'),
    direction: z.nativeEnum(ItemsOrderByDirection).optional().default(ItemsOrderByDirection.Asc).describe('The direction to order by'),
  })).optional().describe('The columns to order by, will control the order of the items in the response'),
  filters: z.array(z.object({
    columnId: z.string().describe('The id of the column to filter by'),
    compareAttribute: z.string().optional().describe('The attribute to compare the value to'),
    compareValue: z.any().describe('The value to compare the attribute to. This can be a string or index value depending on the column type.'),
    operator: z.nativeEnum(ItemsQueryRuleOperator).optional().default(ItemsQueryRuleOperator.AnyOf).describe('The operator to use for the filter'),
  })).optional().describe(`The configuration of filters to apply on the items. 
    Before sending the filters, use get_board_info tool to check types of columns on a board.Then depending on the column type, you will filter, check out guidelines below to understand how to filter by the column.
    

    ## [IMPORTANT] Operator Guidelines
    Specific operators expect specific compareValue types:
    - CompareValue MUST BE SENT AS AN ARRAY WHEN USED WITH  any_of, not_any_of, between operators
    - CompareValue MUST BE SENT AS AN EMPTY ARRAY WHEN USED WITH is_empty, is_not_empty
    - CompareValue MUST BE SENT AS EITHER SINGLE STRING OR SINGLE NUMBER WHEN USED WITH greater_than, greater_than_or_equals, lower_than, lower_than_or_equal
    - CompareValue MUST BE SENT AS SINGLE STRING WHEN USED WITH contains_terms, not_contains_text, contains_text, starts_with, ends_with operators



    ## Column type Guidelines
    Depending on the column type, the compareValue can be a string or number. Some operators accept an array:
    - last_updated - Supported operators: any_of, not_any_of. CompareValue should be either:
      - "TODAY" - requires to also specify compareAttribute: "UPDATED_AT"
      - "YESTERDAY" - requires to also specify compareAttribute: "UPDATED_AT"
      - "THIS_WEEK" - requires to also specify compareAttribute: "UPDATED_AT"
      - "LAST_WEEK" - requires to also specify compareAttribute: "UPDATED_AT"
      - "THIS_MONTH" - requires to also specify compareAttribute: "UPDATED_AT"
      - "LAST_MONTH" - requires to also specify compareAttribute: "UPDATED_AT"
    EXAMPLES:
      ✅ Correct: {"columnId": "last_updated", "compareValue": ["TODAY"], "operator": "any_of", "compareAttribute": "UPDATED_AT"} // using TODAY with correct compareAttribute
      ✅ Correct: {"columnId": "last_updated", "compareValue": ["THIS_WEEK"], "operator": "not_any_of", "compareAttribute": "UPDATED_AT"} // using THIS_WEEK with not_any_of
      ❌ Wrong: {"columnId": "last_updated", "compareValue": ["TODAY"], "operator": "any_of"} // missing required compareAttribute
      ❌ Wrong: {"columnId": "last_updated", "compareValue": "TODAY", "operator": "any_of", "compareAttribute": "UPDATED_AT"} // not using array for any_of operator

    - date - Supported operators: any_of, not_any_of, greater_than, lower_than. CompareValue should be either:
      - Date in "YYYY-MM-DD" format must be passed along with "EXACT" string e.g. compareValue:["2025-01-01", "EXACT"]
      - "TODAY" - Item with today's date
      - "TOMORROW" - Item with tomorrow's date
      - "THIS_WEEK" - Item with this week's date
      - "ONE_WEEK_AGO" - Item with one week ago's date
    EXAMPLES:
      ✅ Correct: {"columnId": "date", "compareValue": ["2025-01-01", "EXACT"], "operator": "any_of"} // using exact date format with EXACT
      ✅ Correct: {"columnId": "date", "compareValue": "TODAY", "operator": "greater_than"} // using TODAY with greater_than
      ❌ Wrong: {"columnId": "date", "compareValue": "2025-01-01", "operator": "any_of"} // missing EXACT string for exact date
      ❌ Wrong: {"columnId": "date", "compareValue": ["TODAY"], "operator": "greater_than"} // using array with single value operator
    
    - email - Supported operators: any_of, not_any_of, is_empty, is_not_empty, contains_text, not_contains_text. CompareValue can be:
      - empty string "" when searching for blank values
      - whole email address when searching for specific email
      - partial email when using contains_text, not_contains_text operators
    EXAMPLES:
      ✅ Correct: {"columnId": "email", "compareValue": ["john@example.com"], "operator": "any_of"} // using array with any_of for specific email
      ✅ Correct: {"columnId": "email", "compareValue": "gmail", "operator": "contains_text"} // using partial email with contains_text
      ❌ Wrong: {"columnId": "email", "compareValue": "john@example.com", "operator": "any_of"} // not using array with any_of operator
      ❌ Wrong: {"columnId": "email", "compareValue": ["gmail"], "operator": "contains_text"} // using array with single value operator
    
    - long_text - Supported operators: any_of, not_any_of, is_empty, is_not_empty, contains_text, not_contains_text. CompareValue can be either full text or partial text when using contains_text, not_contains_text operators
    EXAMPLES:
      ✅ Correct: {"columnId": "long_text", "compareValue": ["Complete project description"], "operator": "any_of"} // using array with any_of for full text
      ✅ Correct: {"columnId": "long_text", "compareValue": "urgent", "operator": "contains_text"} // using partial text with contains_text
      ❌ Wrong: {"columnId": "long_text", "compareValue": "Complete project description", "operator": "any_of"} // not using array with any_of operator
      ❌ Wrong: {"columnId": "long_text", "compareValue": [], "operator": "contains_text"} // using empty array with contains_text operator
    
    - text - Supported operators: any_of, not_any_of, is_empty, is_not_empty, contains_text, not_contains_text. CompareValue can be either full text or partial text when using contains_text, not_contains_text operators
    EXAMPLES:
      ✅ Correct: {"columnId": "text", "compareValue": ["Task Name"], "operator": "any_of"} // using array with any_of for full text
      ✅ Correct: {"columnId": "text", "compareValue": "bug", "operator": "contains_text"} // using partial text with contains_text
      ❌ Wrong: {"columnId": "text", "compareValue": "Task Name", "operator": "any_of"} // not using array with any_of operator
      ❌ Wrong: {"columnId": "text", "compareValue": [], "operator": "contains_text"} // using empty array with contains_text operator
    
    - numbers - Supported operators: any_of, not_any_of, greater_than, lower_than. CompareValue is a number or "$$$blank$$$" when searching for blank values
    EXAMPLES:
      ✅ Correct: {"columnId": "numbers", "compareValue": [100, 200], "operator": "any_of"} // using array with any_of for multiple numbers
      ✅ Correct: {"columnId": "numbers", "compareValue": 50, "operator": "greater_than"} // using single number with greater_than
      ❌ Wrong: {"columnId": "numbers", "compareValue": 100, "operator": "any_of"} // not using array with any_of operator
      ❌ Wrong: {"columnId": "numbers", "compareValue": ["50"], "operator": "greater_than"} // using array with single value operator
    
    - name - **CRITICAL**: NEVER QUERY BY NAME, USE searchTerm parameter instead
    
    - status - Supported operators: any_of, not_any_of, contains_terms. CompareValue should be either:
      - index of label from column settings - when used with any_of, not_any_of operators
      - label's text - when use with contains_terms
    EXAMPLES:
      ✅ Correct: {"columnId": "status", "compareValue": [0, 1], "operator": "any_of"} // Using index values
      ✅ Correct: {"columnId": "status", "compareValue": "Done", "operator": "contains_terms"} // Using label text
      ❌ Wrong: {"columnId": "status", "compareValue": "Done", "operator": "any_of"} // Using label text with wrong operator
      ❌ Wrong: {"columnId": "status", "compareValue": [0, 1], "operator": "contains_terms"} // Using index with wrong operator
    
    - checkbox - Supported operators: is_empty, is_not_empty. Compare value must be an empty array
    EXAMPLES:
      ✅ Correct: {"columnId": "column_id", "compareValue": [], "operator": "is_empty"} // using empty array with is_empty operator
      ❌ Wrong: {"columnId": "column_id", "compareValue": null, "operator": "is_empty"} // not using empty array with is_empty operator
    
    - people - Supported operators: any_of, not_any_of, is_empty, is_not_empty. **CRITICAL**: CompareValue MUST be in one of following:
      - "assigned_to_me" - when searching for current user
      - "person-123" - when searching for specific person with id 123
      - "team-456" - when searching for specific team with id 456
      - empty array when using is_empty, is_not_empty operators
    EXAMPLES: 
      ✅ Correct: {"columnId": "column_id", "compareValue": [], "operator": "is_empty"} // using empty array with is_empty operator
      ✅ Correct: {"columnId": "column_id", "compareValue": ["person-80120403"], "operator": "any_of"} // using person prefix
      ✅ Correct: {"columnId": "column_id", "compareValue": ["team-9000"], "operator": "any_of"} // using team prefix
      ✅ Correct: {"columnId": "column_id", "compareValue": ["assigned_to_me"], "operator": "any_of"} // using assigned_to_me value
      ❌ Wrong: {"columnId": "column_id", "compareValue": ["80120403"], "operator": "is_empty"} // using id with is_empty operator
      ❌ Wrong: {"columnId": "column_id", "compareValue": ["80120403"], "operator": "any_of"} // not using person or team prefix
    `),
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
    if(input.searchTerm) {
      await this.runSmartSearchAsync(input);

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


    if(input.itemIds || input.filters || input.orderBy) {
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

  private async runSmartSearchAsync(input: ToolInputType<GetBoardItemsPageToolInput>): Promise<void> {
    const smartSearchVariables: SmartSearchBoardItemIdsQueryVariables = {
      boardId: input.boardId.toString(),
      searchTerm: input.searchTerm!,
    };

    const smartSearchRes = await this.mondayApi.request<SmartSearchBoardItemIdsQuery>(smartSearchGetBoardItemIds, smartSearchVariables);
    
    const itemIdsFromSmartSearch = smartSearchRes.search_items?.results?.map(result => Number(result.data.id)) ?? [];
    
    const uniqueItemIds = new Set(itemIdsFromSmartSearch);
    (input.itemIds ?? []).forEach(id => uniqueItemIds.add(id));
    
    input.itemIds = Array.from(uniqueItemIds);
  }
}
