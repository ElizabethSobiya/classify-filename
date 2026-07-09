import { describe, expect, it } from 'vitest';
import { classify } from '../src/index.js';

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

  it('omits matches map when explain is false', () => {
    const result = classify(['noc.pdf'], [{ name: 'noc', match: 'noc' }]);
    expect(result.matches).toBeUndefined();
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
