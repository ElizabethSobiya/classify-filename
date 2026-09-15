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
  options?: ClassifyOptions,
): ClassifyResult<string>;
export function classify(
  filenames: string[],
  sections: Section[],
  options: ClassifyOptions = {},
): ClassifyResult<string> | ClassifyResult<string[]> {
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

  // Initialize buckets — include empty ones for predictable output.
  const buckets: Record<string, string[]> = {};
  for (const section of sections) {
    buckets[section.name] = [];
  }
  if (fallback !== false) {
    buckets[fallback] = [];
  }

  // `explain: true` keeps the original one-section-per-file shape; `'all'` records
  // every section a file landed in, which is what multiMatch actually needs.
  const explainAll = explain === 'all';
  const matches: Record<string, string | string[]> = {};

  for (const filename of filenames) {
    let matched = false;

    for (const { name, test } of compiled) {
      if (test(filename)) {
        buckets[name]?.push(filename);
        if (explainAll) {
          const landed = (matches[filename] ?? []) as string[];
          landed.push(name);
          matches[filename] = landed;
        } else if (explain && !(filename in matches)) {
          matches[filename] = name;
        }
        matched = true;
        if (!multiMatch) break;
      }
    }

    if (!matched && fallback !== false) {
      buckets[fallback]?.push(filename);
      if (explain) matches[filename] = explainAll ? [fallback] : fallback;
    }
  }

  // Sort each bucket.
  const comparator = getComparator(sort);
  if (comparator) {
    for (const name of Object.keys(buckets)) {
      buckets[name]?.sort(comparator);
    }
  }

  const result: { sections: Record<string, string[]>; matches?: typeof matches } = {
    sections: buckets,
  };
  if (explain) result.matches = matches;

  // The overloads above pin the exact `matches` shape per `explain` form; the
  // implementation stays loose and narrows here, once.
  return result as ClassifyResult<string> & ClassifyResult<string[]>;
}
