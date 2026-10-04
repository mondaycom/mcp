import equal from 'fast-deep-equal';

export function trimActivityData(dataJson: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(dataJson);
  } catch {
    return dataJson;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return parsed;
  }
  const obj = parsed as Record<string, unknown>;
  if (!('previous_value' in obj) || !('value' in obj)) {
    return obj;
  }
  if (!equal(obj.previous_value, obj.value)) {
    return obj;
  }
  const { previous_value: _drop, ...rest } = obj;
  return { ...rest, previous_value_omitted: 'equals_value' };
}
