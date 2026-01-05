/**
 * Checks if an array is empty (undefined, null, or has zero length).
 *
 * @param arr - The array to check
 * @returns true if the array is undefined, null, or has length 0
 *
 * @example
 * ```typescript
 * isEmpty(undefined)  // true
 * isEmpty(null)       // true
 * isEmpty([])         // true
 * isEmpty([1, 2, 3])  // false
 * ```
 */
export function isEmpty<T>(arr: T[] | null | undefined): arr is null | undefined | [] {
  return !arr || arr.length === 0;
}

