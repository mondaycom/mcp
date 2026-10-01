import { unwrapDoubleEncodedColumnValues } from './column-values.utils';

describe('unwrapDoubleEncodedColumnValues', () => {
  it('unwraps a double-encoded JSON object string', () => {
    expect(unwrapDoubleEncodedColumnValues(JSON.stringify('{"status":{"label":"Done"}}'))).toBe(
      '{"status":{"label":"Done"}}',
    );
  });

  it.each([
    ['a JSON object string', '{"status": {"label": "Done"}}'],
    ['malformed JSON', 'not valid json'],
    ['an empty string', ''],
  ])('returns %s unchanged', (_, columnValues) => {
    expect(unwrapDoubleEncodedColumnValues(columnValues)).toBe(columnValues);
  });
});
