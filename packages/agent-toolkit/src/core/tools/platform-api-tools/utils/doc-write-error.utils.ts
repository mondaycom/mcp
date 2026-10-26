import { ToolValidationError } from '../../../../utils';
import { GraphQLErrorResponse } from '../../../../utils/graphql-error.types';

export const DOC_BLOCK_LIMIT_EXCEEDED_CODE = 'DOC_BLOCK_LIMIT_EXCEEDED';
export const DOC_BLOCK_LIMIT_EXCEEDED_MESSAGE =
  'Document cannot grow beyond 12,000 active blocks. Archive or delete blocks, or use another document before adding content.';

const DOC_BLOCK_LIMIT_PATTERN = /document cannot grow beyond 12,?000 active blocks/i;

export function getDocBlockLimitError(error: unknown): ToolValidationError | undefined {
  if (error instanceof ToolValidationError && error.code === DOC_BLOCK_LIMIT_EXCEEDED_CODE) {
    return error;
  }

  const messages = [
    typeof error === 'string' ? error : undefined,
    error instanceof Error ? error.message : undefined,
    ...((error as GraphQLErrorResponse)?.response?.errors?.map((entry) => entry.message) ?? []),
  ].filter((message): message is string => !!message);

  if (!messages.some((message) => DOC_BLOCK_LIMIT_PATTERN.test(message))) {
    return undefined;
  }

  return new ToolValidationError(DOC_BLOCK_LIMIT_EXCEEDED_MESSAGE, DOC_BLOCK_LIMIT_EXCEEDED_CODE);
}
