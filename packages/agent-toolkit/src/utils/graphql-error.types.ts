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

export interface ToolErrorStructuredContent {
  message: string;
  tool?: string;
  status?: number;
  headers?: Record<string, unknown>;
  response_extensions?: Record<string, unknown>;
  partial_success?: boolean;
  errors?: GraphQLError[];
}
