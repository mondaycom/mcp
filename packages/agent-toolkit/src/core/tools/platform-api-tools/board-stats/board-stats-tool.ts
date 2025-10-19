import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { boardStats } from './board-stats.graphql';
import {
  AggregateSelectFunctionName,
  ItemsQueryOperator,
  ItemsQueryRuleOperator,
  AggregateBoardStatsQueryVariables,
  AggregateBoardStatsQuery,
} from 'src/monday-graphql/generated/graphql';
import { handleFilters, handleFrom, handleSelectAndGroupByElements } from './board-stats-utils';

export const boardStatsToolSchema = {
  boardId: z.number().describe('The id of the board to get stats for'),
  aggregations: z
    .array(
      z.object({
        function: z
          .nativeEnum(AggregateSelectFunctionName)
          .describe('The function of the aggregation. Excludes complex functions like case, between, left.')
          .optional(),
        columnId: z.string().describe('The id of the column to aggregate'),
      }),
    )
    .describe('The aggregations to get. Transformative functions and plain columns (no function) must be in group by.'),
  groupBy: z
    .array(z.string())
    .describe(
      'The columns to group by. All columns in the group by must be in the aggregations as well without a function.',
    )
    .optional(),
  limit: z.number().describe('The limit of the results').optional(),
  filters: z
    .object({
      rules: z
        .array(
          z.object({
            columnId: z.string().describe('The id of the column to filter by'),
            compareAttribute: z.string().optional().describe('The attribute to compare the value to, if needed'),
            compareValue: z
              .any()
              .describe(
                'The value to compare the attribute to. This can be a string or index value depending on the column type.',
              ),
            operator: z.nativeEnum(ItemsQueryRuleOperator).describe('The operator to use for the filter'),
          }),
        )
        .describe(
          'The configuration of filters to apply on the items. Before sending the filters, use get_board_info tool to check "Filtering Guidelines" section for filtering by the column.',
        ),
      operator: z.nativeEnum(ItemsQueryOperator).describe('The logical condition to use for the filters').optional(),
    })
    .optional()
    .describe('The configuration of filters to apply on the items.'),
};

export class BoardStatsTool extends BaseMondayApiTool<typeof boardStatsToolSchema> {
  name = 'board_stats';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'List Workspaces',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'List all workspaces available to the user. Returns up to 500 workspaces with their ID, name, and description.';
  }

  getInputSchema(): typeof boardStatsToolSchema {
    return boardStatsToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof boardStatsToolSchema>): Promise<ToolOutputType<never>> {
    const { selectElements, groupByElements } = handleSelectAndGroupByElements(input);

    const variables: AggregateBoardStatsQueryVariables = {
      query: {
        from: handleFrom(input),
        query: handleFilters(input),
        select: selectElements,
        group_by: groupByElements,
        limit: input.limit,
      },
    };

    const res = await this.mondayApi.request<AggregateBoardStatsQuery>(boardStats, variables);
    const rows = (res.aggregate?.results ?? []).map((resultSet) => {
      const row: Record<string, string | number | boolean | null> = {};
      (resultSet.entries ?? []).forEach((entry) => {
        const alias = entry.alias ?? '';
        if (!alias) return;
        const value = entry.value;
        if (!value) {
          row[alias] = null;
          return;
        }
        switch (value.__typename) {
          case 'AggregateBasicAggregationResult': {
            row[alias] = value.result ?? null;
            break;
          }
          case 'AggregateGroupByResult': {
            const v = value.value_string ?? value.value_int ?? value.value_float ?? value.value_boolean ?? null;
            row[alias] = v;
            break;
          }
          default: {
            row[alias] = null;
          }
        }
      });
      return row;
    });

    if (!rows.length) {
      return { content: 'No board stats found for the given query.' };
    }

    return {
      content: `Board stats result (${rows.length} rows):\n${JSON.stringify(rows, null, 2)}`,
    };
  }
}
