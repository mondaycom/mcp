import type { SessionContext } from '../core/executable';

export type BulkOperationOutcome = 'success' | 'partial' | 'failed';

export function recordBulkOperationOutcome(
  sessionContext: SessionContext,
  total: number,
  failed: number,
): { outcome: BulkOperationOutcome; isPartialSuccess: boolean; isError: boolean } {
  const outcome: BulkOperationOutcome = failed === 0 ? 'success' : failed === total ? 'failed' : 'partial';

  sessionContext.metadata ??= {};
  sessionContext.metadata.items_count = total;
  sessionContext.metadata.items_failed = failed;
  sessionContext.metadata.outcome = outcome;

  return {
    outcome,
    isPartialSuccess: outcome === 'partial',
    isError: outcome === 'failed',
  };
}
