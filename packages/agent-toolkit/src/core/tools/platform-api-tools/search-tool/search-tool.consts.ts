import { GlobalSearchType } from './search-tool.types';

export const SEARCH_LIMIT = 20;
export const MAX_FOLDERS_LIMIT = 100;

export const SEARCH_TYPE_ALIASES: Record<string, GlobalSearchType> = {
  BOARDS: GlobalSearchType.BOARD,
  DOCS: GlobalSearchType.DOCUMENTS,
  DOC: GlobalSearchType.DOCUMENTS,
  FOLDER: GlobalSearchType.FOLDERS,
  WORKSPACE: GlobalSearchType.WORKSPACES,
  UPDATE: GlobalSearchType.UPDATES,
  ITEM: GlobalSearchType.ITEMS,
  TIMELINE_ITEM: GlobalSearchType.TIMELINE_ITEMS,
  TIMELINE: GlobalSearchType.TIMELINE_ITEMS,
};
