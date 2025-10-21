import { AggregateSelectFunctionName } from 'src/monday-graphql/generated/graphql';

//omit complex functions like case, between
export const complexFunctions = new Set([
  AggregateSelectFunctionName.Case,
  AggregateSelectFunctionName.Between,
  AggregateSelectFunctionName.Left,
  AggregateSelectFunctionName.Raw,
  AggregateSelectFunctionName.None,
]);

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
  AggregateSelectFunctionName.First,
  AggregateSelectFunctionName.Sum,
  AggregateSelectFunctionName.Average,
  AggregateSelectFunctionName.Median,
  AggregateSelectFunctionName.Min,
  AggregateSelectFunctionName.Max,
  AggregateSelectFunctionName.MinMax,
]);
