import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { boardInsights } from './board-insights.graphql';
import {
  ItemsQueryOperator,
  ItemsQueryRuleOperator,
  AggregateBoardInsightsQueryVariables,
  AggregateBoardInsightsQuery,
  ItemsOrderByDirection,
} from 'src/monday-graphql/generated/graphql';
import { handleFilters, handleFrom, handleSelectAndGroupByElements } from './board-insights-utils';
import { BoardInsightsAggregationFunction, DEFAULT_LIMIT, MAX_LIMIT } from './board-insights.consts';
import { fallbackToStringifiedVersionIfNull } from '../../shared/microsoft-copilot-utils';

export const boardInsightsToolSchema = {
  boardId: z.number().describe('The id of the board to get insights for'),
  aggregationsStringified: z
    .string()
    .optional()
    .describe(
      '**ONLY FOR MICROSOFT COPILOT**: The aggregations to get. Send this as a stringified JSON array of "aggregations" field. Read "aggregations" field description for details how to use it.',
    ),
  aggregations: z
    .array(
      z.object({
        function: z
          .enum(BoardInsightsAggregationFunction)
          .describe('The function of the aggregation. For simple column value leave undefined')
          .optional(),
        columnId: z.string().describe('The id of the column to aggregate'),
      }),
    )
    .describe(
      'The aggregations to get. Transformative functions and plain columns (no function) must be in group by. [REQUIRED PRECONDITION]: Either send this field or the stringified version of it.',
    )
    .optional(),
  groupBy: z
    .array(z.string())
    .describe(
      'The columns to group by. All columns in the group by must be in the aggregations as well without a function.',
    )
    .optional(),
  limit: z.number().describe('The limit of the results').max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
  filtersStringified: z
    .string()
    .optional()
    .describe(
      '**ONLY FOR MICROSOFT COPILOT**: The filters to apply on the items. Send this as a stringified JSON array of "filters" field. Read "filters" field description for details how to use it.',
    ),
  filters: z
    .array(
      z.object({
        columnId: z.string().describe('The id of the column to filter by'),
        compareAttribute: z.string().optional().describe('The attribute to compare the value to'),
        compareValue: z
          .any()
          .describe(
            'The value to compare the attribute to. This can be a string or index value depending on the column type.',
          ),
        operator: z
          .nativeEnum(ItemsQueryRuleOperator)
          .optional()
          .default(ItemsQueryRuleOperator.AnyOf)
          .describe('The operator to use for the filter'),
      }),
    )
    .optional()
    .describe(
      'The configuration of filters to apply on the items. Before sending the filters, use get_board_info tool to check "Filtering Guidelines" section for filtering by the column.',
    ),
  filtersOperator: z
    .nativeEnum(ItemsQueryOperator)
    .optional()
    .default(ItemsQueryOperator.And)
    .describe('The logical operator to use for the filters'),

  orderByStringified: z
    .string()
    .optional()
    .describe(
      '**ONLY FOR MICROSOFT COPILOT**: The order by to apply on the items. Send this as a stringified JSON array of "orderBy" field. Read "orderBy" field description for details how to use it.',
    ),
  orderBy: z
    .array(
      z.object({
        columnId: z.string().describe('The id of the column to order by'),
        direction: z
          .nativeEnum(ItemsOrderByDirection)
          .optional()
          .default(ItemsOrderByDirection.Asc)
          .describe('The direction to order by'),
      }),
    )
    .optional()
    .describe('The columns to order by, will control the order of the items in the response'),
};

export class BoardInsightsTool extends BaseMondayApiTool<typeof boardInsightsToolSchema> {
  name = 'board_insights';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Board Insights',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      "This tool allows you to calculate insights about board's data by filtering, grouping and aggregating columns. For example, you can get the total number of items in a board, the number of items in each status, the number of items in each column, etc. " +
      "Use this tool when you need to get a summary of the board's data, for example, you want to know the total number of items in a board, the number of items in each status, the number of items in each column, etc." +
      "[REQUIRED PRECONDITION]: Before using this tool, if you are not familiar with the board's structure (column IDs, column types, status labels, etc.), first use get_board_info to understand the board metadata. This is essential for constructing proper filters and knowing which columns are available."
    );
  }

  getInputSchema(): typeof boardInsightsToolSchema {
    return boardInsightsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof boardInsightsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (!input.aggregations && !input.aggregationsStringified) {
      return { content: 'Input must contain either the "aggregations" field or the "aggregationsStringified" field.' };
    }

    fallbackToStringifiedVersionIfNull(input, 'aggregations', boardInsightsToolSchema.aggregations);
    fallbackToStringifiedVersionIfNull(input, 'filters', boardInsightsToolSchema.filters);
    fallbackToStringifiedVersionIfNull(input, 'orderBy', boardInsightsToolSchema.orderBy);

    const { selectElements, groupByElements } = handleSelectAndGroupByElements(input);
    const filters = handleFilters(input);
    const from = handleFrom(input);

    const variables: AggregateBoardInsightsQueryVariables = {
      query: {
        from,
        query: filters,
        select: selectElements,
        group_by: groupByElements,
        limit: input.limit,
      },
    };

    const res = await this.mondayApi.request<AggregateBoardInsightsQuery>(boardInsights, variables);

    const rows = (res.aggregate?.results ?? []).map((resultSet) => {
      const row: Record<string, string | number | boolean | null> = {};
      (resultSet.entries ?? []).forEach((entry) => {
        const alias = entry.alias ?? '';
        if (!alias) return;
        const value = entry.value as any;
        if (!value) {
          row[alias] = null;
          return;
        }
        const v =
          value.result ?? value.value_string ?? value.value_int ?? value.value_float ?? value.value_boolean ?? null;
        row[alias] = v;
      });
      return row;
    });

    if (!rows.length) {
      return { content: 'No board insights found for the given query.' };
    }

    return {
      content: `Board insights result (${rows.length} rows):\n${JSON.stringify(rows, null, 2)}`,
    };
  }
}
