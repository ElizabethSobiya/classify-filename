import type { Matcher } from './types.js';

/**
 * Normalize any matcher into a uniform predicate.
 * - Strings: substring match, case sensitivity controlled by `caseSensitive`.
 * - RegExp: uses `test()`, respects the regex's own flags. `g`/`y` patterns are
 *   rewound per call so `lastIndex` never leaks between filenames.
 * - Function: called as-is with the original filename.
 */
export function normalizeMatcher(
  matcher: Matcher,
  caseSensitive: boolean,
): (filename: string) => boolean {
  if (typeof matcher === 'string') {
    if (caseSensitive) {
      return (filename) => filename.includes(matcher);
    }
    const needle = matcher.toLowerCase();
    return (filename) => filename.toLowerCase().includes(needle);
  }

  if (matcher instanceof RegExp) {
    if (matcher.global || matcher.sticky) {
      // `g` and `y` regexes carry `lastIndex` between `.test()` calls, which would
      // make a file's fate depend on how many filenames happened to precede it.
      // Clone (never mutate the caller's regex), drop `g`, and rewind every call —
      // `y` is kept so a sticky pattern stays anchored, just anchored at 0 each time.
      const stateless = new RegExp(matcher.source, matcher.flags.replace(/g/g, ''));
      return (filename) => {
        stateless.lastIndex = 0;
        return stateless.test(filename);
      };
    }
    return (filename) => matcher.test(filename);
  }

  if (typeof matcher === 'function') {
    return matcher;
  }

  throw new TypeError(
    `Invalid matcher: expected string, RegExp, or function; received ${typeof matcher}`,
  );
}

/**
 * Combine an array of matchers into a single OR predicate.
 * A single matcher is wrapped into a one-element array first.
 */
export function buildSectionPredicate(
  match: Matcher | Matcher[],
  caseSensitive: boolean,
): (filename: string) => boolean {
  const matchers = Array.isArray(match) ? match : [match];
  if (matchers.length === 0) {
    return () => false;
  }
  const predicates = matchers.map((m) => normalizeMatcher(m, caseSensitive));
  return (filename) => predicates.some((p) => p(filename));
}
