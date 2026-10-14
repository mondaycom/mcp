export type BulkOperationOutcome = 'success' | 'partial' | 'failed';

export function getBulkOperationOutcome(
  total: number,
  failed: number,
): {
  metadata: { items_count: number; items_failed: number; outcome: BulkOperationOutcome };
  isPartialSuccess: boolean;
  isError: boolean;
} {
  const outcome: BulkOperationOutcome = failed === 0 ? 'success' : failed === total ? 'failed' : 'partial';

  return {
    metadata: {
      items_count: total,
      items_failed: failed,
      outcome,
    },
    isPartialSuccess: outcome === 'partial',
    isError: outcome === 'failed',
  };
}
