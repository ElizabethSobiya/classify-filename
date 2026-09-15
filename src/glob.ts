/** Options for {@link glob}. */
export interface GlobOptions {
  /**
   * Match case-sensitively. Defaults to `false` to line up with string matchers,
   * which are case-insensitive by default.
   * @default false
   */
  caseSensitive?: boolean;
}

/** Escape a single character so it is matched literally by a RegExp. */
const escapeLiteral = (char: string): string =>
  /[.*+?^${}()|[\]\\]/.test(char) ? `\\${char}` : char;

/**
 * Compile a bracket expression (`[abc]`, `[!a-z]`) starting at `start`.
 * Returns the emitted source and the index just past the closing `]`,
 * or `null` if the bracket is never closed (then it is treated as a literal).
 */
function compileBracket(pattern: string, start: number): { source: string; next: number } | null {
  let i = start + 1;
  let negated = false;

  if (pattern[i] === '!' || pattern[i] === '^') {
    negated = true;
    i += 1;
  }

  const bodyStart = i;
  // A `]` in the first position is a literal, not the terminator.
  if (pattern[i] === ']') i += 1;
  while (i < pattern.length && pattern[i] !== ']') i += 1;
  if (i >= pattern.length) return null;

  const body = pattern.slice(bodyStart, i).replace(/\\/g, '\\\\').replace(/\]/g, '\\]');
  return { source: `[${negated ? '^' : ''}${body}]`, next: i + 1 };
}

/** Translate a glob pattern into anchored RegExp source. */
function toRegExpSource(pattern: string): string {
  let source = '';
  let braceDepth = 0;
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i] as string;

    if (char === '\\') {
      const escaped = pattern[i + 1];
      // A trailing backslash matches a literal backslash.
      source += escaped === undefined ? '\\\\' : escapeLiteral(escaped);
      i += escaped === undefined ? 1 : 2;
      continue;
    }

    if (char === '*') {
      let stars = 0;
      while (pattern[i] === '*') {
        stars += 1;
        i += 1;
      }
      if (stars === 1) {
        source += '[^/]*';
      } else if (pattern[i] === '/') {
        // `**/` spans zero or more directories, so `**/a.ts` still matches `a.ts`.
        source += '(?:.*/)?';
        i += 1;
      } else {
        source += '.*';
      }
      continue;
    }

    if (char === '?') {
      source += '[^/]';
      i += 1;
      continue;
    }

    if (char === '[') {
      const bracket = compileBracket(pattern, i);
      if (bracket) {
        source += bracket.source;
        i = bracket.next;
      } else {
        source += '\\[';
        i += 1;
      }
      continue;
    }

    if (char === '{') {
      source += '(?:';
      braceDepth += 1;
      i += 1;
      continue;
    }

    if (char === '}' && braceDepth > 0) {
      source += ')';
      braceDepth -= 1;
      i += 1;
      continue;
    }

    if (char === ',' && braceDepth > 0) {
      source += '|';
      i += 1;
      continue;
    }

    source += escapeLiteral(char);
    i += 1;
  }

  if (braceDepth > 0) {
    throw new SyntaxError(`Invalid glob: unclosed "{" in ${JSON.stringify(pattern)}`);
  }

  return `^${source}$`;
}

/**
 * Compile a glob pattern into a `RegExp` usable anywhere a matcher is accepted.
 *
 * Supported syntax:
 * - `*` — any run of characters except `/`
 * - `**` — any run of characters, `/` included; when followed by a slash it also
 *   matches zero directories, so `**` + `/a.ts` still matches `a.ts`
 * - `?` — exactly one character except `/`
 * - `[abc]`, `[a-z]`, `[!abc]` — character classes
 * - `{a,b}` — alternation, nestable
 * - `\\` — escape the next character
 *
 * Patterns are anchored, so they must match the whole filename.
 *
 * @example
 * classify(files, [{ name: 'docs', match: [glob('*.pdf'), glob('*.{doc,docx}')] }]);
 */
export function glob(pattern: string, options: GlobOptions = {}): RegExp {
  if (typeof pattern !== 'string') {
    throw new TypeError(`Invalid glob: expected a string; received ${typeof pattern}`);
  }
  return new RegExp(toRegExpSource(pattern), options.caseSensitive ? '' : 'i');
}
