import { isNonEmptyArray } from '../array.utils';

describe('array.utils', () => {
  describe('isNonEmptyArray', () => {
    it('should return false for undefined', () => {
      expect(isNonEmptyArray(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isNonEmptyArray(null)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(isNonEmptyArray([])).toBe(false);
    });

    it('should return true for array with elements', () => {
      expect(isNonEmptyArray([1, 2, 3])).toBe(true);
    });

    it('should return true for array with single element', () => {
      expect(isNonEmptyArray(['item'])).toBe(true);
    });

    it('should return true for array with falsy elements', () => {
      expect(isNonEmptyArray([null, undefined, 0, ''])).toBe(true);
    });

    it('should work as type guard', () => {
      const arr: number[] | null | undefined = [1, 2, 3];
      if (isNonEmptyArray(arr)) {
        // TypeScript knows arr is number[] here
        expect(arr.length).toBe(3);
      }
    });
  });
});
