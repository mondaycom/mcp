import { isEmpty } from '../array.utils';

describe('array.utils', () => {
  describe('isEmpty', () => {
    it('should return true for undefined', () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return true for null', () => {
      expect(isEmpty(null)).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(isEmpty([])).toBe(true);
    });

    it('should return false for array with elements', () => {
      expect(isEmpty([1, 2, 3])).toBe(false);
    });

    it('should return false for array with single element', () => {
      expect(isEmpty(['item'])).toBe(false);
    });

    it('should return false for array with falsy elements', () => {
      expect(isEmpty([null, undefined, 0, ''])).toBe(false);
    });

    it('should work as type guard', () => {
      const arr: number[] | null | undefined = [1, 2, 3];
      if (!isEmpty(arr)) {
        // TypeScript should know arr is number[] here
        expect(arr.length).toBe(3);
      }
    });
  });
});

