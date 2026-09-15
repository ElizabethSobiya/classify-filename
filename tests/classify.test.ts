import { describe, expect, expectTypeOf, it } from 'vitest';
import { classify } from '../src/index.js';
import type { ClassifyOptions } from '../src/index.js';

const files = [
  'NOC_2024.pdf',
  'noc_letter.pdf',
  'agreement_v1.docx',
  'AGREEMENT_final.docx',
  'invoice_10.pdf',
  'invoice_2.pdf',
  'random.txt',
];

describe('classify', () => {
  it('buckets files into named sections by first match', () => {
    const result = classify(files, [
      { name: 'noc', match: /^noc/i },
      { name: 'agreements', match: 'agreement' },
      { name: 'invoices', match: /^invoice/i },
    ]);

    expect(result.sections.noc).toEqual(['NOC_2024.pdf', 'noc_letter.pdf']);
    expect(result.sections.agreements).toEqual(['AGREEMENT_final.docx', 'agreement_v1.docx']);
    expect(result.sections.invoices).toEqual(['invoice_2.pdf', 'invoice_10.pdf']);
    expect(result.sections.uncategorized).toEqual(['random.txt']);
  });

  it('sorts naturally (file2 before file10) by default', () => {
    const result = classify(['f10.txt', 'f2.txt', 'f1.txt'], [{ name: 'all', match: /./ }]);
    expect(result.sections.all).toEqual(['f1.txt', 'f2.txt', 'f10.txt']);
  });

  it('respects section order for priority (first match wins)', () => {
    const result = classify(
      ['noc_agreement.pdf'],
      [
        { name: 'noc', match: 'noc' },
        { name: 'agreements', match: 'agreement' },
      ],
    );
    expect(result.sections.noc).toEqual(['noc_agreement.pdf']);
    expect(result.sections.agreements).toEqual([]);
  });

  it('places file in all matching sections when multiMatch is true', () => {
    const result = classify(
      ['noc_agreement.pdf'],
      [
        { name: 'noc', match: 'noc' },
        { name: 'agreements', match: 'agreement' },
      ],
      { multiMatch: true },
    );
    expect(result.sections.noc).toEqual(['noc_agreement.pdf']);
    expect(result.sections.agreements).toEqual(['noc_agreement.pdf']);
  });

  it('drops unmatched files when fallback is false', () => {
    const result = classify(['random.txt'], [{ name: 'noc', match: 'noc' }], {
      fallback: false,
    });
    expect(result.sections.noc).toEqual([]);
    expect(result.sections.uncategorized).toBeUndefined();
  });

  it('uses custom fallback name', () => {
    const result = classify(['random.txt'], [{ name: 'noc', match: 'noc' }], {
      fallback: 'other',
    });
    expect(result.sections.other).toEqual(['random.txt']);
  });

  it('respects caseSensitive for string matchers only', () => {
    const result = classify(['NOC.pdf', 'noc.pdf'], [{ name: 'noc', match: 'noc' }], {
      caseSensitive: true,
    });
    expect(result.sections.noc).toEqual(['noc.pdf']);
    expect(result.sections.uncategorized).toEqual(['NOC.pdf']);
  });

  it('preserves original order when sort is false', () => {
    const input = ['b.txt', 'a.txt', 'c.txt'];
    const result = classify(input, [{ name: 'all', match: /./ }], { sort: false });
    expect(result.sections.all).toEqual(['b.txt', 'a.txt', 'c.txt']);
  });

  it('sorts descending on request', () => {
    const result = classify(['a.txt', 'c.txt', 'b.txt'], [{ name: 'all', match: /./ }], {
      sort: 'desc',
    });
    expect(result.sections.all).toEqual(['c.txt', 'b.txt', 'a.txt']);
  });

  it('accepts a custom comparator', () => {
    const result = classify(['aa', 'b', 'ccc'], [{ name: 'all', match: /./ }], {
      sort: (a, b) => a.length - b.length,
    });
    expect(result.sections.all).toEqual(['b', 'aa', 'ccc']);
  });

  it('includes empty sections in the output', () => {
    const result = classify(
      ['x.txt'],
      [
        { name: 'noc', match: 'noc' },
        { name: 'agreements', match: 'agreement' },
      ],
    );
    expect(result.sections.noc).toEqual([]);
    expect(result.sections.agreements).toEqual([]);
    expect(result.sections.uncategorized).toEqual(['x.txt']);
  });

  it('returns an explain map when explain is true', () => {
    const result = classify(['noc.pdf', 'x.txt'], [{ name: 'noc', match: 'noc' }], {
      explain: true,
    });
    expect(result.matches).toEqual({
      'noc.pdf': 'noc',
      'x.txt': 'uncategorized',
    });
  });

  it('reports only the first section under explain: true, even with multiMatch', () => {
    const result = classify(
      ['noc_agreement.pdf'],
      [
        { name: 'noc', match: 'noc' },
        { name: 'agreements', match: 'agreement' },
      ],
      { multiMatch: true, explain: true },
    );
    // Preserved from 0.1.x on purpose — `explain: 'all'` is the lossless form.
    expect(result.matches).toEqual({ 'noc_agreement.pdf': 'noc' });
  });

  it("explains every matching section under explain: 'all'", () => {
    const result = classify(
      ['noc_agreement.pdf', 'x.txt'],
      [
        { name: 'noc', match: 'noc' },
        { name: 'agreements', match: 'agreement' },
        { name: 'pdfs', match: '.pdf' },
      ],
      { multiMatch: true, explain: 'all' },
    );
    expect(result.matches).toEqual({
      'noc_agreement.pdf': ['noc', 'agreements', 'pdfs'],
      'x.txt': ['uncategorized'],
    });
  });

  it("wraps single matches in an array under explain: 'all' without multiMatch", () => {
    const result = classify(
      ['noc_agreement.pdf', 'x.txt'],
      [
        { name: 'noc', match: 'noc' },
        { name: 'agreements', match: 'agreement' },
      ],
      { explain: 'all' },
    );
    expect(result.matches).toEqual({
      'noc_agreement.pdf': ['noc'],
      'x.txt': ['uncategorized'],
    });
  });

  it("reports the custom fallback name under explain: 'all'", () => {
    const result = classify(['x.txt'], [{ name: 'noc', match: 'noc' }], {
      explain: 'all',
      fallback: 'other',
    });
    expect(result.matches).toEqual({ 'x.txt': ['other'] });
  });

  it('omits dropped files from the explain map when fallback is false', () => {
    const result = classify(['noc.pdf', 'x.txt'], [{ name: 'noc', match: 'noc' }], {
      explain: 'all',
      fallback: false,
    });
    expect(result.matches).toEqual({ 'noc.pdf': ['noc'] });
  });

  it('types matches as string or string[] according to the explain form', () => {
    const one = classify(['a'], [{ name: 's', match: 'a' }], { explain: true });
    expectTypeOf(one.matches).toEqualTypeOf<Record<string, string> | undefined>();

    const all = classify(['a'], [{ name: 's', match: 'a' }], { explain: 'all' });
    expectTypeOf(all.matches).toEqualTypeOf<Record<string, string[]> | undefined>();

    const none = classify(['a'], [{ name: 's', match: 'a' }]);
    expectTypeOf(none.matches).toEqualTypeOf<Record<string, string> | undefined>();

    // An options variable could hold either form, so the result is the union —
    // claiming `string` here would typecheck code that throws at runtime.
    const opts: ClassifyOptions = { explain: 'all' };
    const either = classify(['a'], [{ name: 's', match: 'a' }], opts);
    expectTypeOf(either.matches).toEqualTypeOf<Record<string, string | string[]> | undefined>();
  });

  it('omits matches map when explain is false', () => {
    const result = classify(['noc.pdf'], [{ name: 'noc', match: 'noc' }]);
    expect(result.matches).toBeUndefined();
  });

  it('rejects duplicate section names', () => {
    expect(() =>
      classify(
        ['a.txt'],
        [
          { name: 'dup', match: 'a' },
          { name: 'dup', match: 'b' },
        ],
      ),
    ).toThrow(/Duplicate section name "dup"/);
  });

  it('rejects a section that collides with the fallback bucket', () => {
    expect(() => classify(['a.txt'], [{ name: 'uncategorized', match: 'a' }])).toThrow(
      /collides with the fallback bucket/,
    );
    expect(() =>
      classify(['a.txt'], [{ name: 'other', match: 'a' }], { fallback: 'other' }),
    ).toThrow(/collides with the fallback bucket/);
  });

  it('allows a section named like the fallback when the fallback is disabled', () => {
    const result = classify(['a.txt'], [{ name: 'uncategorized', match: 'a' }], {
      fallback: false,
    });
    expect(result.sections.uncategorized).toEqual(['a.txt']);
  });

  it('rejects an empty or non-string section name', () => {
    expect(() => classify(['a.txt'], [{ name: '', match: 'a' }])).toThrow(TypeError);
    // @ts-expect-error — exercising the runtime guard
    expect(() => classify(['a.txt'], [{ name: 42, match: 'a' }])).toThrow(TypeError);
  });

  it('supports array of matchers OR-combined per section', () => {
    const result = classify(
      ['agreement.pdf', 'contract.pdf', 'noc.pdf'],
      [{ name: 'legal', match: ['agreement', /contract/i] }],
    );
    expect(result.sections.legal).toEqual(['agreement.pdf', 'contract.pdf']);
    expect(result.sections.uncategorized).toEqual(['noc.pdf']);
  });
});
