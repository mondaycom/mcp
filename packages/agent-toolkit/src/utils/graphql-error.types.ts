export interface GraphQLError {
  message?: string;
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
}

export interface GraphQLApiErrorResponse {
  errors?: GraphQLError[];
  extensions?: Record<string, unknown>;
  status?: number;
  headers?: Record<string, unknown>;
  data?: unknown;
}

export interface GraphQLErrorResponse {
  response?: GraphQLApiErrorResponse;
}

export interface ToolErrorEntry {
  message?: string;
  path?: (string | number)[];
  [key: string]: unknown;
}

export interface ToolErrorStructuredContent {
  message: string;
  tool?: string;
  status?: number;
  headers?: Record<string, unknown>;
  partial_success?: boolean;
  errors?: ToolErrorEntry[];
  [key: string]: unknown;
}
