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
   * If true, the result includes a `matches` map from filename to the section it landed in
   * (or the fallback name). Useful for debugging rule conflicts.
   * @default false
   */
  explain?: boolean;
}

/** Result of classification. `matches` is present only when `explain: true`. */
export interface ClassifyResult {
  sections: Record<string, string[]>;
  matches?: Record<string, string>;
}
