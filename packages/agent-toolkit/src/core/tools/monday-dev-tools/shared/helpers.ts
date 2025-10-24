/**
 * Shared helper functions for Monday Dev tools
 */

import { ColumnType } from '../../../../monday-graphql/generated/graphql';
import {
  REQUIRED_SPRINT_COLUMNS,
  REQUIRED_TASKS_COLUMNS,
  SPRINT_COLUMN_DISPLAY_NAMES,
  CHECKBOX_COLUMN_TYPENAME,
  DATE_COLUMN_TYPENAME,
  TIMELINE_COLUMN_TYPENAME,
  DOC_COLUMN_TYPENAME,
} from './constants';
import type { Sprint, Board } from './types';


export const getSprintColumnValue = (sprint: Sprint, columnId: string) => {
  return sprint.column_values?.find((cv) => cv.id === columnId);
};

export const getCheckboxValue = (sprint: Sprint, columnId: string): boolean | null => {
  const column = getSprintColumnValue(sprint, columnId);
  return column?.__typename === CHECKBOX_COLUMN_TYPENAME ? (column.checked ?? false) : null;
};

export const getDateValue = (sprint: Sprint, columnId: string): string | null => {
  const column = getSprintColumnValue(sprint, columnId);
  return column?.__typename === DATE_COLUMN_TYPENAME ? (column.date ?? null) : null;
};

export const getTimelineValue = (sprint: Sprint, columnId: string): { from: string; to: string } | null => {
  const column = getSprintColumnValue(sprint, columnId);
  if (column?.__typename === TIMELINE_COLUMN_TYPENAME && column.from && column.to) {
    const fromDate = column.from.split('T')[0];
    const toDate = column.to.split('T')[0];
    return { from: fromDate, to: toDate };
  }
  return null;
};

export const getDocValue = (sprint: Sprint, columnId: string): string | null => {
  const column = getSprintColumnValue(sprint, columnId);
  if (column?.__typename === DOC_COLUMN_TYPENAME && column.file?.doc?.object_id) {
    return column.file.doc.object_id;
  }
  return null;
};

export const getSprintColumnDisplayName = (columnId: keyof typeof SPRINT_COLUMN_DISPLAY_NAMES): string => {
  return SPRINT_COLUMN_DISPLAY_NAMES[columnId] || columnId;
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

/**
 * Checks if a board has all required columns
 * @param board - Board to check
 * @param requiredColumnIds - Array of required column IDs
 */
export const hasAllRequiredColumns = (board: Board, requiredColumnIds: string[]): boolean => {
  if (!board.columns) return false;
  const columnIds = new Set(
    board.columns.filter((col): col is NonNullable<typeof col> => col !== null).map((col) => col.id)
  );
  return requiredColumnIds.every((colId) => columnIds.has(colId));
};


export const isSprintsBoard = (board: Board): boolean => {
  return hasAllRequiredColumns(board, Object.values(REQUIRED_SPRINT_COLUMNS));
};


export const isTasksBoard = (board: Board): boolean => {
  return hasAllRequiredColumns(board, Object.values(REQUIRED_TASKS_COLUMNS));
};



export const getRelatedBoardIdFromRelationColumn = (column: NonNullable<Board['columns']>[number]): string | null => {
  if (!column?.settings) return null;

  const settings = column.settings as any;
  const boardId = 
    (settings.boardIds && Array.isArray(settings.boardIds) && settings.boardIds[0]?.toString()) ||
    settings.boardId?.toString();

  return boardId || null;
};


export const getBoardRelationColumn = (
  board: Board,
  columnId: string
): NonNullable<Board['columns']>[number] | null => {
  if (!board.columns) return null;

  return board.columns
    .filter((col): col is NonNullable<typeof col> => col !== null)
    .find((col) => col.id === columnId && col.type === ColumnType.BoardRelation) || null;
};
