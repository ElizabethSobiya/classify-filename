/** A matcher can be a substring, a regex, or a custom predicate. */
export type Matcher = string | RegExp | ((filename: string) => boolean);

/** A named bucket with one or more matching rules. */
export interface Section {
  name: string;
  match: Matcher | Matcher[];
}

/** Options that control classification behavior. */
export interface ClassifyOptions {
  /**
   * Case-sensitive matching for string matchers. Does not affect RegExp matchers
   * (they respect their own flags) or custom predicate functions.
   * @default false
   */
  caseSensitive?: boolean;

  /**
   * Bucket name for files matching no section. Pass `false` to drop them.
   * @default 'uncategorized'
   */
  fallback?: string | false;

  /**
   * If true, a file lands in every matching section. If false, first match wins.
   * @default false
   */
  multiMatch?: boolean;

  /**
   * Sort order within each bucket. Default is natural ascending
   * (so `file2` precedes `file10`). Pass a comparator for full control.
   * @default 'asc'
   */
  sort?: false | 'asc' | 'desc' | ((a: string, b: string) => number);

  /**
   * Include a `matches` map in the result, for debugging rule conflicts.
   *
   * - `false` — omit it.
   * - `true` — map each filename to the single section it landed in (or the
   *   fallback name). Under `multiMatch` only the first match is reported.
   * - `'all'` — map each filename to an array of every section it landed in,
   *   in section order. This is the one to use with `multiMatch: true`.
   *
   * @default false
   */
  explain?: boolean | 'all';
}

/**
 * Result of classification. `matches` is present only when `explain` is set, and
 * its shape follows which form was used: `explain: true` gives one section name
 * per file, `explain: 'all'` gives an array of every section the file landed in.
 */
export interface ClassifyResult<Match extends string | string[] = string> {
  sections: Record<string, string[]>;
  matches?: Record<string, Match>;
}
