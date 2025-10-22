import { ToolInputType } from 'src/core/tool';
import { boardInsightsToolSchema } from './board-insights-tool';
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
import { transformativeFunctions } from './board-insights.consts';

export function handleFrom(input: ToolInputType<typeof boardInsightsToolSchema>): AggregateFromTableInput {
  return {
    id: input.boardId.toString(),
    type: AggregateFromElementType.Table,
  };
}

export function handleFilters(input: ToolInputType<typeof boardInsightsToolSchema>): ItemsQuery | undefined {
  if (!input.filters && !input.orderBy) {
    return undefined;
  }
  const filters: ItemsQuery = {};
  if (input.filters) {
    filters.rules = input.filters.map((rule) => ({
      column_id: rule.columnId,
      compare_value: rule.compareValue,
      operator: rule.operator,
      compare_attribute: rule.compareAttribute,
    }));
    filters.operator = input.filtersOperator;
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
  // special case: count items has no params
  return {
    function: functionName,
    params:
      functionName === AggregateSelectFunctionName.CountItems
        ? []
        : [
            {
              type: AggregateSelectElementType.Column,
              column: handleSelectColumnElement(columnId),
              as: columnId,
            },
          ],
  };
}

export function handleOrderBy(input: ToolInputType<typeof boardInsightsToolSchema>): ItemsQueryOrderBy[] | undefined {
  return input.orderBy?.map((orderBy) => ({
    column_id: orderBy.columnId,
    direction: orderBy.direction,
  }));
}

export function handleSelectAndGroupByElements(input: ToolInputType<typeof boardInsightsToolSchema>): {
  selectElements: AggregateSelectElementInput[];
  groupByElements: AggregateGroupByElementInput[];
} {
  const aliasKeyMap: Record<string, number> = {};

  const groupByElements: AggregateGroupByElementInput[] =
    input.groupBy?.map((columnId) => ({
      column_id: columnId,
    })) || [];

  const selectElements = input.aggregations!.map((aggregation) => {
    // handle a function
    if (aggregation.function) {
      // create a unique alias for the select element
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

    // handle a column
    const selectElement: AggregateSelectElementInput = {
      type: AggregateSelectElementType.Column,
      column: handleSelectColumnElement(aggregation.columnId),
      as: aggregation.columnId,
    };
    // plain columns must be in group by. add if not already in group by
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
