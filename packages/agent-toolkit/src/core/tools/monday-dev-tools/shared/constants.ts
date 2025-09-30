import { SprintState, GetSprintsBoardItemsWithColumnsQuery } from '../../../../monday-graphql/generated/graphql';

/**
 * Sprint item type extracted from the GetSprintsBoardItemsWithColumns query
 */
export type Sprint = NonNullable<NonNullable<NonNullable<GetSprintsBoardItemsWithColumnsQuery['boards']>[number]>['items_page']>['items'][number];

/**
 * Shared constants for Monday Dev tools
 */

// Required columns for sprint boards
export const REQUIRED_SPRINT_COLUMNS = {
  SPRINT_ACTIVATION: 'sprint_activation',
  SPRINT_TIMELINE: 'sprint_timeline', 
  SPRINT_COMPLETION: 'sprint_completion',
  SPRINT_START_DATE: 'sprint_start_date',
  SPRINT_END_DATE: 'sprint_end_date',
  SPRINT_SUMMARY: 'sprint_summary',
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
export const DOCS_LIMIT =   1

// Sprint column display names
export const SPRINT_COLUMN_DISPLAY_NAMES = {
  [REQUIRED_SPRINT_COLUMNS.SPRINT_ACTIVATION]: 'Sprint Activation',
  [REQUIRED_SPRINT_COLUMNS.SPRINT_TIMELINE]: 'Sprint Timeline',
  [REQUIRED_SPRINT_COLUMNS.SPRINT_COMPLETION]: 'Sprint Completion',
  [REQUIRED_SPRINT_COLUMNS.SPRINT_START_DATE]: 'Sprint Start Date',
  [REQUIRED_SPRINT_COLUMNS.SPRINT_END_DATE]: 'Sprint End Date',
  [REQUIRED_SPRINT_COLUMNS.SPRINT_SUMMARY]: 'Sprint Summary',
} as const;

// Use GraphQL enum for sprint status values
export const SPRINT_STATUS = SprintState;

/**
 * Monday Dev task column IDs
 * These column IDs used across all Monday Dev tasks boards
 */
export const MONDAY_DEV_TASK_COLUMN_IDS = {
  TASK_STATUS: 'task_status',
  TASK_OWNER: 'task_owner',
  TASK_PRIORITY: 'task_priority',
  TASK_TYPE: 'task_type',
  TASK_ESTIMATION: 'task_estimation',
  TASK_ACTUAL_EFFORT: 'task_actual_effort',
  TASK_SPRINT: 'task_sprint',
  TASK_BUGS: 'task_bugs',
} as const;

/**
 * Type for Monday column IDs
 */
export type MondayDevTaskColumnId = typeof MONDAY_DEV_TASK_COLUMN_IDS[keyof typeof MONDAY_DEV_TASK_COLUMN_IDS];
