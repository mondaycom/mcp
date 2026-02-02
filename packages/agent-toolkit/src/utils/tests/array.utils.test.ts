import { hasElements } from '../array.utils';

describe('array.utils', () => {
  describe('hasElements', () => {
    it('should return false for undefined', () => {
      expect(hasElements(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(hasElements(null)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(hasElements([])).toBe(false);
    });

    it('should return true for array with elements', () => {
      expect(hasElements([1, 2, 3])).toBe(true);
    });

    it('should return true for array with single element', () => {
      expect(hasElements(['item'])).toBe(true);
    });

    it('should return true for array with falsy elements', () => {
      expect(hasElements([null, undefined, 0, ''])).toBe(true);
    });

    it('should work as type guard', () => {
      const arr: number[] | null | undefined = [1, 2, 3];
      if (hasElements(arr)) {
        // TypeScript knows arr is number[] here
        expect(arr.length).toBe(3);
      }
    });
  });
});
