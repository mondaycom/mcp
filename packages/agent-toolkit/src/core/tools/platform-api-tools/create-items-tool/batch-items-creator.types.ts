export type PerItemResult =
  | { index: number; error: string; _errorEntry: Record<string, unknown>; [k: string]: unknown }
  | { index: number; [k: string]: unknown };

export type BatchCandidateItem = {
  name?: string;
  columnValues: string;
  groupId?: string;
  parentItemId?: number;
  duplicateFromItemId?: number;
  createLabelsIfMissing?: boolean;
};

export type BatchCreateItem = { name: string; columnValues: Record<string, unknown> };

export type BatchCreateRequest = {
  boardId: number;
  groupId: string;
  items: BatchCreateItem[];
};

export type BatchCreateResponse = {
  createdItems?: Array<{ serialNo: number; itemId: string | number }>;
  failedItems?: Array<{ serialNo: number; reason?: string }>;
  invalidItems?: Array<{ serialNo: number; errors?: Array<{ message?: string; type?: string }> }>;
};

export type GraphqlFallback = (indexes: number[]) => Promise<PerItemResult[]>;
