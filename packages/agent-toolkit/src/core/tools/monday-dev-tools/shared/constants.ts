import {
  SprintState,
  GetSprintsBoardItemsWithColumnsQuery,
  CheckboxValue,
  DateValue,
  TimelineValue,
  DocValue,
} from '../../../../monday-graphql/generated/graphql';

/**
 * Sprint item type extracted from the GetSprintsBoardItemsWithColumns query
 */
export type Sprint = NonNullable<
  NonNullable<NonNullable<GetSprintsBoardItemsWithColumnsQuery['boards']>[number]>['items_page']
>['items'][number];

/**
 * Type-safe column typename constants verified against GraphQL types.
 * TypeScript will error if these don't match the actual __typename values.
 */
export const CHECKBOX_COLUMN_TYPENAME = 'CheckboxValue' satisfies CheckboxValue['__typename'];
export const DATE_COLUMN_TYPENAME = 'DateValue' satisfies DateValue['__typename'];
export const TIMELINE_COLUMN_TYPENAME = 'TimelineValue' satisfies TimelineValue['__typename'];
export const DOC_COLUMN_TYPENAME = 'DocValue' satisfies DocValue['__typename'];

/**
 * Shared constants for Monday Dev tools
 */

// Minimum required columns to identify a sprint board
export const REQUIRED_SPRINT_COLUMNS = {
  SPRINT_TASKS: 'sprint_tasks',
  SPRINT_TIMELINE: 'sprint_timeline',
  SPRINT_COMPLETION: 'sprint_completion',
  SPRINT_START_DATE: 'sprint_start_date',
  SPRINT_END_DATE: 'sprint_end_date',
  SPRINT_ACTIVATION: 'sprint_activation',
} as const;

// All sprint columns (used by get-sprints-metadata tool for full sprint data)
export const ALL_SPRINT_COLUMNS = {
  ...REQUIRED_SPRINT_COLUMNS,
  SPRINT_SUMMARY: 'sprint_summary',
  SPRINT_CAPACITY: 'sprint_capacity',
} as const;
// Error message prefixes (following project standards)
export const ERROR_PREFIXES = {
  BOARD_NOT_FOUND: 'BOARD_NOT_FOUND:',
  SPRINT_NOT_FOUND: 'SPRINT_NOT_FOUND:',
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND:',
  DOCUMENT_INVALID: 'DOCUMENT_INVALID:',
  DOCUMENT_EMPTY: 'DOCUMENT_EMPTY:',
  EXPORT_FAILED: 'EXPORT_FAILED:',
  INTERNAL_ERROR: 'INTERNAL_ERROR:',
  VALIDATION_ERROR: 'VALIDATION_ERROR:',
  SNAPSHOT_ERROR: 'SNAPSHOT_ERROR:',
} as const;

// Default limits
export const DOCS_LIMIT = 1;

/**
 * Monday Dev task column IDs
 * These column IDs are used across all Monday Dev tasks boards.
 */
export const MONDAY_DEV_TASK_COLUMN_IDS = {
  TASK_SPRINT: 'task_sprint',
  TASK_STATUS: 'task_status',
  TASK_PRIORITY: 'task_priority',
  TASK_TYPE: 'task_type',
  TASK_ESTIMATION: 'task_estimation',
  TASK_OWNER: 'task_owner',
  TASK_EPIC: 'task_epic',
  TASK_BUGS: 'task_bugs',
  TASK_ACTUAL_EFFORT: 'task_actual_effort',
} as const;

// Sprint column display names
export const SPRINT_COLUMN_DISPLAY_NAMES = {
  [ALL_SPRINT_COLUMNS.SPRINT_TASKS]: 'Sprint Tasks',
  [ALL_SPRINT_COLUMNS.SPRINT_TIMELINE]: 'Sprint Timeline',
  [ALL_SPRINT_COLUMNS.SPRINT_COMPLETION]: 'Sprint Completion',
  [ALL_SPRINT_COLUMNS.SPRINT_START_DATE]: 'Sprint Start Date',
  [ALL_SPRINT_COLUMNS.SPRINT_END_DATE]: 'Sprint End Date',
  [ALL_SPRINT_COLUMNS.SPRINT_ACTIVATION]: 'Sprint Activation',
  [ALL_SPRINT_COLUMNS.SPRINT_SUMMARY]: 'Sprint Summary',
  [ALL_SPRINT_COLUMNS.SPRINT_CAPACITY]: 'Sprint Capacity',
} as const;

// Task column display names
export const TASK_COLUMN_DISPLAY_NAMES = {
  [MONDAY_DEV_TASK_COLUMN_IDS.TASK_SPRINT]: 'Task Sprint',
  [MONDAY_DEV_TASK_COLUMN_IDS.TASK_STATUS]: 'Task Status',
  [MONDAY_DEV_TASK_COLUMN_IDS.TASK_PRIORITY]: 'Task Priority',
  [MONDAY_DEV_TASK_COLUMN_IDS.TASK_TYPE]: 'Task Type',
  [MONDAY_DEV_TASK_COLUMN_IDS.TASK_ESTIMATION]: 'Task Estimation',
  [MONDAY_DEV_TASK_COLUMN_IDS.TASK_OWNER]: 'Task Owner',
  [MONDAY_DEV_TASK_COLUMN_IDS.TASK_EPIC]: 'Task Epic',
  [MONDAY_DEV_TASK_COLUMN_IDS.TASK_BUGS]: 'Task Bugs',
  [MONDAY_DEV_TASK_COLUMN_IDS.TASK_ACTUAL_EFFORT]: 'Task Actual Effort',
} as const;

// Use GraphQL enum for sprint status values
export const SPRINT_STATUS = SprintState;

/**
 * Required columns to identify a valid sprints-tasks board
 */
export const REQUIRED_TASKS_COLUMNS = {
  TASK_SPRINT: 'task_sprint',
  TASK_STATUS: 'task_status',
} as const;

/**
 * Type for Monday column IDs
 */
export type MondayDevTaskColumnId = (typeof MONDAY_DEV_TASK_COLUMN_IDS)[keyof typeof MONDAY_DEV_TASK_COLUMN_IDS];
