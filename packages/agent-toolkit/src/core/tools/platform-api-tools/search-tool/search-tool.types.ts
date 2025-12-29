export interface SearchResult {
  id: string;
  title: string;
  url?: string;
}

export interface DataWithFilterInfo<T> {
  items: T[];
  wasFiltered: boolean;
}

export enum ObjectPrefixes {
  BOARD = 'board-',
  DOCUMENT = 'doc-',
  FOLDER = 'folder-',
}

export enum GlobalSearchType {
  BOARD = 'BOARD',
  DOCUMENTS = 'DOCUMENTS',
  FOLDERS = 'FOLDERS',

  // Why other types are not included:
  // FORMS = 'FORMS', // forms are not supported
  // USERS = 'USERS', // already supported by list_users_and_teams tool
  // TEAMS = 'TEAMS', // already supported by list_users_and_teams tool
  // WORKSPACES = 'WORKSPACES', // already supported by list_workspaces tool
  // ITEMS = 'ITEMS', // already supported by get_board_items_page tool
  // GROUPS = 'GROUPS', // already supported by get_board_info tool
}
