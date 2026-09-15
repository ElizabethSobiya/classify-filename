import { describe, expect, it } from 'vitest';
import { classify, glob } from '../src/index.js';

const match = (pattern: string, filename: string) => glob(pattern).test(filename);

describe('glob', () => {
  it('matches the whole filename, not a substring', () => {
    expect(match('*.pdf', 'invoice.pdf')).toBe(true);
    expect(match('invoice', 'invoice.pdf')).toBe(false);
    expect(match('.pdf', 'invoice.pdf')).toBe(false);
  });

  it('treats * as any run of characters except a slash', () => {
    expect(match('*.ts', 'index.ts')).toBe(true);
    expect(match('*.ts', 'src/index.ts')).toBe(false);
    expect(match('src/*.ts', 'src/index.ts')).toBe(true);
  });

  it('treats ** as any run of characters including slashes', () => {
    expect(match('src/**', 'src/a/b/c.ts')).toBe(true);
    expect(match('**.ts', 'src/deep/index.ts')).toBe(true);
  });

  it('lets **/ span zero directories', () => {
    expect(match('**/index.ts', 'index.ts')).toBe(true);
    expect(match('**/index.ts', 'src/index.ts')).toBe(true);
    expect(match('**/index.ts', 'src/deep/index.ts')).toBe(true);
  });

  it('treats ? as exactly one character', () => {
    expect(match('report-??.pdf', 'report-01.pdf')).toBe(true);
    expect(match('report-??.pdf', 'report-1.pdf')).toBe(false);
    expect(match('report-??.pdf', 'report-001.pdf')).toBe(false);
  });

  it('supports character classes and negation', () => {
    expect(match('file[0-9].txt', 'file7.txt')).toBe(true);
    expect(match('file[0-9].txt', 'filex.txt')).toBe(false);
    expect(match('file[!0-9].txt', 'filex.txt')).toBe(true);
    expect(match('file[!0-9].txt', 'file7.txt')).toBe(false);
    expect(match('file[^0-9].txt', 'filex.txt')).toBe(true);
  });

  it('supports brace alternation, including nested braces', () => {
    expect(match('*.{doc,docx}', 'notes.docx')).toBe(true);
    expect(match('*.{doc,docx}', 'notes.pdf')).toBe(false);
    expect(match('{a,b{c,d}}.txt', 'bd.txt')).toBe(true);
    expect(match('{a,b{c,d}}.txt', 'be.txt')).toBe(false);
  });

  it('escapes regex metacharacters in literal text', () => {
    expect(match('a+b.txt', 'a+b.txt')).toBe(true);
    expect(match('a+b.txt', 'aab.txt')).toBe(false);
    expect(match('(v1).txt', '(v1).txt')).toBe(true);
  });

  it('honors backslash escapes for glob metacharacters', () => {
    expect(match('a\\*b.txt', 'a*b.txt')).toBe(true);
    expect(match('a\\*b.txt', 'axxb.txt')).toBe(false);
    expect(match('a\\?.txt', 'a?.txt')).toBe(true);
  });

  it('treats an unterminated bracket as a literal', () => {
    expect(match('file[0-9.txt', 'file[0-9.txt')).toBe(true);
  });

  it('is case-insensitive by default and case-sensitive on request', () => {
    expect(match('*.pdf', 'INVOICE.PDF')).toBe(true);
    expect(glob('*.pdf', { caseSensitive: true }).test('INVOICE.PDF')).toBe(false);
    expect(glob('*.pdf', { caseSensitive: true }).test('invoice.pdf')).toBe(true);
  });

  it('throws on an unclosed brace', () => {
    expect(() => glob('*.{doc,docx')).toThrow(SyntaxError);
  });

  it('throws when the pattern is not a string', () => {
    // @ts-expect-error — exercising the runtime guard
    expect(() => glob(42)).toThrow(TypeError);
  });

  it('works as a matcher inside classify', () => {
    const result = classify(
      ['invoice_2.pdf', 'invoice_10.pdf', 'notes.docx', 'readme.md'],
      [
        { name: 'pdfs', match: glob('*.pdf') },
        { name: 'docs', match: [glob('*.{doc,docx}'), glob('*.md')] },
      ],
    );

    expect(result.sections.pdfs).toEqual(['invoice_2.pdf', 'invoice_10.pdf']);
    expect(result.sections.docs).toEqual(['notes.docx', 'readme.md']);
    expect(result.sections.uncategorized).toEqual([]);
  });

  it('is unaffected by the caseSensitive option, like any RegExp matcher', () => {
    const result = classify(['NOTES.PDF'], [{ name: 'pdfs', match: glob('*.pdf') }], {
      caseSensitive: true,
    });
    expect(result.sections.pdfs).toEqual(['NOTES.PDF']);
  });
});
