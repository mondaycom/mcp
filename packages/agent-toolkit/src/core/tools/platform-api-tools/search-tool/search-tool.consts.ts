import { GlobalSearchType } from './search-tool.types';

export const SEARCH_LIMIT = 20;
export const MAX_FOLDERS_LIMIT = 100;

/** Human-readable list of accepted searchType values, reused in descriptions and errors. */
export const SUPPORTED_SEARCH_TYPES_TEXT = Object.values(GlobalSearchType).join(', ');

/**
 * Canonicalize a raw searchType string so aliases and redirects match regardless
 * of case or separators (e.g. "board-item" and "board items" both normalize to
 * "BOARD_ITEM"). Only whitespace/hyphen/slash separators are collapsed — other
 * punctuation is left in place so garbage input (e.g. "board!!!") doesn't get
 * stripped down into an accidental match for a real value.
 */
export function normalizeSearchType(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s\-/]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const SEARCH_TYPE_ALIASES: Record<string, GlobalSearchType> = {
  BOARDS: GlobalSearchType.BOARD,
  DOCS: GlobalSearchType.DOCUMENTS,
  DOC: GlobalSearchType.DOCUMENTS,
  DOCUMENT: GlobalSearchType.DOCUMENTS,
  FOLDER: GlobalSearchType.FOLDERS,
  WORKSPACE: GlobalSearchType.WORKSPACES,
  UPDATE: GlobalSearchType.UPDATES,
  ITEM: GlobalSearchType.ITEMS,
  PULSE: GlobalSearchType.ITEMS,
  PULSES: GlobalSearchType.ITEMS,
  TIMELINE_ITEM: GlobalSearchType.TIMELINE_ITEMS,
  TIMELINE: GlobalSearchType.TIMELINE_ITEMS,
  DASHBOARD: GlobalSearchType.DASHBOARDS,
  OVERVIEW: GlobalSearchType.DASHBOARDS,
  OVERVIEWS: GlobalSearchType.DASHBOARDS,
};

/**
 * searchType values that are not supported by this tool but map to a clear
 * intent handled elsewhere. Keys are normalized (uppercase, non-alphanumerics
 * collapsed to `_`); values are guidance appended to the validation error so the
 * caller can self-correct on retry instead of re-failing with the same input.
 */
export const SEARCH_TYPE_REDIRECTS: Record<string, string> = {
  USER: 'To search for users or teams, use the list_users_and_teams tool.',
  USERS: 'To search for users or teams, use the list_users_and_teams tool.',
  PERSON: 'To search for users or teams, use the list_users_and_teams tool.',
  PEOPLE: 'To search for users or teams, use the list_users_and_teams tool.',
  TEAM: 'To search for users or teams, use the list_users_and_teams tool.',
  TEAMS: 'To search for users or teams, use the list_users_and_teams tool.',
  USER_OR_TEAM: 'To search for users or teams, use the list_users_and_teams tool.',
  USER_TEAM: 'To search for users or teams, use the list_users_and_teams tool.',
  USERS_AND_TEAMS: 'To search for users or teams, use the list_users_and_teams tool.',
  BOARD_ITEM:
    'To list items within a specific board, use the get_board_items_page tool. To search items across the account, use searchType "ITEMS".',
  BOARD_ITEMS:
    'To list items within a specific board, use the get_board_items_page tool. To search items across the account, use searchType "ITEMS".',
  BOARD_ITEMS_PAGE:
    'To list items within a specific board, use the get_board_items_page tool. To search items across the account, use searchType "ITEMS".',
  GET_BOARD_ITEMS_PAGE:
    'To list items within a specific board, use the get_board_items_page tool. To search items across the account, use searchType "ITEMS".',
  BOARD_ITEMS_OR_GROUPS:
    'To list items within a specific board, use the get_board_items_page tool. To search items across the account, use searchType "ITEMS".',
  BOARD_ITEMS_AND_GROUPS:
    'To list items within a specific board, use the get_board_items_page tool. To search items across the account, use searchType "ITEMS".',
  GROUP: 'To list groups within a board, use the get_board_info tool.',
  GROUPS: 'To list groups within a board, use the get_board_info tool.',
  FORM: 'Forms are not searchable.',
  FORMS: 'Forms are not searchable.',
};
