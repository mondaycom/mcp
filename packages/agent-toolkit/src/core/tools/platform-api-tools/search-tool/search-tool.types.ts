export interface SearchResult {
  id: string;
  title: string;
  url?: string;
  description?: string;
  summary?: string;
  content?: string;
  // updates
  itemId?: string;
  boardId?: string;
  workspaceId?: string;
  creatorId?: string;
}

export enum GlobalSearchType {
  BOARD = 'BOARD',
  DOCUMENTS = 'DOCUMENTS',
  FOLDERS = 'FOLDERS',
  WORKSPACES = 'WORKSPACES',
  UPDATES = 'UPDATES',
  ITEMS = 'ITEMS',
  TIMELINE_ITEMS = 'TIMELINE_ITEMS',
  // "Dashboards" is the product-facing term; "overviews" is the internal/technical name (both accepted, see aliases).
  DASHBOARDS = 'DASHBOARDS',

  // Why other types are not included:
  // FORMS = 'FORMS', // forms are not supported
  // TEAMS = 'TEAMS', // already supported by list_users_and_teams tool
  // GROUPS = 'GROUPS', // already supported by get_board_info tool
}
