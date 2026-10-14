import { recordBulkOperationOutcome } from '../bulk-operation.utils';

describe('recordBulkOperationOutcome', () => {
  it.each([
    [0, 'success', false, false],
    [1, 'partial', true, false],
    [3, 'failed', false, true],
  ] as const)(
    'records failed=%i as %s',
    (failed, outcome, isPartialSuccess, isError) => {
      const sessionContext = { metadata: { existing: true } };

      expect(recordBulkOperationOutcome(sessionContext, 3, failed)).toEqual({
        outcome,
        isPartialSuccess,
        isError,
      });
      expect(sessionContext.metadata).toEqual({
        existing: true,
        items_count: 3,
        items_failed: failed,
        outcome,
      });
    },
  );
});
