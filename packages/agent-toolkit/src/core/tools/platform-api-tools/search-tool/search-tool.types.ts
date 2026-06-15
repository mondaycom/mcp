export interface SearchResult {
  id: string;
  title: string;
  url?: string;
  description?: string;
}

export interface DataWithFilterInfo<T> {
  items: T[];
  wasFiltered: boolean;
}

export enum ObjectPrefixes {
  BOARD = 'board-',
  DOCUMENT = 'doc-',
  FOLDER = 'folder-',
  WORKSPACE = 'workspace-',
  ITEM = 'item-',
}

export enum GlobalSearchType {
  BOARD = 'BOARD',
  DOCUMENTS = 'DOCUMENTS',
  FOLDERS = 'FOLDERS',
  WORKSPACES = 'WORKSPACES',
  ITEMS = 'ITEMS',

  // Why other types are not included:
  // FORMS = 'FORMS', // forms are not supported
  // USERS = 'USERS', // already supported by list_users_and_teams tool
  // TEAMS = 'TEAMS', // already supported by list_users_and_teams tool
  // GROUPS = 'GROUPS', // already supported by get_board_info tool
}