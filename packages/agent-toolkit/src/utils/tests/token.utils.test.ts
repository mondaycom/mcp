import { normalizeToken } from '../token.utils';

describe('normalizeToken', () => {
  it('removes Bearer prefix (case-insensitive)', () => {
    expect(normalizeToken('Bearer eyJtoken123')).toBe('eyJtoken123');
    expect(normalizeToken('bearer eyJtoken123')).toBe('eyJtoken123');
    expect(normalizeToken('BEARER eyJtoken123')).toBe('eyJtoken123');
  });

  it('handles token without Bearer prefix and trims whitespace', () => {
    expect(normalizeToken('  eyJtoken123  ')).toBe('eyJtoken123');
    expect(normalizeToken('eyJtoken123')).toBe('eyJtoken123');
  });

  it('handles multiple spaces and edge cases', () => {
    expect(normalizeToken('Bearer   eyJtoken123')).toBe('eyJtoken123');
    expect(normalizeToken('Bearereytoken123')).toBe('Bearereytoken123'); // no space, not matched
  });
});
