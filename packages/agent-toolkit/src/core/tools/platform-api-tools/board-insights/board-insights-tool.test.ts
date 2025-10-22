import { createMockApiClient } from '../test-utils/mock-api-client';
import { BoardInsightsTool } from './board-insights-tool';
import { handleFrom, handleFilters, handleSelectAndGroupByElements, handleOrderBy } from './board-insights-utils';
import {
  AggregateSelectFunctionName,
  ItemsQueryOperator,
  ItemsQueryRuleOperator,
  AggregateFromElementType,
  AggregateSelectElementType,
  ItemsOrderByDirection,
} from 'src/monday-graphql/generated/graphql';
import { DEFAULT_LIMIT } from './board-insights.consts';

describe('Board Insights Tool', () => {
  describe('Utility Functions', () => {
    describe('handleFrom', () => {
      it('should create proper FROM clause for a board', () => {
        const input = { boardId: 123456 };
        const result = handleFrom(input as any);

        expect(result).toEqual({
          id: '123456',
          type: AggregateFromElementType.Table,
        });
      });

      it('should handle board ID as string', () => {
        const input = { boardId: 987654 };
        const result = handleFrom(input as any);

        expect(result).toEqual({
          id: '987654',
          type: AggregateFromElementType.Table,
        });
      });
    });

    describe('handleFilters', () => {
      it('should return undefined when no filters provided', () => {
        const input = { boardId: 123 };
        const result = handleFilters(input as any);

        expect(result).toBeUndefined();
      });

      it('should transform single filter rule correctly', () => {
        const input = {
          boardId: 123,
          filters: [
            {
              columnId: 'status',
              compareValue: 'Done',
              operator: ItemsQueryRuleOperator.AnyOf,
            },
          ],
          filtersOperator: ItemsQueryOperator.And,
        };

        const result = handleFilters(input as any);

        expect(result).toEqual({
          rules: [
            {
              column_id: 'status',
              compare_value: 'Done',
              operator: ItemsQueryRuleOperator.AnyOf,
              compare_attribute: undefined,
            },
          ],
          operator: ItemsQueryOperator.And,
        });
      });

      it('should transform multiple filter rules correctly', () => {
        const input = {
          boardId: 123,
          filters: [
            {
              columnId: 'status',
              compareValue: 'Done',
              operator: ItemsQueryRuleOperator.AnyOf,
            },
            {
              columnId: 'person',
              compareValue: [1234, 5678],
              operator: ItemsQueryRuleOperator.AnyOf,
              compareAttribute: 'id',
            },
          ],
          filtersOperator: ItemsQueryOperator.Or,
        };

        const result = handleFilters(input as any);

        expect(result).toEqual({
          rules: [
            {
              column_id: 'status',
              compare_value: 'Done',
              operator: ItemsQueryRuleOperator.AnyOf,
              compare_attribute: undefined,
            },
            {
              column_id: 'person',
              compare_value: [1234, 5678],
              operator: ItemsQueryRuleOperator.AnyOf,
              compare_attribute: 'id',
            },
          ],
          operator: ItemsQueryOperator.Or,
        });
      });

      it('should include orderBy when provided', () => {
        const input = {
          boardId: 123,
          orderBy: [
            {
              columnId: 'status',
              direction: ItemsOrderByDirection.Asc,
            },
          ],
        };

        const result = handleFilters(input as any);

        expect(result).toEqual({
          order_by: [
            {
              column_id: 'status',
              direction: ItemsOrderByDirection.Asc,
            },
          ],
        });
      });

      it('should include both filters and orderBy when both provided', () => {
        const input = {
          boardId: 123,
          filters: [
            {
              columnId: 'status',
              compareValue: 'Done',
              operator: ItemsQueryRuleOperator.AnyOf,
            },
          ],
          filtersOperator: ItemsQueryOperator.And,
          orderBy: [
            {
              columnId: 'created_at',
              direction: ItemsOrderByDirection.Desc,
            },
          ],
        };

        const result = handleFilters(input as any);

        expect(result).toEqual({
          rules: [
            {
              column_id: 'status',
              compare_value: 'Done',
              operator: ItemsQueryRuleOperator.AnyOf,
              compare_attribute: undefined,
            },
          ],
          operator: ItemsQueryOperator.And,
          order_by: [
            {
              column_id: 'created_at',
              direction: ItemsOrderByDirection.Desc,
            },
          ],
        });
      });
    });

    describe('handleOrderBy', () => {
      it('should return undefined when no orderBy provided', () => {
        const input = { boardId: 123 };
        const result = handleOrderBy(input as any);

        expect(result).toBeUndefined();
      });

      it('should transform single orderBy correctly with ASC direction', () => {
        const input = {
          boardId: 123,
          orderBy: [
            {
              columnId: 'status',
              direction: ItemsOrderByDirection.Asc,
            },
          ],
        };

        const result = handleOrderBy(input as any);

        expect(result).toEqual([
          {
            column_id: 'status',
            direction: ItemsOrderByDirection.Asc,
          },
        ]);
      });

      it('should transform single orderBy correctly with DESC direction', () => {
        const input = {
          boardId: 123,
          orderBy: [
            {
              columnId: 'created_at',
              direction: ItemsOrderByDirection.Desc,
            },
          ],
        };

        const result = handleOrderBy(input as any);

        expect(result).toEqual([
          {
            column_id: 'created_at',
            direction: ItemsOrderByDirection.Desc,
          },
        ]);
      });

      it('should transform multiple orderBy correctly', () => {
        const input = {
          boardId: 123,
          orderBy: [
            {
              columnId: 'status',
              direction: ItemsOrderByDirection.Asc,
            },
            {
              columnId: 'priority',
              direction: ItemsOrderByDirection.Desc,
            },
            {
              columnId: 'created_at',
              direction: ItemsOrderByDirection.Asc,
            },
          ],
        };

        const result = handleOrderBy(input as any);

        expect(result).toEqual([
          {
            column_id: 'status',
            direction: ItemsOrderByDirection.Asc,
          },
          {
            column_id: 'priority',
            direction: ItemsOrderByDirection.Desc,
          },
          {
            column_id: 'created_at',
            direction: ItemsOrderByDirection.Asc,
          },
        ]);
      });
    });

    describe('handleSelectAndGroupByElements', () => {
      it('should handle simple column select without function', () => {
        const input = {
          boardId: 123,
          aggregations: [{ columnId: 'status' }],
        };

        const result = handleSelectAndGroupByElements(input as any);

        expect(result.selectElements).toEqual([
          {
            type: AggregateSelectElementType.Column,
            column: { column_id: 'status' },
            as: 'status',
          },
        ]);

        expect(result.groupByElements).toEqual([{ column_id: 'status' }]);
      });

      it('should handle aggregation function (COUNT)', () => {
        const input = {
          boardId: 123,
          aggregations: [
            {
              columnId: 'item_id',
              function: AggregateSelectFunctionName.Count,
            },
          ],
        };

        const result = handleSelectAndGroupByElements(input as any);

        expect(result.selectElements).toEqual([
          {
            type: AggregateSelectElementType.Function,
            function: {
              function: AggregateSelectFunctionName.Count,
              params: [
                {
                  type: AggregateSelectElementType.Column,
                  column: { column_id: 'item_id' },
                  as: 'item_id',
                },
              ],
            },
            as: 'COUNT_item_id_0',
          },
        ]);

        expect(result.groupByElements).toEqual([]);
      });

      it('should handle transformative function and add to group by', () => {
        const input = {
          boardId: 123,
          aggregations: [
            {
              columnId: 'status',
              function: AggregateSelectFunctionName.Label,
            },
          ],
          limit: DEFAULT_LIMIT,
        };

        const result = handleSelectAndGroupByElements(input as any);

        expect(result.selectElements).toEqual([
          {
            type: AggregateSelectElementType.Function,
            function: {
              function: AggregateSelectFunctionName.Label,
              params: [
                {
                  type: AggregateSelectElementType.Column,
                  column: { column_id: 'status' },
                  as: 'status',
                },
              ],
            },
            as: 'LABEL_status_0',
          },
        ]);

        expect(result.groupByElements).toEqual([{ column_id: 'LABEL_status_0' }]);
      });

      it('should handle mixed aggregations with group by', () => {
        const input = {
          boardId: 123,
          aggregations: [
            { columnId: 'status' },
            {
              columnId: 'item_id',
              function: AggregateSelectFunctionName.Count,
            },
          ],
          groupBy: ['status'],
        };

        const result = handleSelectAndGroupByElements(input as any);

        expect(result.selectElements).toHaveLength(2);
        expect(result.selectElements[0]).toEqual({
          type: AggregateSelectElementType.Column,
          column: { column_id: 'status' },
          as: 'status',
        });
        expect(result.selectElements[1].type).toBe(AggregateSelectElementType.Function);
        expect(result.groupByElements).toEqual([{ column_id: 'status' }]);
      });

      it('should add select elements for group by columns not in aggregations', () => {
        const input = {
          boardId: 123,
          aggregations: [
            {
              columnId: 'item_id',
              function: AggregateSelectFunctionName.Count,
            },
          ],
          groupBy: ['status', 'priority'],
        };

        const result = handleSelectAndGroupByElements(input as any);

        expect(result.selectElements).toHaveLength(3);
        expect(result.groupByElements).toEqual([{ column_id: 'status' }, { column_id: 'priority' }]);

        // Should have added column selects for status and priority
        expect(
          result.selectElements.some((el) => el.type === AggregateSelectElementType.Column && el.as === 'status'),
        ).toBe(true);
        expect(
          result.selectElements.some((el) => el.type === AggregateSelectElementType.Column && el.as === 'priority'),
        ).toBe(true);
      });

      it('should handle multiple aggregations of same column with different functions', () => {
        const input = {
          boardId: 123,
          aggregations: [
            {
              columnId: 'numbers',
              function: AggregateSelectFunctionName.Sum,
            },
            {
              columnId: 'numbers',
              function: AggregateSelectFunctionName.Average,
            },
            {
              columnId: 'numbers',
              function: AggregateSelectFunctionName.Max,
            },
          ],
        };

        const result = handleSelectAndGroupByElements(input as any);

        expect(result.selectElements).toHaveLength(3);
        expect(result.selectElements[0].as).toBe('SUM_numbers_0');
        expect(result.selectElements[1].as).toBe('AVERAGE_numbers_0');
        expect(result.selectElements[2].as).toBe('MAX_numbers_0');
      });

      it('should handle duplicate aggregations with incremented aliases', () => {
        const input = {
          boardId: 123,
          aggregations: [
            {
              columnId: 'numbers',
              function: AggregateSelectFunctionName.Sum,
            },
            {
              columnId: 'numbers',
              function: AggregateSelectFunctionName.Sum,
            },
          ],
        };

        const result = handleSelectAndGroupByElements(input as any);

        expect(result.selectElements).toHaveLength(2);
        expect(result.selectElements[0].as).toBe('SUM_numbers_0');
        expect(result.selectElements[1].as).toBe('SUM_numbers_1');
      });
    });
  });

  describe('BoardInsightsTool Execution', () => {
    let mocks: ReturnType<typeof createMockApiClient>;

    beforeEach(() => {
      mocks = createMockApiClient();
      jest.clearAllMocks();
    });

    it('should successfully get basic board insights', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                {
                  alias: 'status',
                  value: { value_string: 'Done' },
                },
                {
                  alias: 'COUNT_item_id_0',
                  value: { result: 5 },
                },
              ],
            },
            {
              entries: [
                {
                  alias: 'status',
                  value: { value_string: 'Working on it' },
                },
                {
                  alias: 'COUNT_item_id_0',
                  value: { result: 3 },
                },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'status' }, { columnId: 'item_id', function: AggregateSelectFunctionName.Count }],
        groupBy: ['status'],
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      expect(result.content).toContain('Board insights result (2 rows)');
      expect(result.content).toContain('"status": "Done"');
      expect(result.content).toContain('"COUNT_item_id_0": 5');
      expect(result.content).toContain('"status": "Working on it"');
      expect(result.content).toContain('"COUNT_item_id_0": 3');

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query aggregateBoardInsights'),
        expect.objectContaining({
          query: expect.objectContaining({
            from: { id: '123456', type: AggregateFromElementType.Table },
          }),
        }),
      );
    });

    it('should handle insights with filters', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                {
                  alias: 'COUNT_item_id_0',
                  value: { result: 10 },
                },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'item_id', function: AggregateSelectFunctionName.Count }],
        filters: [
          {
            columnId: 'status',
            compareValue: 'Done',
            operator: ItemsQueryRuleOperator.AnyOf,
          },
        ],
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      expect(result.content).toContain('Board insights result (1 rows)');
      expect(result.content).toContain('"COUNT_item_id_0": 10');

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].query.query).toEqual({
        rules: [
          {
            column_id: 'status',
            compare_value: 'Done',
            operator: ItemsQueryRuleOperator.AnyOf,
            compare_attribute: undefined,
          },
        ],
        operator: ItemsQueryOperator.And,
      });
    });

    it('should handle insights with limit', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                {
                  alias: 'status',
                  value: { value_string: 'Done' },
                },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'status' }],
        limit: 5,
        filtersOperator: ItemsQueryOperator.And,
      });

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].query.limit).toBe(5);
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        aggregate: {
          results: [],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'status' }],
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      expect(result.content).toBe('No board insights found for the given query.');
    });

    it('should handle null aggregate response', async () => {
      const mockResponse = {
        aggregate: null,
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'status' }],
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      expect(result.content).toBe('No board insights found for the given query.');
    });

    it('should handle different value types in results', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                {
                  alias: 'string_col',
                  value: { value_string: 'text value' },
                },
                {
                  alias: 'int_col',
                  value: { value_int: 42 },
                },
                {
                  alias: 'float_col',
                  value: { value_float: 3.14 },
                },
                {
                  alias: 'bool_col',
                  value: { value_boolean: true },
                },
                {
                  alias: 'result_col',
                  value: { result: 100 },
                },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [
          { columnId: 'string_col' },
          { columnId: 'int_col' },
          { columnId: 'float_col' },
          { columnId: 'bool_col' },
          { columnId: 'result_col', function: AggregateSelectFunctionName.Count },
        ],
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      expect(result.content).toContain('"string_col": "text value"');
      expect(result.content).toContain('"int_col": 42');
      expect(result.content).toContain('"float_col": 3.14');
      expect(result.content).toContain('"bool_col": true');
      expect(result.content).toContain('"result_col": 100');
    });

    it('should handle null values in results', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                {
                  alias: 'status',
                  value: null,
                },
                {
                  alias: 'count',
                  value: { result: 5 },
                },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'status' }, { columnId: 'item_id', function: AggregateSelectFunctionName.Count }],
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      expect(result.content).toContain('"status": null');
      expect(result.content).toContain('"count": 5');
    });

    it('should handle entries with no alias', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                {
                  alias: '',
                  value: { value_string: 'should be ignored' },
                },
                {
                  alias: 'status',
                  value: { value_string: 'Done' },
                },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'status' }],
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      const parsedResult = JSON.parse(result.content.split(':\n')[1]);
      expect(parsedResult[0]).toEqual({ status: 'Done' });
      expect(parsedResult[0]).not.toHaveProperty('');
    });

    it('should handle API errors', async () => {
      mocks.setError('Board not found');

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      await expect(
        tool.execute({
          boardId: 999999,
          aggregations: [{ columnId: 'status' }],
          filtersOperator: ItemsQueryOperator.And,
          limit: DEFAULT_LIMIT,
        }),
      ).rejects.toThrow('Board not found');
    });

    it('should handle GraphQL response errors', async () => {
      const graphqlError = new Error('GraphQL Error');
      (graphqlError as any).response = {
        errors: [{ message: 'Invalid column ID' }, { message: 'Access denied' }],
      };
      mocks.setError(graphqlError);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      await expect(
        tool.execute({
          boardId: 123456,
          aggregations: [{ columnId: 'invalid_column' }],
          filtersOperator: ItemsQueryOperator.And,
          limit: DEFAULT_LIMIT,
        }),
      ).rejects.toThrow('GraphQL Error');
    });

    it('should handle complex aggregation with multiple group by columns', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                { alias: 'status', value: { value_string: 'Done' } },
                { alias: 'priority', value: { value_string: 'High' } },
                { alias: 'SUM_numbers_0', value: { result: 150 } },
                { alias: 'AVERAGE_numbers_0', value: { result: 30 } },
              ],
            },
            {
              entries: [
                { alias: 'status', value: { value_string: 'Done' } },
                { alias: 'priority', value: { value_string: 'Low' } },
                { alias: 'SUM_numbers_0', value: { result: 80 } },
                { alias: 'AVERAGE_numbers_0', value: { result: 20 } },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [
          { columnId: 'status' },
          { columnId: 'priority' },
          { columnId: 'numbers', function: AggregateSelectFunctionName.Sum },
          { columnId: 'numbers', function: AggregateSelectFunctionName.Average },
        ],
        groupBy: ['status', 'priority'],
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      expect(result.content).toContain('Board insights result (2 rows)');
      expect(result.content).toContain('"status": "Done"');
      expect(result.content).toContain('"priority": "High"');
      expect(result.content).toContain('"SUM_numbers_0": 150');
      expect(result.content).toContain('"AVERAGE_numbers_0": 30');
      expect(result.content).toContain('"priority": "Low"');
      expect(result.content).toContain('"SUM_numbers_0": 80');
      expect(result.content).toContain('"AVERAGE_numbers_0": 20');
    });

    it('should handle insights with single column orderBy', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                { alias: 'status', value: { value_string: 'Done' } },
                { alias: 'COUNT_item_id_0', value: { result: 5 } },
              ],
            },
            {
              entries: [
                { alias: 'status', value: { value_string: 'Working on it' } },
                { alias: 'COUNT_item_id_0', value: { result: 3 } },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'status' }, { columnId: 'item_id', function: AggregateSelectFunctionName.Count }],
        groupBy: ['status'],
        orderBy: [
          {
            columnId: 'status',
            direction: ItemsOrderByDirection.Asc,
          },
        ],
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].query.query).toEqual({
        order_by: [
          {
            column_id: 'status',
            direction: ItemsOrderByDirection.Asc,
          },
        ],
      });
    });

    it('should handle insights with multiple column orderBy', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                { alias: 'status', value: { value_string: 'Done' } },
                { alias: 'priority', value: { value_string: 'High' } },
                { alias: 'COUNT_item_id_0', value: { result: 2 } },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      await tool.execute({
        boardId: 123456,
        aggregations: [
          { columnId: 'status' },
          { columnId: 'priority' },
          { columnId: 'item_id', function: AggregateSelectFunctionName.Count },
        ],
        groupBy: ['status', 'priority'],
        orderBy: [
          {
            columnId: 'status',
            direction: ItemsOrderByDirection.Asc,
          },
          {
            columnId: 'priority',
            direction: ItemsOrderByDirection.Desc,
          },
        ],
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].query.query).toEqual({
        order_by: [
          {
            column_id: 'status',
            direction: ItemsOrderByDirection.Asc,
          },
          {
            column_id: 'priority',
            direction: ItemsOrderByDirection.Desc,
          },
        ],
      });
    });

    it('should handle insights with filters and orderBy combined', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                { alias: 'status', value: { value_string: 'Done' } },
                { alias: 'COUNT_item_id_0', value: { result: 8 } },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'status' }, { columnId: 'item_id', function: AggregateSelectFunctionName.Count }],
        groupBy: ['status'],
        filters: [
          {
            columnId: 'priority',
            compareValue: 'High',
            operator: ItemsQueryRuleOperator.AnyOf,
          },
        ],
        filtersOperator: ItemsQueryOperator.And,
        orderBy: [
          {
            columnId: 'COUNT_item_id_0',
            direction: ItemsOrderByDirection.Desc,
          },
        ],
        limit: DEFAULT_LIMIT,
      });

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].query.query).toEqual({
        rules: [
          {
            column_id: 'priority',
            compare_value: 'High',
            operator: ItemsQueryRuleOperator.AnyOf,
            compare_attribute: undefined,
          },
        ],
        operator: ItemsQueryOperator.And,
        order_by: [
          {
            column_id: 'COUNT_item_id_0',
            direction: ItemsOrderByDirection.Desc,
          },
        ],
      });
    });

    it('should handle orderBy with DESC direction', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                { alias: 'created_at', value: { value_string: '2024-01-15' } },
                { alias: 'COUNT_item_id_0', value: { result: 10 } },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      await tool.execute({
        boardId: 123456,
        aggregations: [
          { columnId: 'created_at' },
          { columnId: 'item_id', function: AggregateSelectFunctionName.Count },
        ],
        groupBy: ['created_at'],
        orderBy: [
          {
            columnId: 'created_at',
            direction: ItemsOrderByDirection.Desc,
          },
        ],
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].query.query.order_by[0].direction).toBe(ItemsOrderByDirection.Desc);
    });

    it('should count items using COUNT_ITEMS function', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                {
                  alias: 'COUNT_ITEMS_item_id_0',
                  value: { result: 42 },
                },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [
          {
            columnId: 'item_id',
            function: AggregateSelectFunctionName.CountItems,
          },
        ],
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      expect(result.content).toContain('Board insights result (1 rows)');
      expect(result.content).toContain('"COUNT_ITEMS_item_id_0": 42');

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query aggregateBoardInsights'),
        expect.objectContaining({
          query: expect.objectContaining({
            from: { id: '123456', type: AggregateFromElementType.Table },
            select: expect.arrayContaining([
              expect.objectContaining({
                type: AggregateSelectElementType.Function,
                function: expect.objectContaining({
                  function: AggregateSelectFunctionName.CountItems,
                }),
              }),
            ]),
          }),
        }),
      );
    });

    it('should count items with filters applied', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                {
                  alias: 'COUNT_ITEMS_item_id_0',
                  value: { result: 15 },
                },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [
          {
            columnId: 'item_id',
            function: AggregateSelectFunctionName.CountItems,
          },
        ],
        filters: [
          {
            columnId: 'status',
            compareValue: 'Done',
            operator: ItemsQueryRuleOperator.AnyOf,
          },
        ],
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      expect(result.content).toContain('Board insights result (1 rows)');
      expect(result.content).toContain('"COUNT_ITEMS_item_id_0": 15');

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].query.query).toEqual({
        rules: [
          {
            column_id: 'status',
            compare_value: 'Done',
            operator: ItemsQueryRuleOperator.AnyOf,
            compare_attribute: undefined,
          },
        ],
        operator: ItemsQueryOperator.And,
      });
    });

    it('should have correct metadata', () => {
      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      expect(tool.name).toBe('board_insights');
      expect(tool.type).toBe('read');
      expect(tool.getDescription()).toBe(
        "This tool allows you to calculate insights about board's data by filtering, grouping and aggregating columns. For example, you can get the total number of items in a board, the number of items in each status, the number of items in each column, etc. " +
          "Use this tool when you need to get a summary of the board's data, for example, you want to know the total number of items in a board, the number of items in each status, the number of items in each column, etc." +
          "[REQUIRED PRECONDITION]: Before using this tool, if you are not familiar with the board's structure (column IDs, column types, status labels, etc.), first use get_board_info to understand the board metadata. This is essential for constructing proper filters and knowing which columns are available.",
      );
      expect(tool.annotations.title).toBe('Get Board Insights');
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.annotations.destructiveHint).toBe(false);
      expect(tool.annotations.idempotentHint).toBe(true);
    });
  });

  describe('Stringified Fields (Microsoft Copilot compatibility)', () => {
    let mocks: ReturnType<typeof createMockApiClient>;

    beforeEach(() => {
      mocks = createMockApiClient();
      jest.clearAllMocks();
    });

    it('should handle aggregationsStringified field', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                {
                  alias: 'status',
                  value: { value_string: 'Done' },
                },
                {
                  alias: 'COUNT_item_id_0',
                  value: { result: 5 },
                },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      const aggregations = [
        { columnId: 'status' },
        { columnId: 'item_id', function: AggregateSelectFunctionName.Count },
      ];

      const result = await tool.execute({
        boardId: 123456,
        aggregationsStringified: JSON.stringify(aggregations),
        groupBy: ['status'],
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      expect(result.content).toContain('Board insights result (1 rows)');
      expect(result.content).toContain('"status": "Done"');
      expect(result.content).toContain('"COUNT_item_id_0": 5');

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query aggregateBoardInsights'),
        expect.objectContaining({
          query: expect.objectContaining({
            from: { id: '123456', type: AggregateFromElementType.Table },
          }),
        }),
      );
    });

    it('should handle filtersStringified field', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                {
                  alias: 'COUNT_item_id_0',
                  value: { result: 10 },
                },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      const filters = [
        {
          columnId: 'status',
          compareValue: 'Done',
          operator: ItemsQueryRuleOperator.AnyOf,
        },
      ];

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'item_id', function: AggregateSelectFunctionName.Count }],
        filtersStringified: JSON.stringify(filters),
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      expect(result.content).toContain('Board insights result (1 rows)');
      expect(result.content).toContain('"COUNT_item_id_0": 10');

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].query.query).toEqual({
        rules: [
          {
            column_id: 'status',
            compare_value: 'Done',
            operator: ItemsQueryRuleOperator.AnyOf,
            compare_attribute: undefined,
          },
        ],
        operator: ItemsQueryOperator.And,
      });
    });

    it('should handle orderByStringified field', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                { alias: 'status', value: { value_string: 'Done' } },
                { alias: 'COUNT_item_id_0', value: { result: 5 } },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      const orderBy = [
        {
          columnId: 'status',
          direction: ItemsOrderByDirection.Asc,
        },
      ];

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'status' }, { columnId: 'item_id', function: AggregateSelectFunctionName.Count }],
        groupBy: ['status'],
        orderByStringified: JSON.stringify(orderBy),
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      expect(result.content).toContain('Board insights result (1 rows)');

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].query.query).toEqual({
        order_by: [
          {
            column_id: 'status',
            direction: ItemsOrderByDirection.Asc,
          },
        ],
      });
    });

    it('should handle all stringified fields together', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                { alias: 'status', value: { value_string: 'Done' } },
                { alias: 'COUNT_item_id_0', value: { result: 8 } },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      const aggregations = [
        { columnId: 'status' },
        { columnId: 'item_id', function: AggregateSelectFunctionName.Count },
      ];

      const filters = [
        {
          columnId: 'priority',
          compareValue: 'High',
          operator: ItemsQueryRuleOperator.AnyOf,
        },
      ];

      const orderBy = [
        {
          columnId: 'COUNT_item_id_0',
          direction: ItemsOrderByDirection.Desc,
        },
      ];

      const result = await tool.execute({
        boardId: 123456,
        aggregationsStringified: JSON.stringify(aggregations),
        groupBy: ['status'],
        filtersStringified: JSON.stringify(filters),
        filtersOperator: ItemsQueryOperator.And,
        orderByStringified: JSON.stringify(orderBy),
        limit: DEFAULT_LIMIT,
      });

      expect(result.content).toContain('Board insights result (1 rows)');
      expect(result.content).toContain('"status": "Done"');
      expect(result.content).toContain('"COUNT_item_id_0": 8');

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].query.query).toEqual({
        rules: [
          {
            column_id: 'priority',
            compare_value: 'High',
            operator: ItemsQueryRuleOperator.AnyOf,
            compare_attribute: undefined,
          },
        ],
        operator: ItemsQueryOperator.And,
        order_by: [
          {
            column_id: 'COUNT_item_id_0',
            direction: ItemsOrderByDirection.Desc,
          },
        ],
      });
    });

    it('should return error when neither aggregations nor aggregationsStringified is provided', async () => {
      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      expect(result.content).toBe(
        'Input must contain either the "aggregations" field or the "aggregationsStringified" field.',
      );
    });

    it('should prefer non-stringified field over stringified when both provided', async () => {
      const mockResponse = {
        aggregate: {
          results: [
            {
              entries: [
                {
                  alias: 'priority',
                  value: { value_string: 'High' },
                },
              ],
            },
          ],
        },
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardInsightsTool(mocks.mockApiClient, 'fake_token');

      // Non-stringified has priority
      const correctAggregations = [{ columnId: 'priority' }];

      // Stringified should be ignored
      const wrongAggregations = [{ columnId: 'status' }];

      const result = await tool.execute({
        boardId: 123456,
        aggregations: correctAggregations,
        aggregationsStringified: JSON.stringify(wrongAggregations),
        filtersOperator: ItemsQueryOperator.And,
        limit: DEFAULT_LIMIT,
      });

      expect(result.content).toContain('Board insights result (1 rows)');
      expect(result.content).toContain('"priority": "High"');

      // Should use priority, not status
      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].query.select).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            column: { column_id: 'priority' },
          }),
        ]),
      );
    });
  });
});
