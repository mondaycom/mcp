import { adaptColumnValuesForBatch, BatchColumn, getColumnIdsNeedingLookup } from './batch-workarounds';

const columns = new Map<string, BatchColumn>([
  [
    'status',
    {
      id: 'status',
      type: 'status',
      settings: {
        labels: [
          { id: 0, label: 'Working on it', is_deactivated: false },
          { id: 5, label: 'Done', is_deactivated: false },
          { id: 6, label: 'Old', is_deactivated: true },
        ],
      },
    },
  ],
  [
    'dropdown',
    {
      id: 'dropdown',
      type: 'dropdown',
      settings: {
        labels: [
          { id: 1, label: 'A', is_deactivated: false },
          { id: 2, label: 'B', is_deactivated: true },
        ],
      },
    },
  ],
]);

describe('batch workarounds', () => {
  it('only looks up columns whose values use labels', () => {
    expect(
      getColumnIdsNeedingLookup([
        { columnValues: { text: 'a', status: { label: 'Done' }, connect: { item_ids: [1] } } },
        { columnValues: { dropdown: { labels: ['A'] }, status: { index: 1 } } },
      ]),
    ).toEqual(['status', 'dropdown']);
  });

  it('leaves values the batch endpoint already accepts unchanged', () => {
    const columnValues = {
      text: 'a',
      cleared: null,
      date: { date: '2024-01-01' },
      status: { index: 1 },
      dropdown: { ids: [1] },
      people: { personsAndTeams: [{ id: 1, kind: 'person' }] },
    };

    expect(adaptColumnValuesForBatch(columnValues, columns)).toEqual({ columnValues });
  });

  it('maps linked item ids for board relation and dependency columns', () => {
    expect(adaptColumnValuesForBatch({ connect: { item_ids: [] }, blocked_by: { item_ids: ['9'] } }, columns)).toEqual({
      columnValues: { connect: { linkedPulseIds: [] }, blocked_by: { linkedPulseIds: [{ linkedPulseId: 9 }] } },
    });
  });

  it.each([
    {
      name: 'a non-numeric linked item id',
      value: { connect: { item_ids: ['abc'] } },
      reason: 'unsupported_linked_items',
    },
    { name: 'a negative linked item id', value: { connect: { item_ids: [-1] } }, reason: 'unsupported_linked_items' },
    {
      name: 'extra linked item keys',
      value: { connect: { item_ids: [1], other: true } },
      reason: 'unsupported_linked_items',
    },
    { name: 'an unknown status label', value: { status: { label: 'Nope' } }, reason: 'status_label_not_found' },
    { name: 'a deactivated status label', value: { status: { label: 'Old' } }, reason: 'status_label_not_found' },
    {
      name: 'a status label with a different case',
      value: { status: { label: 'done' } },
      reason: 'status_label_not_found',
    },
    {
      name: 'a deactivated dropdown label',
      value: { dropdown: { labels: ['A', 'B'] } },
      reason: 'dropdown_label_not_found',
    },
    {
      name: 'a label on a column we did not find',
      value: { missing: { label: 'Done' } },
      reason: 'unsupported_label_value',
    },
    { name: 'labels on a status column', value: { status: { labels: ['Done'] } }, reason: 'unsupported_label_value' },
    {
      name: 'dropdown labels mixed with ids',
      value: { dropdown: { labels: ['A'], ids: [1] } },
      reason: 'unsupported_label_value',
    },
  ])('asks for GraphQL on $name', ({ value, reason }) => {
    expect(adaptColumnValuesForBatch(value, columns)).toEqual({ fallbackReason: reason });
  });
});
