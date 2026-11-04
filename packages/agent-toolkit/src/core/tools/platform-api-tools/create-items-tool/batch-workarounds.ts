export type BatchColumn = { id: string; type: string; settings?: unknown };

export type BatchColumnValuesAdaptation = { columnValues: Record<string, unknown> } | { fallbackReason: string };

type ColumnValueAdaptation = { value: unknown } | { fallbackReason: string };

type ColumnLabel = { id: number; label: string };

export const BATCH_FALLBACK_REASONS = {
  statusLabelNotFound: 'status_label_not_found',
  dropdownLabelNotFound: 'dropdown_label_not_found',
  unsupportedLinkedItems: 'unsupported_linked_items',
  unsupportedLabelValue: 'unsupported_label_value',
} as const;

export function getColumnIdsNeedingLookup(items: Array<{ columnValues: Record<string, unknown> }>): string[] {
  const columnIds = new Set<string>();
  for (const item of items) {
    for (const [columnId, value] of Object.entries(item.columnValues)) {
      if (isRecord(value) && ('label' in value || 'labels' in value)) {
        columnIds.add(columnId);
      }
    }
  }
  return [...columnIds];
}

export function adaptColumnValuesForBatch(
  columnValues: Record<string, unknown>,
  columns: ReadonlyMap<string, BatchColumn>,
): BatchColumnValuesAdaptation {
  const adapted: Record<string, unknown> = {};
  for (const [columnId, value] of Object.entries(columnValues)) {
    const result = adaptColumnValue(value, columns.get(columnId));
    if ('fallbackReason' in result) {
      return result;
    }
    adapted[columnId] = result.value;
  }
  return { columnValues: adapted };
}

function adaptColumnValue(value: unknown, column: BatchColumn | undefined): ColumnValueAdaptation {
  if (!isRecord(value)) {
    return { value };
  }
  if ('item_ids' in value) {
    return adaptLinkedItemIds(value);
  }
  if ('label' in value) {
    return adaptStatusLabel(value, column);
  }
  if ('labels' in value) {
    return adaptDropdownLabels(value, column);
  }
  return { value };
}

function adaptLinkedItemIds(value: Record<string, unknown>): ColumnValueAdaptation {
  const itemIds = value.item_ids;
  if (!hasOnlyKey(value, 'item_ids') || !Array.isArray(itemIds)) {
    return { fallbackReason: BATCH_FALLBACK_REASONS.unsupportedLinkedItems };
  }
  const linkedPulseIds: Array<{ linkedPulseId: number }> = [];
  for (const itemId of itemIds) {
    const linkedPulseId = Number(itemId);
    if (
      (typeof itemId !== 'number' && typeof itemId !== 'string') ||
      !Number.isSafeInteger(linkedPulseId) ||
      linkedPulseId <= 0
    ) {
      return { fallbackReason: BATCH_FALLBACK_REASONS.unsupportedLinkedItems };
    }
    linkedPulseIds.push({ linkedPulseId });
  }
  return { value: { linkedPulseIds } };
}

function adaptStatusLabel(value: Record<string, unknown>, column: BatchColumn | undefined): ColumnValueAdaptation {
  if (!hasOnlyKey(value, 'label') || typeof value.label !== 'string' || column?.type !== 'status') {
    return { fallbackReason: BATCH_FALLBACK_REASONS.unsupportedLabelValue };
  }
  const id = findLabelId(column, value.label);
  if (id === undefined) {
    return { fallbackReason: BATCH_FALLBACK_REASONS.statusLabelNotFound };
  }
  return { value: { index: id } };
}

function adaptDropdownLabels(value: Record<string, unknown>, column: BatchColumn | undefined): ColumnValueAdaptation {
  const labels = value.labels;
  if (!hasOnlyKey(value, 'labels') || !Array.isArray(labels) || column?.type !== 'dropdown') {
    return { fallbackReason: BATCH_FALLBACK_REASONS.unsupportedLabelValue };
  }
  const ids: number[] = [];
  for (const label of labels) {
    const id = typeof label === 'string' ? findLabelId(column, label) : undefined;
    if (id === undefined) {
      return { fallbackReason: BATCH_FALLBACK_REASONS.dropdownLabelNotFound };
    }
    ids.push(id);
  }
  return { value: { ids } };
}

function findLabelId(column: BatchColumn, label: string): number | undefined {
  return getActiveLabels(column).find((candidate) => candidate.label === label)?.id;
}

function getActiveLabels(column: BatchColumn): ColumnLabel[] {
  const labels = isRecord(column.settings) ? column.settings.labels : undefined;
  if (!Array.isArray(labels)) {
    return [];
  }
  return labels.flatMap((label) =>
    isRecord(label) &&
    Number.isSafeInteger(label.id) &&
    typeof label.label === 'string' &&
    label.is_deactivated !== true
      ? [{ id: label.id as number, label: label.label }]
      : [],
  );
}

function hasOnlyKey(value: Record<string, unknown>, key: string): boolean {
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === key;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
