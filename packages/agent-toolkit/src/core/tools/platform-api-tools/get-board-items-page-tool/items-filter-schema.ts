import { z } from 'zod';

import { ColumnTypeInfoFetchMode } from '../get-column-type-info/get-column-type-info-fetch-mode';

import {
  ItemsQueryOperator,
  ItemsQueryRuleOperator,
} from '../../../../monday-graphql/generated/graphql/graphql';

// IMPORTANT:
// ------------------------------------------------------------------------------------------------
// THESE FILTER SCHEMAS ARE SHARED WITH get_full_board_data tool and are also copied to 
// hosted-mcp/src/components/table/items-filter-schema.ts in order to support filtering in the mcp ui table.
// If changing these schemas, make sure to update the copies in the hosted-mcp project as well and test the ui flow as well.
// ------------------------------------------------------------------------------------------------
export const filterRulesSchema = z
  .array(
    z.object({
      columnId: z.string().describe('The id of the column to filter by'),
      compareAttribute: z
        .string()
        .optional()
        .describe('The attribute to compare the value to. This is OPTIONAL property.'),
      compareValue: z
        .union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))])
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
    `The configuration of filters to apply on the items. Use get_board_info for column ids and types on the board. Before sending the filters, use get_column_type_info with fetchMode "${ColumnTypeInfoFetchMode.Guidelines}" and use data.guidelines.filter (null if that type has no documented rules).`,
  );

export const filtersOperatorSchema = z
  .nativeEnum(ItemsQueryOperator)
  .optional()
  .default(ItemsQueryOperator.And)
  .describe('The operator to use for the filters')
