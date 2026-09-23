import { trimActivityData } from './trim-activity-data';

describe('trimActivityData', () => {
  it('returns the parsed object unchanged when data has no previous_value/value pair', () => {
    const input = '{"action_record_uuid":"abc-123","key":"value"}';
    expect(trimActivityData(input)).toEqual({ action_record_uuid: 'abc-123', key: 'value' });
  });

  it('returns the original string when JSON parsing fails', () => {
    const input = 'not valid json';
    expect(trimActivityData(input)).toBe(input);
  });

  it('returns the raw parsed value when payload is not an object', () => {
    expect(trimActivityData('"just a string"')).toBe('just a string');
    expect(trimActivityData('[1,2,3]')).toEqual([1, 2, 3]);
    expect(trimActivityData('null')).toBeNull();
  });

  it('drops previous_value when it deep-equals value', () => {
    const files = [{ assetId: 1, name: 'a.pdf' }, { assetId: 2, name: 'b.pdf' }];
    const input = JSON.stringify({
      action_record_uuid: 'uuid-1',
      column_id: 'files',
      previous_value: files,
      value: files,
    });
    const out = trimActivityData(input) as Record<string, unknown>;
    expect(out).toEqual({
      action_record_uuid: 'uuid-1',
      column_id: 'files',
      value: files,
      previous_value_omitted: 'equals_value',
    });
    expect(out.previous_value).toBeUndefined();
  });

  it('preserves both fields when previous_value differs from value', () => {
    const input = JSON.stringify({
      previous_value: [1, 2, 3],
      value: [1, 2, 3, 4],
    });
    expect(trimActivityData(input)).toEqual({ previous_value: [1, 2, 3], value: [1, 2, 3, 4] });
  });

  it('preserves action_record_uuid when trimming', () => {
    const files = [{ assetId: 1 }];
    const input = JSON.stringify({
      action_record_uuid: 'must-survive',
      previous_value: files,
      value: files,
    });
    const out = trimActivityData(input) as Record<string, unknown>;
    expect(out.action_record_uuid).toBe('must-survive');
    expect(out.previous_value_omitted).toBe('equals_value');
  });
});
