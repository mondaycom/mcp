import { arrayHasElements } from '../array.utils';

describe('array.utils', () => {
  describe('arrayHasElements', () => {
    it('should return false for undefined', () => {
      expect(arrayHasElements(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(arrayHasElements(null)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(arrayHasElements([])).toBe(false);
    });

    it('should return true for array with elements', () => {
      expect(arrayHasElements([1, 2, 3])).toBe(true);
    });

    it('should return true for array with single element', () => {
      expect(arrayHasElements(['item'])).toBe(true);
    });

    it('should return true for array with falsy elements', () => {
      expect(arrayHasElements([null, undefined, 0, ''])).toBe(true);
    });

    it('should work as type guard', () => {
      const arr: number[] | null | undefined = [1, 2, 3];
      if (arrayHasElements(arr)) {
        // TypeScript knows arr is number[] here
        expect(arr.length).toBe(3);
      }
    });
  });
});
