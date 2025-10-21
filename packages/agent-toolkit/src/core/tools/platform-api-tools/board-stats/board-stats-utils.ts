import { ToolInputType } from 'src/core/tool';
import { boardStatsToolSchema } from './board-stats-tool';
import {
  AggregateFromElementType,
  AggregateFromTableInput,
  AggregateGroupByElementInput,
  AggregateSelectColumnInput,
  AggregateSelectElementInput,
  AggregateSelectElementType,
  AggregateSelectFunctionInput,
  AggregateSelectFunctionName,
  ItemsQuery,
  ItemsQueryOrderBy,
} from 'src/monday-graphql/generated/graphql';
import { complexFunctions, transformativeFunctions } from './board-stats.consts';

export function handleFrom(input: ToolInputType<typeof boardStatsToolSchema>): AggregateFromTableInput {
  return {
    id: input.boardId.toString(),
    type: AggregateFromElementType.Table,
  };
}

export function handleFilters(input: ToolInputType<typeof boardStatsToolSchema>): ItemsQuery | undefined {
  if (!input.filters && !input.orderBy) {
    return undefined;
  }
  const filters: ItemsQuery = {};
  if (input.filters) {
    filters.rules = input.filters.rules.map((rule) => ({
      column_id: rule.columnId,
      compare_value: rule.compareValue,
      operator: rule.operator,
      compare_attribute: rule.compareAttribute,
    }));
    filters.operator = input.filters.operator;
  }
  if (input.orderBy) {
    filters.order_by = handleOrderBy(input);
  }
  return filters;
}

function handleSelectColumnElement(columnId: string): AggregateSelectColumnInput {
  return {
    column_id: columnId,
  };
}

function handleSelectFunctionElement(
  functionName: AggregateSelectFunctionName,
  columnId: string,
): AggregateSelectFunctionInput {
  return {
    function: functionName,
    params: [
      {
        type: AggregateSelectElementType.Column,
        column: handleSelectColumnElement(columnId),
        as: columnId,
      },
    ],
  };
}

export function handleOrderBy(input: ToolInputType<typeof boardStatsToolSchema>): ItemsQueryOrderBy[] | undefined {
  return input.orderBy?.map((orderBy) => ({
    column_id: orderBy.columnId,
    direction: orderBy.direction,
  }));
}

export function handleSelectAndGroupByElements(input: ToolInputType<typeof boardStatsToolSchema>): {
  selectElements: AggregateSelectElementInput[];
  groupByElements: AggregateGroupByElementInput[];
} {
  const aliasKeyMap: Record<string, number> = {};

  const groupByElements: AggregateGroupByElementInput[] =
    input.groupBy?.map((columnId) => ({
      column_id: columnId,
    })) || [];

  const selectElements = input.aggregations.map((aggregation) => {
    if (aggregation.function) {
      if (complexFunctions.has(aggregation.function)) {
        throw new Error(`Complex function ${aggregation.function} is not supported`);
      }
      const elementKey = `${aggregation.function}_${aggregation.columnId}`;
      const aliasKeyIndex = aliasKeyMap[elementKey] || 0;
      aliasKeyMap[elementKey] = aliasKeyIndex + 1;
      const alias = `${elementKey}_${aliasKeyIndex}`;

      if (transformativeFunctions.has(aggregation.function)) {
        // transformative functions must be in group by
        if (!groupByElements.some((groupByElement) => groupByElement.column_id === alias)) {
          // if not in group by, add to group by
          groupByElements.push({
            column_id: alias,
          });
        }
      }

      const selectElement: AggregateSelectElementInput = {
        type: AggregateSelectElementType.Function,
        function: handleSelectFunctionElement(aggregation.function, aggregation.columnId),
        as: alias,
      };
      return selectElement;
    }

    const selectElement: AggregateSelectElementInput = {
      type: AggregateSelectElementType.Column,
      column: handleSelectColumnElement(aggregation.columnId),
      as: aggregation.columnId,
    };
    if (!groupByElements.some((groupByElement) => groupByElement.column_id === aggregation.columnId)) {
      groupByElements.push({
        column_id: aggregation.columnId,
      });
    }
    return selectElement;
  });

  groupByElements.forEach((groupByElement) => {
    // check if theres a group by element with no matching select
    if (!selectElements.some((selectElement) => selectElement.as === groupByElement.column_id)) {
      // if no matching select, add a column select element
      selectElements.push({
        type: AggregateSelectElementType.Column,
        column: handleSelectColumnElement(groupByElement.column_id),
        as: groupByElement.column_id,
      });
    }
  });

  return { selectElements, groupByElements };
}
