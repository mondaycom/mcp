/**
 * Shared helper functions for Monday Dev tools
 */

import { Column } from '../../../../monday-graphql/generated/graphql';
import {REQUIRED_SPRINT_COLUMNS, SPRINT_COLUMN_DISPLAY_NAMES, Sprint } from './constants';

/**
 * Get typed column value from Sprint item
 */
export const getSprintColumnValue = (sprint: Sprint, columnId: string) => {
  return sprint.column_values?.find((cv) => cv.id === columnId);
};

/**
 * Get checkbox value from sprint column (for activation and completion)
 */
export const getCheckboxValue = (sprint: Sprint, columnId: string): boolean|null => {
  const column = getSprintColumnValue(sprint, columnId);
  return column?.__typename === 'CheckboxValue' ? (column.checked ?? false) : null;
};

/**
 * Get date value from sprint column (for start and end dates)
 */
export const getDateValue = (sprint: Sprint, columnId: string): string | null => {
  const column = getSprintColumnValue(sprint, columnId);
  return column?.__typename === 'DateValue' ? (column.date ?? null) : null;
};

/**
 * Get timeline value from sprint column (for sprint timeline)
 * Returns dates in yyyy-mm-dd format
 */
export const getTimelineValue = (sprint: Sprint, columnId: string): { from: string; to: string } | null => {
  const column = getSprintColumnValue(sprint, columnId);
  if (column?.__typename === 'TimelineValue' && column.from && column.to) {
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
  if (column?.__typename === 'DocValue' && column.file?.doc?.object_id) {
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
  boardColumns: Column[]
): { isValid: boolean; errorMessage: string } => {
  const existingColumnIds = new Set(
    boardColumns
      .filter((col): col is NonNullable<Column> => col !== null)
      .map((col) => col.id)
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
    
    missingColumns.forEach(columnId => {
      const columnDisplayName = getSprintColumnDisplayName(columnId as keyof typeof SPRINT_COLUMN_DISPLAY_NAMES);
      errorMessage += `- ${columnDisplayName}\n`;
    });
        
    return { isValid: false, errorMessage };
  }
  
  return { isValid: true, errorMessage: '' };
};