export function isNonEmptyArray<T>(arr: readonly T[] | null | undefined): arr is readonly T[] & { length: number } {
  return Array.isArray(arr) && arr.length > 0;
}
