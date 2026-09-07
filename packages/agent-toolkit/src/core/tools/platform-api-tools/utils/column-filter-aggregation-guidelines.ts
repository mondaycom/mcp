import { AggregateSelectFunctionName } from '../../../../monday-graphql/generated/graphql/graphql';

export const filteringGuidelinesByColumnType: Record<string, string> = {
  group: `Filters items by the board group they belong to. The columnId is the literal string "group" - a group id such as "group_mm6wsvcc" is NEVER a valid columnId. For filtering by group id, use any_of or not_any_of. Use an array of group ids, as returned in an item's group.id or by get_board_info.
EXAMPLES:
  ✅ Correct: {"columnId": "group", "compareValue": ["group_mm6wsvcc"], "operator": "any_of"} // group id goes in compareValue
  ✅ Correct: {"columnId": "group", "compareValue": ["group_mm6wsvcc", "group_mm4w1e0n"], "operator": "any_of"} // several groups
  ❌ Wrong: {"columnId": "group_mm6wsvcc", "compareValue": "group_mm6wsvcc"} // group id used as the columnId
  ❌ Wrong: {"columnId": "__group__", "compareValue": ["group_mm6wsvcc"], "operator": "any_of"} // the columnId is exactly "group", with no surrounding underscores
  ❌ Wrong: {"columnId": "group", "compareValue": "Backlog", "operator": "any_of"} // group title instead of group id`,

  last_updated: `The columnId is the literal string "__last_updated__", with two underscores before and after. Supported operators: any_of, not_any_of, within_the_last. With any_of and not_any_of, compareValue is an array holding one of "TODAY", "YESTERDAY", "THIS_WEEK", "THIS_MONTH". Optionally pair it with compareAttribute: "UPDATED_AT" to compare the update date rather than the person who updated. For any other range, including the previous week or month, use within_the_last with a [UNIT, AMOUNT] window.
This id is also the correct one to use in orderBy to sort items by when they were last updated.
EXAMPLES:
  ✅ Correct: {"columnId": "__last_updated__", "compareValue": ["TODAY"], "operator": "any_of", "compareAttribute": "UPDATED_AT"} // updated today
  ✅ Correct: {"columnId": "__last_updated__", "compareValue": ["THIS_WEEK"], "operator": "not_any_of", "compareAttribute": "UPDATED_AT"} // using THIS_WEEK with not_any_of
  ✅ Correct: {"columnId": "__last_updated__", "compareValue": ["DAYS", 7], "operator": "within_the_last", "compareAttribute": "UPDATED_AT"} // updated in the last 7 days
  ✅ Correct: {"columnId": "__last_updated__", "compareValue": ["WEEKS", 1], "operator": "within_the_last", "compareAttribute": "UPDATED_AT"} // updated in the previous week
  ❌ Wrong: {"columnId": "last_updated", "compareValue": ["TODAY"], "operator": "any_of", "compareAttribute": "UPDATED_AT"} // missing the underscores around last_updated
  ❌ Wrong: {"columnId": "__last_updated__", "compareValue": ["LAST_MONTH"], "operator": "any_of", "compareAttribute": "UPDATED_AT"} // LAST_MONTH and LAST_WEEK match no items, use within_the_last with ["MONTHS", 1] or ["WEEKS", 1]
  ❌ Wrong: {"columnId": "__last_updated__", "compareValue": "TODAY", "operator": "any_of", "compareAttribute": "UPDATED_AT"} // not using array for any_of operator`,

  creation_log: `The columnId is the literal string "__creation_log__", with two underscores before and after. Supported operators: any_of, not_any_of, within_the_last. With any_of and not_any_of, compareValue is an array holding one of "TODAY", "YESTERDAY", "THIS_WEEK", "THIS_MONTH". Optionally pair it with compareAttribute: "CREATED_AT" to compare the creation date rather than the person who created the item. For any other range, including the previous week or month, use within_the_last with a [UNIT, AMOUNT] window.
This id is also the correct one to use in orderBy to sort items by creation time.
EXAMPLES:
  ✅ Correct: {"columnId": "__creation_log__", "compareValue": ["TODAY"], "operator": "any_of", "compareAttribute": "CREATED_AT"} // items created today
  ✅ Correct: {"columnId": "__creation_log__", "compareValue": ["THIS_WEEK"], "operator": "not_any_of", "compareAttribute": "CREATED_AT"} // items not created this week
  ✅ Correct: {"columnId": "__creation_log__", "compareValue": ["DAYS", 30], "operator": "within_the_last", "compareAttribute": "CREATED_AT"} // created in the last 30 days
  ❌ Wrong: {"columnId": "creation_log", "compareValue": ["TODAY"], "operator": "any_of", "compareAttribute": "CREATED_AT"} // missing the underscores around creation_log
  ❌ Wrong: {"columnId": "__creation_log__", "compareValue": ["LAST_MONTH"], "operator": "any_of", "compareAttribute": "CREATED_AT"} // LAST_MONTH and LAST_WEEK match no items, use within_the_last with ["MONTHS", 1] or ["WEEKS", 1]
  ❌ Wrong: {"columnId": "__creation_log__", "compareValue": ["PAST_DATETIME", "14"], "operator": "within_the_last"} // PAST_DATETIME is not a unit, use ["DAYS", 14]`,

  item_id: `The columnId is the literal string "__item_id__", with two underscores before and after. Prefer the tool's own itemIds argument when you simply want a known set of items - use this filter only when combining an item-id restriction with other filter rules. Supported operators: any_of, not_any_of. CompareValue is an array of item ids as strings.
EXAMPLES:
  ✅ Correct: {"columnId": "__item_id__", "compareValue": ["3208003201"], "operator": "any_of"} // filtering by a single item id
  ✅ Correct: {"columnId": "__item_id__", "compareValue": ["3208003201", "3208003202"], "operator": "not_any_of"} // excluding several item ids
  ❌ Wrong: {"columnId": "item_id", "compareValue": ["3208003201"], "operator": "any_of"} // missing the underscores around item_id
  ❌ Wrong: {"columnId": "pulse_id", "compareValue": ["3208003201"], "operator": "any_of"} // pulse_id is an internal name, not a filterable id`,

  date: `Supported operators: any_of, not_any_of, greater_than, lower_than, within_the_last, within_the_next. CompareValue should be either:
  - Date in "YYYY-MM-DD" format with "EXACT" e.g. compareValue:["EXACT", "2025-01-01"]
  - "TODAY" - Item with today's date
  - "TOMORROW" - Item with tomorrow's date
  - "THIS_WEEK" - Item with this week's date
  - "ONE_WEEK_AGO" - Item with one week ago's date
EXAMPLES:
  ✅ Correct: {"columnId": "date", "compareValue": ["EXACT", "2025-01-01"], "operator": "any_of"} // using exact date format with EXACT
  ✅ Correct: {"columnId": "date", "compareValue": "TODAY", "operator": "greater_than"} // using TODAY with greater_than
  ✅ Correct: {"columnId": "date", "compareValue": ["DAYS", 7], "operator": "within_the_last"} // due in the last 7 days
  ✅ Correct: {"columnId": "date", "compareValue": ["WEEKS", 2], "operator": "within_the_next"} // due in the next 2 weeks
  ❌ Wrong: {"columnId": "date", "compareValue": "2025-01-01", "operator": "any_of"} // missing EXACT string for exact date
  ❌ Wrong: {"columnId": "date", "compareValue": ["TODAY"], "operator": "greater_than"} // using array with single value operator
  ❌ Wrong: {"columnId": "date", "compareValue": 7, "operator": "within_the_last"} // a bare number is not a valid window, use ["DAYS", 7]
  ❌ Wrong: {"columnId": "date", "compareValue": ["EXACT", "2025-01-01"], "operator": "within_the_next"} // within_the_next takes a [UNIT, AMOUNT] window, never an exact date
  ❌ Wrong: {"columnId": "date", "compareValue": "one_week", "compareAttribute": "WEEKS", "operator": "within_the_last"} // the unit belongs inside compareValue, never in compareAttribute`,

  email: `Supported operators: any_of, not_any_of, is_empty, is_not_empty, contains_text, not_contains_text. CompareValue can be:
  - empty string "" when searching for blank values
  - whole email address when searching for specific email
  - partial email when using contains_text, not_contains_text operators
EXAMPLES:
  ✅ Correct: {"columnId": "email", "compareValue": ["john@example.com"], "operator": "any_of"} // using array with any_of for specific email
  ✅ Correct: {"columnId": "email", "compareValue": "gmail", "operator": "contains_text"} // using partial email with contains_text
  ❌ Wrong: {"columnId": "email", "compareValue": "john@example.com", "operator": "any_of"} // not using array with any_of operator
  ❌ Wrong: {"columnId": "email", "compareValue": ["gmail"], "operator": "contains_text"} // using array with single value operator`,

  long_text: `Supported operators: any_of, not_any_of, is_empty, is_not_empty, contains_text, not_contains_text. CompareValue can be either full text or partial text when using contains_text, not_contains_text operators
EXAMPLES:
  ✅ Correct: {"columnId": "long_text", "compareValue": ["Complete project description"], "operator": "any_of"} // using array with any_of for full text
  ✅ Correct: {"columnId": "long_text", "compareValue": "urgent", "operator": "contains_text"} // using partial text with contains_text
  ❌ Wrong: {"columnId": "long_text", "compareValue": "Complete project description", "operator": "any_of"} // not using array with any_of operator
  ❌ Wrong: {"columnId": "long_text", "compareValue": [], "operator": "contains_text"} // using empty array with contains_text operator`,

  text: `Supported operators: any_of, not_any_of, is_empty, is_not_empty, contains_text, not_contains_text. CompareValue can be either full text or partial text when using contains_text, not_contains_text operators
EXAMPLES:
  ✅ Correct: {"columnId": "text", "compareValue": ["Task Name"], "operator": "any_of"} // using array with any_of for full text
  ✅ Correct: {"columnId": "text", "compareValue": "bug", "operator": "contains_text"} // using partial text with contains_text
  ❌ Wrong: {"columnId": "text", "compareValue": "Task Name", "operator": "any_of"} // not using array with any_of operator
  ❌ Wrong: {"columnId": "text", "compareValue": [], "operator": "contains_text"} // using empty array with contains_text operator`,

  numbers: `Supported operators: any_of, not_any_of, greater_than, lower_than. CompareValue is a number or "$$$blank$$$" when searching for blank values
EXAMPLES:
  ✅ Correct: {"columnId": "numbers", "compareValue": [100, 200], "operator": "any_of"} // using array with any_of for multiple numbers
  ✅ Correct: {"columnId": "numbers", "compareValue": 50, "operator": "greater_than"} // using single number with greater_than
  ❌ Wrong: {"columnId": "numbers", "compareValue": 100, "operator": "any_of"} // not using array with any_of operator
  ❌ Wrong: {"columnId": "numbers", "compareValue": ["50"], "operator": "greater_than"} // using array with single value operator`,

  name: `Supported operators: "contains_text", "not_contains_text". CompareValue can be full or partial text
EXAMPLES:
  ✅ Correct: {"columnId": "name", "compareValue": "marketing campaign", "operator": "contains_text"} // using string with contains_text
  ✅ Correct: {"columnId": "name", "compareValue": "marketing campaign", "operator": "not_contains_text"} // using string with not_contains_text`,

  status: `Supported operators: any_of, not_any_of, contains_terms. CompareValue should be either:
  - id of label from column settings - when used with any_of, not_any_of operators
  - label's text - when use with contains_terms
EXAMPLES:
  ✅ Correct: {"columnId": "status", "compareValue": [0, 1], "operator": "any_of"} // Using id values
  ✅ Correct: {"columnId": "status", "compareValue": "Done", "operator": "contains_terms"} // Using label text
  ❌ Wrong: {"columnId": "status", "compareValue": "Done", "operator": "any_of"} // Using label text with wrong operator
  ❌ Wrong: {"columnId": "status", "compareValue": [0, 1], "operator": "contains_terms"} // Using id with wrong operator`,

  checkbox: `Supported operators: is_empty, is_not_empty. Compare value must be an empty array
EXAMPLES:
  ✅ Correct: {"columnId": "column_id", "compareValue": [], "operator": "is_empty"} // using empty array with is_empty operator
  ❌ Wrong: {"columnId": "column_id", "compareValue": null, "operator": "is_empty"} // not using empty array with is_empty operator`,

  people: `Supported operators: any_of, not_any_of, is_empty, is_not_empty. **CRITICAL**: CompareValue MUST be in one of following:
  - "assigned_to_me" - when searching for current user
  - "person-123" - when searching for specific person with id 123
  - "team-456" - when searching for specific team with id 456
  - empty array when using is_empty, is_not_empty operators
EXAMPLES: 
  ❌ Wrong: {"columnId": "column_id", "compareValue": ["person—123"], "operator": "any_of"} // Using long hyphen '—' instead of short hyphen '-'
  ✅ Correct: {"columnId": "column_id", "compareValue": [], "operator": "is_empty"} // using empty array with is_empty operator
  ✅ Correct: {"columnId": "column_id", "compareValue": ["person-80120403"], "operator": "any_of"} // using person prefix
  ✅ Correct: {"columnId": "column_id", "compareValue": ["team-9000"], "operator": "any_of"} // using team prefix
  ✅ Correct: {"columnId": "column_id", "compareValue": ["assigned_to_me"], "operator": "any_of"} // using assigned_to_me value
  ❌ Wrong: {"columnId": "column_id", "compareValue": ["80120403"], "operator": "is_empty"} // using id with is_empty operator
  ❌ Wrong: {"columnId": "column_id", "compareValue": ["80120403"], "operator": "any_of"} // not using person or team prefix`,
};

export function getColumnAggregationGuidelines(): string {
  return `
## [IMPORTANT] Best Practices
- When asked to get count of items you MUST USE ${AggregateSelectFunctionName.CountItems} function. Do not use ${AggregateSelectFunctionName.Count} function for that purpose.
  `;
}

function filterOperatorGuidelinesSection(): string {
  return `## [IMPORTANT] Operator Guidelines
Specific operators expect specific compareValue types:
- CompareValue MUST BE SENT AS AN ARRAY WHEN USED WITH  any_of, not_any_of, between operators
- CompareValue MUST BE SENT AS AN EMPTY ARRAY WHEN USED WITH is_empty, is_not_empty
- CompareValue MUST BE SENT AS EITHER SINGLE STRING OR SINGLE NUMBER WHEN USED WITH greater_than, greater_than_or_equals, lower_than, lower_than_or_equal
- CompareValue MUST BE SENT AS SINGLE STRING WHEN USED WITH contains_terms, not_contains_text, contains_text, starts_with, ends_with operators
- CompareValue MUST BE SENT AS A TWO ITEM ARRAY OF [UNIT, AMOUNT] WHEN USED WITH within_the_last, within_the_next operators, where UNIT is one of "DAYS", "WORKDAYS", "WEEKS", "MONTHS" and AMOUNT is a number, e.g. ["DAYS", 7] for the last or next 7 days`;
}

export function buildFilterGuidelinesForColumnType(columnType: string): string | null {
  const specific = filteringGuidelinesByColumnType[columnType];
  if (!specific) {
    return null;
  }

  return `# Filtering Guidelines

${filterOperatorGuidelinesSection()}

## [IMPORTANT] Column type: ${columnType}
${specific}

## [IMPORTANT] Sub Items Columns MUST NOT BE USED FOR FILTERING.
`;
}

export function getFilterGuidelineForColumnType(columnType: string): string | undefined {
  return filteringGuidelinesByColumnType[columnType];
}
