import { createMockApiClient } from '../test-utils/mock-api-client';
import { BoardStatsTool } from './board-stats-tool';
import { handleFrom, handleFilters, handleSelectAndGroupByElements } from './board-stats-utils';
import {
  AggregateSelectFunctionName,
  ItemsQueryOperator,
  ItemsQueryRuleOperator,
  AggregateFromElementType,
  AggregateSelectElementType,
} from 'src/monday-graphql/generated/graphql';

describe('Board Stats Tool', () => {
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
          filters: {
            rules: [
              {
                columnId: 'status',
                compareValue: 'Done',
                operator: ItemsQueryRuleOperator.AnyOf,
              },
            ],
            operator: ItemsQueryOperator.And,
          },
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
          filters: {
            rules: [
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
            operator: ItemsQueryOperator.Or,
          },
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

      it('should throw error for complex functions', () => {
        const input = {
          boardId: 123,
          aggregations: [
            {
              columnId: 'status',
              function: AggregateSelectFunctionName.Case,
            },
          ],
        };

        expect(() => handleSelectAndGroupByElements(input as any)).toThrow('Complex function CASE is not supported');
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

  describe('BoardStatsTool Execution', () => {
    let mocks: ReturnType<typeof createMockApiClient>;

    beforeEach(() => {
      mocks = createMockApiClient();
      jest.clearAllMocks();
    });

    it('should successfully get basic board stats', async () => {
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

      const tool = new BoardStatsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'status' }, { columnId: 'item_id', function: AggregateSelectFunctionName.Count }],
        groupBy: ['status'],
      });

      expect(result.content).toContain('Board stats result (2 rows)');
      expect(result.content).toContain('"status": "Done"');
      expect(result.content).toContain('"COUNT_item_id_0": 5');
      expect(result.content).toContain('"status": "Working on it"');
      expect(result.content).toContain('"COUNT_item_id_0": 3');

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query aggregateBoardStats'),
        expect.objectContaining({
          query: expect.objectContaining({
            from: { id: '123456', type: AggregateFromElementType.Table },
          }),
        }),
      );
    });

    it('should handle stats with filters', async () => {
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

      const tool = new BoardStatsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'item_id', function: AggregateSelectFunctionName.Count }],
        filters: {
          rules: [
            {
              columnId: 'status',
              compareValue: 'Done',
              operator: ItemsQueryRuleOperator.AnyOf,
            },
          ],
          operator: ItemsQueryOperator.And,
        },
      });

      expect(result.content).toContain('Board stats result (1 rows)');
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

    it('should handle stats with limit', async () => {
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

      const tool = new BoardStatsTool(mocks.mockApiClient, 'fake_token');

      await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'status' }],
        limit: 5,
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

      const tool = new BoardStatsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'status' }],
      });

      expect(result.content).toBe('No board stats found for the given query.');
    });

    it('should handle null aggregate response', async () => {
      const mockResponse = {
        aggregate: null,
      };

      mocks.setResponse(mockResponse);

      const tool = new BoardStatsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'status' }],
      });

      expect(result.content).toBe('No board stats found for the given query.');
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

      const tool = new BoardStatsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [
          { columnId: 'string_col' },
          { columnId: 'int_col' },
          { columnId: 'float_col' },
          { columnId: 'bool_col' },
          { columnId: 'result_col', function: AggregateSelectFunctionName.Count },
        ],
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

      const tool = new BoardStatsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'status' }, { columnId: 'item_id', function: AggregateSelectFunctionName.Count }],
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

      const tool = new BoardStatsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [{ columnId: 'status' }],
      });

      const parsedResult = JSON.parse(result.content.split(':\n')[1]);
      expect(parsedResult[0]).toEqual({ status: 'Done' });
      expect(parsedResult[0]).not.toHaveProperty('');
    });

    it('should handle API errors', async () => {
      mocks.setError('Board not found');

      const tool = new BoardStatsTool(mocks.mockApiClient, 'fake_token');

      await expect(
        tool.execute({
          boardId: 999999,
          aggregations: [{ columnId: 'status' }],
        }),
      ).rejects.toThrow('Board not found');
    });

    it('should handle GraphQL response errors', async () => {
      const graphqlError = new Error('GraphQL Error');
      (graphqlError as any).response = {
        errors: [{ message: 'Invalid column ID' }, { message: 'Access denied' }],
      };
      mocks.setError(graphqlError);

      const tool = new BoardStatsTool(mocks.mockApiClient, 'fake_token');

      await expect(
        tool.execute({
          boardId: 123456,
          aggregations: [{ columnId: 'invalid_column' }],
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

      const tool = new BoardStatsTool(mocks.mockApiClient, 'fake_token');

      const result = await tool.execute({
        boardId: 123456,
        aggregations: [
          { columnId: 'status' },
          { columnId: 'priority' },
          { columnId: 'numbers', function: AggregateSelectFunctionName.Sum },
          { columnId: 'numbers', function: AggregateSelectFunctionName.Average },
        ],
        groupBy: ['status', 'priority'],
      });

      expect(result.content).toContain('Board stats result (2 rows)');
      expect(result.content).toContain('"status": "Done"');
      expect(result.content).toContain('"priority": "High"');
      expect(result.content).toContain('"SUM_numbers_0": 150');
      expect(result.content).toContain('"AVERAGE_numbers_0": 30');
      expect(result.content).toContain('"priority": "Low"');
      expect(result.content).toContain('"SUM_numbers_0": 80');
      expect(result.content).toContain('"AVERAGE_numbers_0": 20');
    });

    it('should have correct metadata', () => {
      const tool = new BoardStatsTool(mocks.mockApiClient, 'fake_token');

      expect(tool.name).toBe('board_stats');
      expect(tool.type).toBe('read');
      expect(tool.getDescription()).toBe(
        'Get insights and aggregations for a board. Use this tool to get insights and aggregations for a board. For example, you can get the total number of items in a board, the number of items in each status, the number of items in each column, etc.',
      );
      expect(tool.annotations.title).toBe('Get Board Stats');
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.annotations.destructiveHint).toBe(false);
      expect(tool.annotations.idempotentHint).toBe(true);
    });
  });
});
