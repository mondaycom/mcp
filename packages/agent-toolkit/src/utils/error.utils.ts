import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { GraphQLErrorResponse, ToolErrorStructuredContent } from './graphql-error.types';

/**
 * Error thrown by tool code (not by the monday API) when input is invalid or a
 * pre-condition fails. Carries a stable, short `code` that flows into the
 * tool's structuredContent.errors[] so observability can classify it instead of
 * bucketing it as "unclassified".
 */
export const INVALID_TOOL_ARGS_CODE = 'INVALID_TOOL_ARGS';

export class ToolValidationError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ToolValidationError';
    this.code = code;
  }
}

export function rethrowWithContext(error: unknown, operation: string): never {
  if (error instanceof ToolValidationError) {
    throw error;
  }

  const graphQLErrors = (error as GraphQLErrorResponse)?.response?.errors
    ?.map((e) => {
      const { code, error_data } = e.extensions ?? {};
      const details = Object.fromEntries(
        Object.entries({ code, error_data }).filter(([, v]) => v !== undefined),
      );
      return Object.keys(details).length > 0 ? `${e.message} (details: ${JSON.stringify(details)})` : e.message;
    })
    ?.join(', ');

  if (graphQLErrors) {
    const formattedError = new Error(`Failed to ${operation}: ${graphQLErrors}`);
    (formattedError as GraphQLErrorResponse).response = (error as GraphQLErrorResponse).response;
    throw formattedError;
  }

  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  throw new Error(`Failed to ${operation}: ${errorMessage}`);
}

export function throwIfSearchTimeoutError(error: unknown): void {
  if (error instanceof Error && error.name === 'AbortError') {
    throw new Error('Search has timed out, try providing alternative search term');
  }
}

export function formatToolError(
  error: unknown,
  options?: { toolName?: string; errorPrefix?: string },
): CallToolResult {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const structured = buildToolErrorStructuredContent(error, { toolName: options?.toolName });
  const prefix = options?.errorPrefix ?? 'Error: ';

  return {
    structuredContent: structured as unknown as Record<string, unknown>,
    content: [{ type: 'text', text: `${prefix}${rawMessage}` }],
    isError: true,
  };
}

export function buildToolErrorStructuredContent(
  error: unknown,
  options?: { toolName?: string },
): ToolErrorStructuredContent {
  const response = (error as GraphQLErrorResponse)?.response;
  const rawMessage = error instanceof Error ? error.message : String(error);

  if (error instanceof ToolValidationError) {
    return {
      message: rawMessage,
      tool: options?.toolName,
      errors: [{ code: error.code, message: rawMessage, path: [] }],
    };
  }

  if (response?.errors?.length) {
    const headers = Object.keys(response.headers || {}).length > 0
      ? response.headers
      : undefined;

    return {
      message: rawMessage,
      tool: options?.toolName,
      ...(response.extensions ?? {}),
      status: response.status,
      headers,
      ...(response.data != null ? { partial_success: true } : {}),
      errors: response.errors.map((entry) => ({
        message: entry.message,
        path: entry.path,
        ...(entry.extensions ?? {}),
      })),
    };
  }

  return {
    message: rawMessage,
    tool: options?.toolName,
  };
}
