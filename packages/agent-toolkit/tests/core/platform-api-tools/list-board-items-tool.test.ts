import { ListBoardItemsTool, listBoardItemsToolSchema } from '../../../src/core/platform-api-tools/list-board-items-tool';
import { ApiClient } from '@mondaydotcomorg/api';
import { 
  ListBoardItemsQuery,
  ItemsQueryRuleOperator,
  // ItemsQuery, // Not directly needed for mocks if we construct queryParams manually
} from '../../../src/monday-graphql/generated/graphql';
import { listBoardItems } from '../../../src/monday-graphql/queries.graphql';

// Mock the ApiClient
jest.mock('@mondaydotcomorg/api');

const MockApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;

describe('ListBoardItemsTool', () => {
  let tool: ListBoardItemsTool;
  let mockRequest: jest.Mock;

  beforeEach(() => {
    MockApiClient.mockClear();
    mockRequest = jest.fn();
    MockApiClient.prototype.request = mockRequest;
    tool = new ListBoardItemsTool(new MockApiClient({ token: 'test-token' }));
  });

  describe('execute method', () => {
    it('should fetch the first page of items without filters', async () => {
      const boardId = 12345;
      const limit = 2;
      const mockApiResponse: ListBoardItemsQuery = {
        boards: [
          {
            name: 'Test Board',
            items_page: {
              cursor: 'next_cursor_abc',
              items: [
                { id: 'item1', name: 'Item One', group: { id: 'group1', title: 'Group 1' } },
                { id: 'item2', name: 'Item Two', group: { id: 'group1', title: 'Group 1' } },
              ],
            },
          },
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponse);

      const input = { boardId, limit };
      const result = await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(listBoardItems, {
        boardId: boardId.toString(),
        limit,
        cursor: undefined,
        queryParams: undefined, // No filters applied
      });

      const expectedResponse = {
        boardName: 'Test Board',
        items: mockApiResponse.boards![0]!.items_page.items,
        cursor: 'next_cursor_abc',
      };
      expect(JSON.parse(result.content)).toEqual(expectedResponse);
    });

    it('should fetch the next page of items using a cursor', async () => {
      const boardId = 12345;
      const limit = 2;
      const cursor = 'next_cursor_abc';
      const mockApiResponse: ListBoardItemsQuery = {
        boards: [
          {
            name: 'Test Board',
            items_page: {
              cursor: 'next_cursor_def', // Cursor for the page after this one
              items: [
                { id: 'item3', name: 'Item Three', group: { id: 'group2', title: 'Group 2' } },
                { id: 'item4', name: 'Item Four', group: { id: 'group2', title: 'Group 2' } },
              ],
            },
          },
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponse);

      const input = { boardId, limit, cursor };
      const result = await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(listBoardItems, {
        boardId: boardId.toString(),
        limit,
        cursor,
        queryParams: undefined, // No filters applied
      });

      const expectedResponse = {
        boardName: 'Test Board',
        items: mockApiResponse.boards![0]!.items_page.items,
        cursor: 'next_cursor_def',
      };
      expect(JSON.parse(result.content)).toEqual(expectedResponse);
    });

    it('should filter items by nameQuery', async () => {
      const boardId = 12345;
      const nameQuery = 'Special Item';
      const mockApiResponse: ListBoardItemsQuery = {
        boards: [
          {
            name: 'Test Board',
            items_page: {
              cursor: null,
              items: [
                { id: 'itemSpecial1', name: 'Special Item Alpha', group: { id: 'group1', title: 'Group 1' } },
              ],
            },
          },
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponse);

      const input = { boardId, nameQuery, limit: 25 };
      const result = await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(listBoardItems, {
        boardId: boardId.toString(),
        limit: 25,
        cursor: undefined,
        queryParams: {
          rules: [
            {
              column_id: 'name',
              compare_value: nameQuery,
              operator: ItemsQueryRuleOperator.ContainsText,
            },
          ],
        },
      });

      const expectedResponse = {
        boardName: 'Test Board',
        items: mockApiResponse.boards![0]!.items_page.items,
        cursor: null,
      };
      expect(JSON.parse(result.content)).toEqual(expectedResponse);
    });
    
    it('should not filter by name if nameQuery is an empty string', async () => {
      const boardId = 12345;
      const mockApiResponse: ListBoardItemsQuery = {
        boards: [
          {
            name: 'Test Board',
            items_page: {
              cursor: null,
              items: [
                { id: 'item1', name: 'Item One', group: { id: 'group1', title: 'Group 1' } },
                { id: 'item2', name: 'Item Two', group: { id: 'group1', title: 'Group 1' } },
              ],
            },
          },
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponse);

      const input = { boardId, nameQuery: '', limit: 25 };
      const result = await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(listBoardItems, {
        boardId: boardId.toString(),
        limit: 25,
        cursor: undefined,
        queryParams: undefined,
      });
      const expectedResponse = {
        boardName: 'Test Board',
        items: mockApiResponse.boards![0]!.items_page.items,
        cursor: null,
      };
      expect(JSON.parse(result.content)).toEqual(expectedResponse);
    });

    it('should filter items by groupId', async () => {
      const boardId = 12345;
      const groupId = 'test_group_1';
      const mockApiResponse: ListBoardItemsQuery = {
        boards: [
          {
            name: 'Test Board',
            items_page: {
              cursor: null,
              items: [
                { id: 'itemInGroup1', name: 'Item in Group 1', group: { id: groupId, title: 'Test Group 1' } },
              ],
            },
          },
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponse);

      const input = { boardId, groupId, limit: 25 };
      const result = await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(listBoardItems, {
        boardId: boardId.toString(),
        limit: 25,
        cursor: undefined,
        queryParams: {
          rules: [
            {
              column_id: 'group', // This matches the assumption in the tool
              compare_value: [groupId],
              operator: ItemsQueryRuleOperator.AnyOf,
            },
          ],
        },
      });

      const expectedResponse = {
        boardName: 'Test Board',
        items: mockApiResponse.boards![0]!.items_page.items,
        cursor: null,
      };
      expect(JSON.parse(result.content)).toEqual(expectedResponse);
    });

    it('should filter items by both nameQuery and groupId', async () => {
      const boardId = 12345;
      const nameQuery = 'Specific';
      const groupId = 'test_group_2';
      const mockApiResponse: ListBoardItemsQuery = {
        boards: [
          {
            name: 'Test Board',
            items_page: {
              cursor: null,
              items: [
                { id: 'specificItemInGroup2', name: 'Specific Item in Group 2', group: { id: groupId, title: 'Test Group 2' } },
              ],
            },
          },
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponse);

      const input = { boardId, nameQuery, groupId, limit: 25 };
      const result = await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(listBoardItems, {
        boardId: boardId.toString(),
        limit: 25,
        cursor: undefined,
        queryParams: {
          rules: [
            {
              column_id: 'name',
              compare_value: nameQuery,
              operator: ItemsQueryRuleOperator.ContainsText,
            },
            {
              column_id: 'group',
              compare_value: [groupId],
              operator: ItemsQueryRuleOperator.AnyOf,
            },
          ],
          // operator: ItemsQueryOperator.And, // Default behavior if multiple rules, usually AND
        },
      });

      const expectedResponse = {
        boardName: 'Test Board',
        items: mockApiResponse.boards![0]!.items_page.items,
        cursor: null,
      };
      expect(JSON.parse(result.content)).toEqual(expectedResponse);
    });

    it('should handle API errors gracefully', async () => {
      const boardId = 67890;
      const errorMessage = 'API Error Occurred';
      mockRequest.mockRejectedValue(new Error(errorMessage));

      const input = { boardId, limit: 10 };
      const result = await tool.execute(input);

      expect(mockRequest).toHaveBeenCalledWith(listBoardItems, {
        boardId: boardId.toString(),
        limit: 10,
        cursor: undefined,
        queryParams: undefined,
      });
      expect(result.content).toEqual(`Failed to list items for board ${boardId}. Error: ${errorMessage}`);
    });

    it('should handle board not found or access denied', async () => {
      const boardId = 11111;
      const mockApiResponse: ListBoardItemsQuery = {
        boards: null, // Simulate board not found or no access by API returning null for boards array
      };
      mockRequest.mockResolvedValue(mockApiResponse);

      const input = { boardId, limit: 10 };
      const result = await tool.execute(input);
      expect(result.content).toEqual(`Board with ID ${boardId} not found or access denied.`);
    });

    it('should return an empty items array if board items_page has empty items and null cursor', async () => {
      const boardId = 22222;
      const mockApiResponse: ListBoardItemsQuery = {
        boards: [
          {
            name: 'Empty Board Items',
            // items_page itself is an object, its content can be empty/null
            items_page: { items: [], cursor: null }, 
          },
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponse);
      const input = { boardId, limit: 10 };
      const result = await tool.execute(input);
      const expectedResponse = {
        boardName: 'Empty Board Items',
        items: [],
        cursor: null,
      };
      expect(JSON.parse(result.content)).toEqual(expectedResponse);
    });

    it('should return an empty items array if items_page.items is explicitly null or empty array', async () => {
      const boardId = 33333;
      const input = { boardId, limit: 10 };

      // Scenario 1: items_page.items is empty array
      const mockApiResponseEmpty: ListBoardItemsQuery = {
        boards: [
          {
            name: 'Board With Empty Items Array',
            items_page: { items: [], cursor: null }, 
          },
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponseEmpty);
      let result = await tool.execute(input);
      const expectedResponseEmpty: any = {
        boardName: 'Board With Empty Items Array',
        items: [],
        cursor: null,
      };
      expect(JSON.parse(result.content)).toEqual(expectedResponseEmpty);

      // Scenario 2: items_page.items is null (robustness test)
      const mockApiResponseItemsNull: ListBoardItemsQuery = {
        boards: [
          {
            name: 'Board With Null Items Field (Robustness Test)',
            items_page: { items: null as any, cursor: null }, 
          },
        ],
      };
      mockRequest.mockResolvedValue(mockApiResponseItemsNull);
      result = await tool.execute(input);
      const expectedResponseItemsNull: any = {
        boardName: 'Board With Null Items Field (Robustness Test)',
        items: [], 
        cursor: null,
      };
      expect(JSON.parse(result.content)).toEqual(expectedResponseItemsNull);
    });

    // More test cases will be added here for pagination, filters, errors, etc.
  });
}); 