/**
 * Shared helper functions for Monday Dev tools
 */

import { Column } from '../../../../monday-graphql/generated/graphql';
import {
  REQUIRED_SPRINT_COLUMNS,
  SPRINT_COLUMN_DISPLAY_NAMES,
  Sprint,
  CHECKBOX_COLUMN_TYPENAME,
  DATE_COLUMN_TYPENAME,
  TIMELINE_COLUMN_TYPENAME,
  DOC_COLUMN_TYPENAME,
} from './constants';

/**
 * Get typed column value from Sprint item
 */
export const getSprintColumnValue = (sprint: Sprint, columnId: string) => {
  return sprint.column_values?.find((cv) => cv.id === columnId);
};

/**
 * Get checkbox value from sprint column (for activation and completion)
 */
export const getCheckboxValue = (sprint: Sprint, columnId: string): boolean | null => {
  const column = getSprintColumnValue(sprint, columnId);
  return column?.__typename === CHECKBOX_COLUMN_TYPENAME ? (column.checked ?? false) : null;
};

/**
 * Get date value from sprint column (for start and end dates)
 */
export const getDateValue = (sprint: Sprint, columnId: string): string | null => {
  const column = getSprintColumnValue(sprint, columnId);
  return column?.__typename === DATE_COLUMN_TYPENAME ? (column.date ?? null) : null;
};

/**
 * Get timeline value from sprint column (for sprint timeline)
 * Returns dates in yyyy-mm-dd format
 */
export const getTimelineValue = (sprint: Sprint, columnId: string): { from: string; to: string } | null => {
  const column = getSprintColumnValue(sprint, columnId);
  if (column?.__typename === TIMELINE_COLUMN_TYPENAME && column.from && column.to) {
    const fromDate = column.from.split('T')[0];
    const toDate = column.to.split('T')[0];
    return { from: fromDate, to: toDate };
  }
  return null;
};

/**
 * Get doc value from sprint column (for sprint summary document)
 * Returns the document object_id from the DocValue column
 */
export const getDocValue = (sprint: Sprint, columnId: string): string | null => {
  const column = getSprintColumnValue(sprint, columnId);
  if (column?.__typename === DOC_COLUMN_TYPENAME && column.file?.doc?.object_id) {
    return column.file.doc.object_id;
  }
  return null;
};

/**
 * Get display name for sprint column ID
 */
export const getSprintColumnDisplayName = (columnId: keyof typeof SPRINT_COLUMN_DISPLAY_NAMES): string => {
  return SPRINT_COLUMN_DISPLAY_NAMES[columnId] || columnId;
};

/**
 * Validate sprint board schema using board columns from schema API
 */
export const validateSprintsBoardSchemaFromColumns = (
  boardColumns: Column[],
): { isValid: boolean; errorMessage: string } => {
  const existingColumnIds = new Set(
    boardColumns.filter((col): col is NonNullable<Column> => col !== null).map((col) => col.id),
  );

  const missingColumns: string[] = [];
  const requiredColumns = Object.values(REQUIRED_SPRINT_COLUMNS);

  for (const columnId of requiredColumns) {
    if (!existingColumnIds.has(columnId)) {
      missingColumns.push(columnId);
    }
  }

  if (missingColumns.length > 0) {
    let errorMessage = `BoardID provided is not a valid sprints board. Missing required columns:\n\n`;

    missingColumns.forEach((columnId) => {
      const columnDisplayName = getSprintColumnDisplayName(columnId as keyof typeof SPRINT_COLUMN_DISPLAY_NAMES);
      errorMessage += `- ${columnDisplayName}\n`;
    });

    return { isValid: false, errorMessage };
  }

  return { isValid: true, errorMessage: '' };
};

/**
 * Generic function to validate item has required columns
 * @param columnIds - Set of column IDs present in the item
 * @param requiredColumns - Array of required column IDs to validate
 * @returns Validation result with missing columns
 */
export const validateItemColumns = (
  columnIds: Set<string>,
  requiredColumns: string[],
): { isValid: boolean; missingColumns: string[] } => {
  const missingColumns = requiredColumns.filter((colId) => !columnIds.has(colId));

  return {
    isValid: missingColumns.length === 0,
    missingColumns,
  };
};

/**
 * Validate sprint item has required sprint columns, with optional additional required columns
 * @param sprint - Sprint item to validate
 * @param additionalRequiredColumns - Optional additional columns to require beyond base sprint columns
 * @returns Validation result with missing columns
 */
export const validateSprintItemColumns = (
  sprint: Sprint,
  additionalRequiredColumns: string[] = [],
): { isValid: boolean; missingColumns: string[] } => {
  const columnIds = new Set((sprint.column_values || []).map((cv) => cv.id));

  const requiredColumns = [...Object.values(REQUIRED_SPRINT_COLUMNS), ...additionalRequiredColumns];

  return validateItemColumns(columnIds, requiredColumns);
};
