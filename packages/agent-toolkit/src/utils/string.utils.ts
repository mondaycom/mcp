/**
 * Removes all non-alphanumeric characters from a string, keeping only letters and digits.
 * 
 * This function removes whitespaces, special characters (like $, ', ", %, etc.), and punctuation,
 * while preserving all Unicode letters (including accented characters like ł, é, ñ) and digits (0-9).
 * 
 * **Regex Pattern Breakdown:** `/[^\p{L}\d]/gu`
 * - `[^ ... ]` - Negated character class (matches anything NOT inside the brackets)
 * - `\p{L}` - Unicode property escape matching any letter from any language
 *   - Includes: a-z, A-Z, ł, é, ñ, 漢, א, etc.
 * - `\d` - Matches any digit (0-9)
 * - `g` - Global flag: replace all occurrences in the string
 * - `u` - Unicode flag: enables Unicode property escapes (\p{})
 * 
 * @param str - The input string to clean
 * @returns A new string containing only letters and digits
 * 
 * @example
 * ```typescript
 * cleanAlphanumeric("Hello World! 123")      // "HelloWorld123"
 * cleanAlphanumeric("łódź 50%")              // "łódź50"
 * cleanAlphanumeric("Price: $99.99")         // "Price9999"
 * cleanAlphanumeric("café, naïve & résumé")  // "cafénaïverésumé"
 * cleanAlphanumeric("Test$123'abc\"")        // "Test123abc"
 * ```
 */
export const normalizeString = (str: string): string => {
  return str.toLocaleLowerCase().replace(/[^\p{L}\d]/gu, '');
}