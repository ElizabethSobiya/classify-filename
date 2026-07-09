import { describe, expect, it } from 'vitest';
import { buildSectionPredicate, normalizeMatcher } from '../src/matcher.js';

describe('normalizeMatcher', () => {
  it('matches strings case-insensitively by default', () => {
    const p = normalizeMatcher('noc', false);
    expect(p('NOC_report.pdf')).toBe(true);
    expect(p('noc_report.pdf')).toBe(true);
    expect(p('agreement.pdf')).toBe(false);
  });

  it('matches strings case-sensitively when asked', () => {
    const p = normalizeMatcher('NOC', true);
    expect(p('NOC_report.pdf')).toBe(true);
    expect(p('noc_report.pdf')).toBe(false);
  });

  it('respects regex own flags regardless of caseSensitive option', () => {
    const p1 = normalizeMatcher(/^NOC/, false);
    expect(p1('NOC_x.pdf')).toBe(true);
    expect(p1('noc_x.pdf')).toBe(false);

    const p2 = normalizeMatcher(/^NOC/i, true);
    expect(p2('noc_x.pdf')).toBe(true);
  });

  it('calls custom predicates as-is', () => {
    const p = normalizeMatcher((f) => f.endsWith('.pdf'), false);
    expect(p('x.pdf')).toBe(true);
    expect(p('x.txt')).toBe(false);
  });

  it('throws on invalid matcher', () => {
    // biome-ignore lint/suspicious/noExplicitAny: intentional bad input for test
    expect(() => normalizeMatcher(123 as any, false)).toThrow(TypeError);
  });
});

describe('buildSectionPredicate', () => {
  it('OR-combines an array of matchers', () => {
    const p = buildSectionPredicate(['agreement', /contract/i], false);
    expect(p('service_agreement.pdf')).toBe(true);
    expect(p('CONTRACT_v2.pdf')).toBe(true);
    expect(p('invoice.pdf')).toBe(false);
  });

  it('handles a single matcher without an array', () => {
    const p = buildSectionPredicate('noc', false);
    expect(p('noc_letter.pdf')).toBe(true);
  });

  it('returns false-predicate for empty array', () => {
    const p = buildSectionPredicate([], false);
    expect(p('anything.pdf')).toBe(false);
  });
});
