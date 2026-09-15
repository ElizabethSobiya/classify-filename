import { buildSectionPredicate } from './matcher.js';
import type { ClassifyOptions, ClassifyResult, Section } from './types.js';

const naturalCompare = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

function getComparator(sort: ClassifyOptions['sort']): ((a: string, b: string) => number) | null {
  if (sort === false) return null;
  if (sort === 'desc') return (a, b) => naturalCompare(b, a);
  if (typeof sort === 'function') return sort;
  // 'asc' or undefined
  return naturalCompare;
}

/**
 * Reject section/fallback combinations whose buckets would silently collide.
 * Both cases used to merge unrelated files into one bucket without a word.
 */
function validateSections(sections: Section[], fallback: string | false): void {
  const seen = new Set<string>();

  for (const section of sections) {
    const { name } = section;

    if (typeof name !== 'string' || name.length === 0) {
      throw new TypeError(
        `Invalid section: name must be a non-empty string; received ${JSON.stringify(name)}`,
      );
    }
    if (seen.has(name)) {
      throw new Error(
        `Duplicate section name ${JSON.stringify(name)}. Combine the rules into one section with an array matcher instead.`,
      );
    }
    if (name === fallback) {
      throw new Error(
        `Section ${JSON.stringify(name)} collides with the fallback bucket. Rename the section, or set a different \`fallback\`.`,
      );
    }

    seen.add(name);
  }
}

/**
 * Classify filenames into named buckets based on section rules.
 * Section array order determines priority — earlier sections win ties
 * unless `multiMatch: true`.
 */
export function classify(
  filenames: string[],
  sections: Section[],
  options: ClassifyOptions & { explain: 'all' },
): ClassifyResult<string[]>;
export function classify(
  filenames: string[],
  sections: Section[],
  options?: ClassifyOptions & { explain?: boolean },
): ClassifyResult<string>;
// An options *variable* typed as plain `ClassifyOptions` could carry either form,
// so its result is the union — narrow it at the call site rather than trusting a
// guess that would be wrong half the time.
export function classify(
  filenames: string[],
  sections: Section[],
  options: ClassifyOptions,
): ClassifyResult<string | string[]>;
export function classify(
  filenames: string[],
  sections: Section[],
  options: ClassifyOptions = {},
): ClassifyResult<string | string[]> {
  const {
    caseSensitive = false,
    fallback = 'uncategorized',
    multiMatch = false,
    sort = 'asc',
    explain = false,
  } = options;

  validateSections(sections, fallback);

  // Precompute a predicate per section (single loop over sections, once).
  const compiled = sections.map((section) => ({
    name: section.name,
    test: buildSectionPredicate(section.match, caseSensitive),
  }));

  // Keyed by caller-supplied strings, so these are Maps rather than plain objects:
  // a section, fallback, or filename called `__proto__` would otherwise hit
  // Object.prototype instead of creating an own property. They become plain
  // objects again via Object.fromEntries, which always defines own properties.
  //
  // Initialize buckets — include empty ones for predictable output.
  const buckets = new Map<string, string[]>();
  for (const section of sections) {
    buckets.set(section.name, []);
  }
  if (fallback !== false) {
    buckets.set(fallback, []);
  }

  // `explain: true` keeps the original one-section-per-file shape; `'all'` records
  // every section a file landed in, which is what multiMatch actually needs.
  const explainAll = explain === 'all';
  const matches = new Map<string, string | string[]>();

  for (const filename of filenames) {
    let matched = false;

    for (const { name, test } of compiled) {
      if (test(filename)) {
        buckets.get(name)?.push(filename);
        if (explainAll) {
          const landed = (matches.get(filename) ?? []) as string[];
          landed.push(name);
          matches.set(filename, landed);
        } else if (explain && !matches.has(filename)) {
          matches.set(filename, name);
        }
        matched = true;
        if (!multiMatch) break;
      }
    }

    if (!matched && fallback !== false) {
      buckets.get(fallback)?.push(filename);
      if (explain) matches.set(filename, explainAll ? [fallback] : fallback);
    }
  }

  // Sort each bucket.
  const comparator = getComparator(sort);
  if (comparator) {
    for (const bucket of buckets.values()) {
      bucket.sort(comparator);
    }
  }

  const result: ClassifyResult<string | string[]> = { sections: Object.fromEntries(buckets) };
  if (explain) result.matches = Object.fromEntries(matches);

  // The overloads above pin the exact `matches` shape per `explain` form; the
  // implementation stays loose and narrows here, once.
  return result as ClassifyResult<string> & ClassifyResult<string[]>;
}
