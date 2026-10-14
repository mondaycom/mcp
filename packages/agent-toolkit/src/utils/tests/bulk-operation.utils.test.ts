import { getBulkOperationOutcome } from '../bulk-operation.utils';

describe('getBulkOperationOutcome', () => {
  it.each([
    [0, 'success', false, false],
    [1, 'partial', true, false],
    [3, 'failed', false, true],
  ] as const)(
    'records failed=%i as %s',
    (failed, outcome, isPartialSuccess, isError) => {
      expect(getBulkOperationOutcome(3, failed)).toEqual({
        metadata: {
          items_count: 3,
          items_failed: failed,
          outcome,
        },
        isPartialSuccess,
        isError,
      });
    },
  );
});
