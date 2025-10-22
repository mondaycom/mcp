import { AggregateSelectFunctionName } from 'src/monday-graphql/generated/graphql';

export const DEFAULT_LIMIT = 1000;
export const MAX_LIMIT = 1000;

// Functions to exclude from BoardInsightsAggregationFunction
const excludedFunctions = new Set([
  AggregateSelectFunctionName.Case,
  AggregateSelectFunctionName.Between,
  AggregateSelectFunctionName.Left,
  AggregateSelectFunctionName.Raw,
  AggregateSelectFunctionName.None,
  AggregateSelectFunctionName.CountKeys,
]);

// Programmatically create array of allowed aggregation functions
export const BoardInsightsAggregationFunction = Object.values(AggregateSelectFunctionName).filter(
  (fn) => !excludedFunctions.has(fn),
) as [AggregateSelectFunctionName, ...AggregateSelectFunctionName[]];

export const transformativeFunctions = new Set([
  AggregateSelectFunctionName.Left,
  AggregateSelectFunctionName.Trim,
  AggregateSelectFunctionName.Upper,
  AggregateSelectFunctionName.Lower,
  AggregateSelectFunctionName.DateTruncDay,
  AggregateSelectFunctionName.DateTruncWeek,
  AggregateSelectFunctionName.DateTruncMonth,
  AggregateSelectFunctionName.DateTruncQuarter,
  AggregateSelectFunctionName.DateTruncYear,
  AggregateSelectFunctionName.Color,
  AggregateSelectFunctionName.Label,
  AggregateSelectFunctionName.EndDate,
  AggregateSelectFunctionName.StartDate,
  AggregateSelectFunctionName.Hour,
  AggregateSelectFunctionName.PhoneCountryShortName,
  AggregateSelectFunctionName.Person,
  AggregateSelectFunctionName.Upper,
  AggregateSelectFunctionName.Lower,
  AggregateSelectFunctionName.Order,
  AggregateSelectFunctionName.Length,
  AggregateSelectFunctionName.Flatten,
  AggregateSelectFunctionName.IsDone,
]);

export const aggregativeFunctions = new Set([
  AggregateSelectFunctionName.Count,
  AggregateSelectFunctionName.CountDistinct,
  AggregateSelectFunctionName.CountSubitems,
  AggregateSelectFunctionName.CountItems,
  AggregateSelectFunctionName.First,
  AggregateSelectFunctionName.Sum,
  AggregateSelectFunctionName.Average,
  AggregateSelectFunctionName.Median,
  AggregateSelectFunctionName.Min,
  AggregateSelectFunctionName.Max,
  AggregateSelectFunctionName.MinMax,
]);
