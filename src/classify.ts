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
 * Classify filenames into named buckets based on section rules.
 * Section array order determines priority — earlier sections win ties
 * unless `multiMatch: true`.
 */
export function classify(
  filenames: string[],
  sections: Section[],
  options: ClassifyOptions = {},
): ClassifyResult {
  const {
    caseSensitive = false,
    fallback = 'uncategorized',
    multiMatch = false,
    sort = 'asc',
    explain = false,
  } = options;

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
    buckets[fallback] ??= [];
  }

  const matches: Record<string, string> = {};

  for (const filename of filenames) {
    let matched = false;

    for (const { name, test } of compiled) {
      if (test(filename)) {
        buckets[name]?.push(filename);
        if (explain && !(filename in matches)) {
          matches[filename] = name;
        }
        matched = true;
        if (!multiMatch) break;
      }
    }

    if (!matched && fallback !== false) {
      buckets[fallback]?.push(filename);
      if (explain) matches[filename] = fallback;
    }
  }

  // Sort each bucket.
  const comparator = getComparator(sort);
  if (comparator) {
    for (const name of Object.keys(buckets)) {
      buckets[name]?.sort(comparator);
    }
  }

  const result: ClassifyResult = { sections: buckets };
  if (explain) result.matches = matches;
  return result;
}
