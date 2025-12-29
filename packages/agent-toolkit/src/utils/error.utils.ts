/**
 * GraphQL error response structure
 */
interface GraphQLErrorResponse {
  response?: {
    errors?: Array<{ message: string }>;
  };
}

/**
 * Rethrows an error with a formatted message, extracting GraphQL errors if available.
 *
 * This utility handles two types of errors:
 * 1. GraphQL errors - extracts and joins error messages from response.errors
 * 2. Standard errors - uses the error message or falls back to 'Unknown error'
 *
 * @param error - The caught error (can be Error, GraphQL error response, or unknown)
 * @param operation - Description of the operation that failed (e.g., "create item", "update board")
 * @throws Always throws an Error with formatted message "Failed to {operation}: {error details}"
 *
 * @example
 * ```typescript
 * try {
 *   await mondayApi.createItem(...);
 * } catch (error) {
 *   rethrowWithContext(error, 'create item');
 * }
 * ```
 */
export function rethrowWithContext(error: unknown, operation: string): never {
  // Try to extract GraphQL errors from the response
  const graphQLErrors = (error as GraphQLErrorResponse)?.response?.errors?.map((e) => e.message)?.join(', ');

  if (graphQLErrors) {
    throw new Error(`Failed to ${operation}: ${graphQLErrors}`);
  }

  // Fallback to standard error message
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  throw new Error(`Failed to ${operation}: ${errorMessage}`);
}
