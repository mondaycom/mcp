import {
  DOC_BLOCK_LIMIT_EXCEEDED_CODE,
  DOC_BLOCK_LIMIT_EXCEEDED_MESSAGE,
  getDocBlockLimitError,
} from './doc-write-error.utils';

describe('getDocBlockLimitError', () => {
  it('recognizes the document block limit in a direct message', () => {
    const error = getDocBlockLimitError('Document cannot grow beyond 12000 active blocks');

    expect(error).toMatchObject({
      code: DOC_BLOCK_LIMIT_EXCEEDED_CODE,
      message: DOC_BLOCK_LIMIT_EXCEEDED_MESSAGE,
    });
  });

  it('recognizes the document block limit in a GraphQL response', () => {
    const error = new Error('Internal server error') as Error & {
      response: { errors: Array<{ message: string; extensions: { code: string } }> };
    };
    error.response = {
      errors: [
        {
          message: 'Document cannot grow beyond 12,000 active blocks',
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        },
      ],
    };

    expect(getDocBlockLimitError(error)?.code).toBe(DOC_BLOCK_LIMIT_EXCEEDED_CODE);
  });

  it('does not classify an unrelated internal server error', () => {
    expect(getDocBlockLimitError(new Error('Internal server error'))).toBeUndefined();
  });
});
