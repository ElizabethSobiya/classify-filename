import { describe, expect, it } from 'vitest';
import { classify, glob } from '../src/index.js';

describe('edge cases', () => {
  it('handles an empty filename list', () => {
    const result = classify([], [{ name: 'noc', match: 'noc' }], { explain: 'all' });
    expect(result.sections).toEqual({ noc: [], uncategorized: [] });
    expect(result.matches).toEqual({});
  });

  it('handles an empty section list', () => {
    const result = classify(['a.txt', 'b.txt'], []);
    expect(result.sections).toEqual({ uncategorized: ['a.txt', 'b.txt'] });
  });

  it('returns an empty object when there are no sections and no fallback', () => {
    const result = classify(['a.txt'], [], { fallback: false });
    expect(result.sections).toEqual({});
  });

  it('treats a section with an empty match array as matching nothing', () => {
    const result = classify(['a.txt'], [{ name: 'never', match: [] }]);
    expect(result.sections.never).toEqual([]);
    expect(result.sections.uncategorized).toEqual(['a.txt']);
  });

  it('keeps duplicate filenames as separate entries', () => {
    const result = classify(['a.txt', 'a.txt'], [{ name: 'all', match: /./ }]);
    expect(result.sections.all).toEqual(['a.txt', 'a.txt']);
  });

  it('matches filenames with regex metacharacters literally via string matchers', () => {
    const result = classify(
      ['report (final).pdf', 'report final.pdf'],
      [{ name: 'parens', match: '(final)' }],
    );
    expect(result.sections.parens).toEqual(['report (final).pdf']);
    expect(result.sections.uncategorized).toEqual(['report final.pdf']);
  });

  it('handles non-ASCII filenames', () => {
    const result = classify(
      ['rapport-café.pdf', 'отчёт.pdf', 'notes.pdf'],
      [
        { name: 'accented', match: 'café' },
        { name: 'cyrillic', match: glob('отчёт.*') },
      ],
    );
    expect(result.sections.accented).toEqual(['rapport-café.pdf']);
    expect(result.sections.cyrillic).toEqual(['отчёт.pdf']);
    expect(result.sections.uncategorized).toEqual(['notes.pdf']);
  });

  it('handles filenames with no extension and dotfiles', () => {
    const result = classify(
      ['README', '.gitignore', '.env.local'],
      [
        { name: 'dotfiles', match: glob('.*') },
        { name: 'bare', match: glob('[A-Z]*') },
      ],
    );
    expect(result.sections.dotfiles).toEqual(['.env.local', '.gitignore']);
    expect(result.sections.bare).toEqual(['README']);
  });

  it('passes the original filename to predicate matchers, uncased', () => {
    const seen: string[] = [];
    const spy = (f: string): boolean => {
      seen.push(f);
      return true;
    };
    classify(['MiXeD.TXT'], [{ name: 'spy', match: spy }], { caseSensitive: false });
    expect(seen).toEqual(['MiXeD.TXT']);
  });

  it('preserves input order within a bucket when sort is false under multiMatch', () => {
    const result = classify(
      ['b.pdf', 'a.pdf', 'c.pdf'],
      [
        { name: 'pdfs', match: glob('*.pdf') },
        { name: 'copy', match: /./ },
      ],
      { multiMatch: true, sort: false },
    );
    expect(result.sections.pdfs).toEqual(['b.pdf', 'a.pdf', 'c.pdf']);
    expect(result.sections.copy).toEqual(['b.pdf', 'a.pdf', 'c.pdf']);
  });

  it('does not share array references between buckets', () => {
    const result = classify(
      ['a.pdf'],
      [
        { name: 'one', match: /./ },
        { name: 'two', match: /./ },
      ],
      { multiMatch: true },
    );
    expect(result.sections.one).not.toBe(result.sections.two);
  });

  it('does not mutate the caller inputs', () => {
    const filenames = ['b.txt', 'a.txt'];
    const sections = [{ name: 'all', match: /./ }];
    classify(filenames, sections);
    expect(filenames).toEqual(['b.txt', 'a.txt']);
    expect(sections).toEqual([{ name: 'all', match: /./ }]);
  });

  it('is unaffected by a stateful global regex', () => {
    // A /g regex carries lastIndex between .test() calls; classify must not trip on it.
    const result = classify(['a.pdf', 'b.pdf', 'c.pdf'], [{ name: 'pdfs', match: /\.pdf/g }]);
    expect(result.sections.pdfs).toEqual(['a.pdf', 'b.pdf', 'c.pdf']);
  });

  it('keeps a sticky regex anchored rather than advancing it', () => {
    const result = classify(['ab', 'ba', 'ac'], [{ name: 'a-first', match: /a/y }]);
    expect(result.sections['a-first']).toEqual(['ab', 'ac']);
  });

  it('does not mutate lastIndex on the caller regex', () => {
    const re = /\.pdf/g;
    classify(['a.pdf', 'b.pdf'], [{ name: 'pdfs', match: re }]);
    expect(re.lastIndex).toBe(0);
  });

  it('scales to a large file list', () => {
    const files = Array.from({ length: 20_000 }, (_, i) => `file_${i}.${i % 2 ? 'pdf' : 'txt'}`);
    const result = classify(files, [
      { name: 'pdfs', match: glob('*.pdf') },
      { name: 'texts', match: glob('*.txt') },
    ]);
    expect(result.sections.pdfs).toHaveLength(10_000);
    expect(result.sections.texts).toHaveLength(10_000);
    expect(result.sections.uncategorized).toEqual([]);
  });
});
