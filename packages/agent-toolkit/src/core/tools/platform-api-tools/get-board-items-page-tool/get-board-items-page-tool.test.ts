import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameAsync, callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';
import { GetBoardItemsPageTool, GetBoardItemsPageToolInput, getBoardItemsPageToolSchema } from './get-board-items-page-tool';
import { z, ZodTypeAny } from 'zod';
import { GetBoardItemsPageQuery, ItemsOrderByDirection, ItemsQueryRuleOperator } from 'src/monday-graphql';


export type inputType = z.objectInputType<GetBoardItemsPageToolInput, ZodTypeAny>;

describe('GetBoardItemsPageTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient')
        .mockReturnValue(mocks.mockApiClient);
  });

  const successfulResponseWithItems: GetBoardItemsPageQuery = {
    boards: [
      {
        id: '123456789',
        name: 'Test Board',
        items_page: {
          items: [
            {
              id: 'item1',
              name: 'First Item',
              created_at: '2024-01-15T10:30:00Z',
              updated_at: '2024-01-16T14:20:00Z',
              column_values: [
                { id: 'status', text: 'In Progress', value: '{"label":{"text":"In Progress"}}' },
                { id: 'priority', text: 'High', value: '{"label":{"text":"High"}}' }
              ],
              subitems: [
                {
                  id: 'subitem1',
                  name: 'Subitem 1',
                  created_at: '2024-01-15T10:30:00Z',
                  updated_at: '2024-01-16T14:20:00Z'
                },
                {
                  id: 'subitem2',
                  name: 'Subitem 2',
                  created_at: '2024-01-15T10:30:00Z',
                  updated_at: '2024-01-16T14:20:00Z'
                }
              ]
            },
            {
              id: 'item2',
              name: 'Second Item',
              created_at: '2024-01-14T09:15:00Z',
              updated_at: '2024-01-15T16:45:00Z',
              column_values: [
                { id: 'status', text: 'Done', value: '{"label":{"text":"Done"}}' },
                { id: 'priority', text: 'Low', value: '{"label":{"text":"Low"}}' }
              ]
            }
          ],
          cursor: 'next_page_cursor_123'
        }
      }
    ]
  };

  const successfulResponseWithoutColumns: GetBoardItemsPageQuery = {
    boards: [
      {
        id: '123456789',
        name: 'Test Board',
        items_page: {
          items: [
            { 
              id: 'item1', 
              name: 'First Item',
              created_at: '2024-01-15T10:30:00Z',
              updated_at: '2024-01-16T14:20:00Z'
            },
            { 
              id: 'item2', 
              name: 'Second Item',
              created_at: '2024-01-14T09:15:00Z',
              updated_at: '2024-01-15T16:45:00Z'
            }
          ],
          cursor: null
        }
      }
    ]
  };

  const emptyResponse = {
    boards: [
      {
        id: '123456789',
        name: 'Empty Board',
        items_page: {
          items: [],
          cursor: null
        }
      }
    ]
  };

  describe('Basic Functionality', () => {
    it('should successfully get board items with default parameters', async () => {
      mocks.setResponse(successfulResponseWithoutColumns);

      const args: inputType = { boardId: 123456789 };
      const parsedResult = await callToolByNameAsync('get_board_items_page', args);

      expect(parsedResult.board.id).toBe('123456789');
      expect(parsedResult.board.name).toBe('Test Board');
      expect(parsedResult.items).toHaveLength(2);
      expect(parsedResult.items[0]).toEqual({
        id: 'item1',
        name: 'First Item',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-16T14:20:00Z'
      });
      expect(parsedResult.items[1]).toEqual({
        id: 'item2',
        name: 'Second Item',
        created_at: '2024-01-14T09:15:00Z',
        updated_at: '2024-01-15T16:45:00Z'
      });
      expect(parsedResult.pagination.has_more).toBe(false);
      expect(parsedResult.pagination.nextCursor).toBeNull();
      expect(parsedResult.pagination.count).toBe(2);
      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoardItemsPage'),
        {
          boardId: '123456789',
          limit: 25,
          cursor: undefined,
          includeColumns: false,
          includeSubItems: false
        }
      );
    });

    it('should successfully get board items with custom limit', async () => {
      mocks.setResponse(successfulResponseWithoutColumns);

      const args: inputType = { boardId: 123456789, limit: 50 };
      const parsedResult = await callToolByNameAsync('get_board_items_page', args);

      expect(parsedResult.items).toHaveLength(2);
      expect(parsedResult.pagination.count).toBe(2);
      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoardItemsPage'),
        {
          boardId: '123456789',
          limit: 50,
          cursor: undefined,
          includeColumns: false,
          includeSubItems: false
        }
      );
    });

    it('should successfully get board items with cursor for pagination', async () => {
      mocks.setResponse(successfulResponseWithItems);

      const args: inputType = { boardId: 123456789, cursor: 'previous_cursor_456' };
      const parsedResult = await callToolByNameAsync('get_board_items_page', args);

      expect(parsedResult.items).toHaveLength(2);
      expect(parsedResult.pagination.has_more).toBe(true);
      expect(parsedResult.pagination.nextCursor).toBe('next_page_cursor_123');
      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoardItemsPage'),
        {
          boardId: '123456789',
          limit: 25,
          cursor: 'previous_cursor_456',
          includeColumns: false,
          includeSubItems: false
        }
      );
    });
  });

  describe('Cursor Functionality', () => {
    it('should not include filters when cursor is provided', async () => {
      mocks.setResponse(successfulResponseWithItems);

      const args: inputType = { 
        boardId: 123456789, 
        cursor: 'previous_cursor_456',
        filters: [
          {
            columnId: 'status',
            compareValue: 'In Progress',
            operator: ItemsQueryRuleOperator.AnyOf
          }
        ],
        orderBy: [
          {
            columnId: 'name',
            direction: ItemsOrderByDirection.Asc
          }
        ]
      };
      await callToolByNameAsync('get_board_items_page', args);


      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoardItemsPage'),
        {
          boardId: '123456789',
          limit: 25,
          cursor: 'previous_cursor_456',
          includeColumns: false,
          queryParams: undefined,
          includeSubItems: false
        }
      );
    });

    it('should include filters when no cursor is provided', async () => {
      mocks.setResponse(successfulResponseWithItems);

      const args: inputType = { 
        boardId: 123456789,
        filters: [
          {
            columnId: 'status',
            compareValue: 'In Progress',
            operator: 'any_of' as any
          }
        ],
        orderBy: [
          {
            columnId: 'name',
            direction: 'asc' as any
          }
        ]
      };
      await callToolByNameAsync('get_board_items_page', args);
      
      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoardItemsPage'),
        {
          boardId: '123456789',
          limit: 25,
          cursor: undefined,
          includeColumns: false,
          columnIds: undefined,
          includeSubItems: false,
          queryParams: {
            ids: undefined,
            operator: 'and',
            rules: [
              {
                column_id: 'status',
                compare_value: 'In Progress',
                operator: 'any_of',
                compare_attribute: undefined
              }
            ],
            order_by: [
              {
                column_id: 'name',
                direction: 'asc'
              }
            ]
          }
        }
      );
    });
  });

  describe('getItemIdsFromSmartSearchAsync integration', () => {
    it('should call mockRequest with itemIds from smart search when no initial itemIds are provided', async () => {
      // Arrange
      const smartSearchItemIds = [111, 222, 333];
      const smartSearchResults = {
        search_items: {
          results: smartSearchItemIds.map(id => ({ data: { id: id.toString() } }))
        }
      };
      
      // Mock the smart search request
      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string, variables: any) => {
        if (query.includes('query SmartSearchBoardItemIds')) {
          return Promise.resolve(smartSearchResults);
        }
        // For the main getBoardItemsPage query, just return a dummy response
        return Promise.resolve(successfulResponseWithItems);
      });

      const args: inputType = {
        boardId: 123456789,
        searchTerm: 'test search'
      };

      await callToolByNameAsync('get_board_items_page', args);

      // The first call is to smart search, the second is to getBoardItemsPage
      const calls = mocks.getMockRequest().mock.calls;
      // Find the call to GetBoardItemsPage
      const getBoardItemsPageCall = calls.find(call => call[0].includes('query GetBoardItemsPage'));
      expect(getBoardItemsPageCall).toBeDefined();
      expect(getBoardItemsPageCall[1].queryParams.ids).toEqual(smartSearchItemIds.map(id => id.toString()));
    });

    it('should call mockRequest with intersection of itemIds and smart search results', async () => {
      // Arrange
      const smartSearchItemIds = [111, 222, 333];
      const initialItemIds = [222, 444];
      const expectedIds = [222];
      const smartSearchResults = {
        search_items: {
          results: smartSearchItemIds.map(id => ({ data: { id: id.toString() } }))
        }
      };

      // Mock the smart search request
      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string, variables: any) => {
        if (query.includes('query SmartSearchBoardItemIds')) {
          return Promise.resolve(smartSearchResults);
        }
        // For the main getBoardItemsPage query, just return a dummy response
        return Promise.resolve(successfulResponseWithItems);
      });

      const args: inputType = {
        boardId: 123456789,
        searchTerm: 'test search',
        itemIds: initialItemIds
      };

      await callToolByNameAsync('get_board_items_page', args);

      const calls = mocks.getMockRequest().mock.calls;
      const getBoardItemsPageCall = calls.find(call => call[0].includes('query GetBoardItemsPage'));
      expect(getBoardItemsPageCall).toBeDefined();
      expect(getBoardItemsPageCall[1].queryParams.ids).toEqual(expectedIds.map(id => id.toString()));
    });

    it('should build manual name filter in queryParams.rules if smart search returns no itemIds', async () => {
      // Arrange
      const smartSearchResults = {
        search_items: {
          results: []
        }
      };

      // Mock the smart search request
      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string, variables: any) => {
        if (query.includes('query SmartSearchBoardItemIds')) {
          return Promise.resolve(smartSearchResults);
        }
        // For the main getBoardItemsPage query, just return a dummy response
        return Promise.resolve(successfulResponseWithItems);
      });

      const args: inputType = {
        boardId: 123456789,
        searchTerm: 'no results'
      };

      await callToolByNameAsync('get_board_items_page', args);

      // Should call GetBoardItemsPage with manual rule on "name" containing searchTerm
      const calls = mocks.getMockRequest().mock.calls;
      const getBoardItemsPageCall = calls.find(call => call[0].includes('query GetBoardItemsPage'));
      expect(getBoardItemsPageCall).toBeDefined();
      const queryParams = getBoardItemsPageCall[1].queryParams;
      expect(Array.isArray(queryParams.rules)).toBe(true);
      expect(
        queryParams.rules.some(
          (rule: any) =>
            rule.column_id === 'name' &&
            rule.operator === ItemsQueryRuleOperator.ContainsText &&
            rule.compare_value === 'no results'
        )
      ).toBe(true);
    });
  });

  describe('Stringified JSONs functionality', () => {
    it('should parse stringified JSONs when provided', async () => {
      mocks.setResponse(successfulResponseWithItems);

      const filtersStringified = JSON.stringify([
        {
          columnId: 'status',
          compareValue: 'In Progress',
          operator: ItemsQueryRuleOperator.AnyOf
        }
      ]);
      
      const orderByStringified = JSON.stringify([
        {
          columnId: 'name',
          direction: ItemsOrderByDirection.Asc
        }
      ]);

      const args: inputType = { 
        boardId: 123456789,
        filtersStringified,
        orderByStringified
      };
      await callToolByNameAsync('get_board_items_page', args);


      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoardItemsPage'),
        {
          boardId: '123456789',
          limit: 25,
          cursor: undefined,
          includeColumns: false,
          columnIds: undefined,
          includeSubItems: false,
          queryParams: {
            ids: undefined,
            operator: 'and',
            rules: [
              {
                column_id: 'status',
                compare_value: 'In Progress',
                operator: ItemsQueryRuleOperator.AnyOf,
                compare_attribute: undefined
              }
            ],
            order_by: [
              {
                column_id: 'name',
                direction: ItemsOrderByDirection.Asc
              }
            ]
          }
        }
      );
    });

    it('should raise error when stringified JSONs does not match the schema', async () => {
      mocks.setResponse(successfulResponseWithItems);

      const filtersStringified = JSON.stringify([
        {
          notAcolumnId: 'status',
          notAcompareValue: 'In Progress',
          operator: ItemsQueryRuleOperator.AnyOf
        }
      ]);
      
      const orderByStringified = JSON.stringify([
        {
          columnId: 'name',
          direction: ItemsOrderByDirection.Asc
        }
      ]);

      const args: inputType = { 
        boardId: 123456789,
        filtersStringified,
        orderByStringified
      };
      const result = await callToolByNameRawAsync('get_board_items_page', args);
      expect(result.content[0].text).toContain('JSON string defined as filtersStringified does not match the specified schema');


      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should throw error for invalid stringified JSON', async () => {
      const args: inputType = { 
        boardId: 123456789,
        filtersStringified: 'invalid json'
      };

      const result = await callToolByNameRawAsync('get_board_items_page', args);
      expect(result.content[0].text).toContain('filtersStringified is not a valid JSON');
    });

    it('should handle both regular and stringified JSON parameters', async () => {
      mocks.setResponse(successfulResponseWithItems);

      const orderByStringified = JSON.stringify([
        {
          columnId: 'name',
          direction: 'asc'
        }
      ]);

      const args: inputType = { 
        boardId: 123456789,
        filters: [
          {
            columnId: 'status',
            compareValue: 'In Progress',
            operator: 'any_of' as any
          }
        ],
        orderByStringified
      };
      await callToolByNameAsync('get_board_items_page', args);

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoardItemsPage'),
        {
          boardId: '123456789',
          limit: 25,
          cursor: undefined,
          includeColumns: false,
          includeSubItems: false,
          columnIds: undefined,
          queryParams: {
            ids: undefined,
            operator: 'and',
            rules: [
              {
                column_id: 'status',
                compare_value: 'In Progress',
                operator: ItemsQueryRuleOperator.AnyOf,
                compare_attribute: undefined
              }
            ],
            order_by: [
              {
                column_id: 'name',
                direction: ItemsOrderByDirection.Asc
              }
            ]
          }
        }
      );
    });

    it('should not parse stringified JSONs when regular JSON is provided', async () => {
      mocks.setResponse(successfulResponseWithItems);

      const orderBy = [
        {
          columnId: 'priority',
          direction: ItemsOrderByDirection.Desc
        }
      ];
      const orderByStringified = JSON.stringify([
        {
          columnId: 'name',
          direction: ItemsOrderByDirection.Asc
        }
      ]);
      const args: inputType = { 
        boardId: 123456789,
        filters: [
          {
            columnId: 'status',
            compareValue: 'In Progress',
            operator: ItemsQueryRuleOperator.AnyOf
          }
        ],
        orderBy,
        orderByStringified
      };
      await callToolByNameAsync('get_board_items_page', args);

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoardItemsPage'),
        expect.objectContaining({
          boardId: '123456789',
          limit: 25,
          cursor: undefined,
          includeColumns: false,
          columnIds: undefined,
          queryParams: expect.objectContaining({
            order_by: [
              {
                column_id: 'priority',
                direction: ItemsOrderByDirection.Desc
              }
            ]
          })
        })
      );
    });
  });

  describe('Column Values Functionality', () => {
    it('should include column values when includeColumns is true', async () => {
      mocks.setResponse(successfulResponseWithItems);

      const args: inputType = {
        boardId: 123456789,
        includeColumns: true
      };
      const parsedResult = await callToolByNameAsync('get_board_items_page', args);

      expect(parsedResult.items).toHaveLength(2);
      expect(parsedResult.items[0]).toEqual({
        id: 'item1',
        name: 'First Item',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-16T14:20:00Z',
        column_values: {
          status: { label: { text: 'In Progress' } },
          priority: { label: { text: 'High' } }
        }
      });
      expect(parsedResult.items[1]).toEqual({
        id: 'item2',
        name: 'Second Item',
        created_at: '2024-01-14T09:15:00Z',
        updated_at: '2024-01-15T16:45:00Z',
        column_values: {
          status: { label: { text: 'Done' } },
          priority: { label: { text: 'Low' } }
        }
      });
      expect(parsedResult.pagination.has_more).toBe(true);
      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoardItemsPage'),
        {
          boardId: '123456789',
          limit: 25,
          cursor: undefined,
          includeColumns: true,
          includeSubItems: false
        }
      );
    });

    it('should handle column values with null/undefined text and value', async () => {
      const responseWithNullColumns = {
        boards: [
          {
            id: '123456789',
            name: 'Test Board',
            items_page: {
              items: [
                {
                  id: 'item1',
                  name: 'Item with null columns',
                  created_at: '2024-01-15T10:30:00Z',
                  updated_at: '2024-01-16T14:20:00Z',
                  column_values: [
                    { id: 'status', text: null, value: null },
                    { id: 'priority', text: undefined, value: undefined }
                  ]
                }
              ],
              cursor: null
            }
          }
        ]
      };

      mocks.setResponse(responseWithNullColumns);

      const args: inputType = {
        boardId: 123456789,
        includeColumns: true
      };
      const parsedResult = await callToolByNameAsync('get_board_items_page', args);

      expect(parsedResult.items[0]).toEqual({
        id: 'item1',
        name: 'Item with null columns',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-16T14:20:00Z',
        column_values: {
          status: null,
          priority: null
        }
      });
    });
  });

  describe('Empty Results', () => {
    it('should handle empty board gracefully', async () => {
      mocks.setResponse(emptyResponse);

      const args: inputType = { boardId: 123456789 };
      const parsedResult = await callToolByNameAsync('get_board_items_page', args);

      expect(parsedResult.board.name).toBe('Empty Board');
      expect(parsedResult.items).toHaveLength(0);
      expect(parsedResult.pagination.count).toBe(0);
      expect(parsedResult.pagination.has_more).toBe(false);
    });

    it('should handle board not found gracefully', async () => {
      const noBoardResponse = {
        boards: []
      };

      mocks.setResponse(noBoardResponse);

      const args: inputType = { boardId: 123456789 };
      const parsedResult = await callToolByNameAsync('get_board_items_page', args);


      expect(parsedResult.board.id).toBeUndefined();
      expect(parsedResult.board.name).toBeUndefined();
      expect(parsedResult.items).toHaveLength(0);
      expect(parsedResult.pagination.count).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should pass GraphQL errors to caller', async () => {
      const errorMessage = 'GraphQL error occurred';
      mocks.setError(errorMessage);

      const args: inputType = {
        boardId: 123456789,
        includeColumns: true
      };
      const result = await callToolByNameRawAsync('get_board_items_page', args);

      expect(result.content[0].text).toContain(errorMessage);
    });

    it('should handle malformed response gracefully', async () => {
      const malformedResponse = {
        boards: [
          {
            id: '123456789',
            name: 'Test Board',
            items_page: null
          }
        ]
      };

      mocks.setResponse(malformedResponse);

      const args: inputType = { boardId: 123456789 };
      const parsedResult = await callToolByNameAsync('get_board_items_page', args);

      expect(parsedResult.board.name).toBe('Test Board');
      expect(parsedResult.items).toHaveLength(0);
      expect(parsedResult.pagination.count).toBe(0);
    });
  });

  describe('Schema Validation', () => {
    it('should have correct tool metadata', () => {
      const tool = new GetBoardItemsPageTool(mocks.mockApiClient, 'fake_token');

      expect(tool.name).toBe('get_board_items_page');
      expect(tool.type).toBe('read');
      expect(tool.annotations.title).toBe('Get Board Items Page');
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.annotations.destructiveHint).toBe(false);
      expect(tool.annotations.idempotentHint).toBe(true);
    });
  });

  describe('SubItems Functionality', () => {
    // Parameterized test similar to NUnit's [TestCase(true)], [TestCase(false)]
    it.each([
      [true],
      [false]
    ])('should only include subitems when includeSubItems is specified, test for includeSubItems = %s', async (includeSubItems: boolean) => {
      mocks.setResponse(successfulResponseWithItems);

      const args: inputType = {
        boardId: 123456789,
        includeSubItems: includeSubItems
      };
      const parsedResult = await callToolByNameAsync('get_board_items_page', args);

      expect(parsedResult.items).toHaveLength(2);
      
      if (includeSubItems) {
        // When includeSubItems is true, subitems should be present
        expect(parsedResult.items[0].subitems).toBeDefined();
        expect(parsedResult.items[0].subitems).toHaveLength(2);
        expect(parsedResult.items[0].subitems[0]).toEqual({
          id: 'subitem1',
          name: 'Subitem 1',
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-16T14:20:00Z'
        });
        expect(parsedResult.items[0].subitems[1]).toEqual({
          id: 'subitem2',
          name: 'Subitem 2',
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-16T14:20:00Z'
        });
        // Item2 has no subitems in the response
        expect(parsedResult.items[1].subitems).toBeUndefined();
      } else {
        // When includeSubItems is false, subitems should not be present
        expect(parsedResult.items[0].subitems).toBeUndefined();
        expect(parsedResult.items[1].subitems).toBeUndefined();
      }

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoardItemsPage'),
        {
          boardId: '123456789',
          limit: 25,
          cursor: undefined,
          includeColumns: false,
          includeSubItems: includeSubItems
        }
      );
    });

    it('should only return 1 subitem when subItemLimit is 1', async () => {
      mocks.setResponse(successfulResponseWithItems);

      const args: inputType = {
        boardId: 123456789,
        includeSubItems: true,
        subItemLimit: 1
      };
      const parsedResult = await callToolByNameAsync('get_board_items_page', args);

      expect(parsedResult.items).toHaveLength(2);
      
      // First item has subitems - should only return 1
      expect(parsedResult.items[0].subitems).toBeDefined();
      expect(parsedResult.items[0].subitems).toHaveLength(1);
      expect(parsedResult.items[0].subitems[0]).toEqual({
        id: 'subitem1',
        name: 'Subitem 1',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-16T14:20:00Z'
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoardItemsPage'),
        {
          boardId: '123456789',
          limit: 25,
          cursor: undefined,
          includeColumns: false,
          includeSubItems: true
        }
      );
    });
  });
});
