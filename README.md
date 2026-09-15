# classify-filename

[![npm version](https://img.shields.io/npm/v/classify-filename.svg)](https://www.npmjs.com/package/classify-filename)
[![npm downloads](https://img.shields.io/npm/dm/classify-filename.svg)](https://www.npmjs.com/package/classify-filename)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/classify-filename.svg)](https://bundlephobia.com/package/classify-filename)
[![types included](https://img.shields.io/npm/types/classify-filename.svg)](https://www.npmjs.com/package/classify-filename)
[![license](https://img.shields.io/npm/l/classify-filename.svg)](./LICENSE)

Sort filenames into named buckets by rules — strings, globs, regex, or predicates. Zero dependencies, tiny footprint.

```bash
npm install classify-filename
```

## Quick start

```ts
import { classify } from 'classify-filename';

const files = [
  'NOC_2024.pdf',
  'noc_letter.pdf',
  'agreement_v1.docx',
  'invoice_2.pdf',
  'invoice_10.pdf',
  'random.txt',
];

const result = classify(files, [
  { name: 'noc',        match: /^noc/i },
  { name: 'agreements', match: 'agreement' },
  { name: 'invoices',   match: /^invoice/i },
]);

// result.sections:
// {
//   noc:           ['noc_letter.pdf', 'NOC_2024.pdf'],
//   agreements:    ['agreement_v1.docx'],
//   invoices:      ['invoice_2.pdf', 'invoice_10.pdf'],  // natural sort: 2 before 10
//   uncategorized: ['random.txt'],
// }
```

## API

### `classify(filenames, sections, options?)`

**Parameters**

- `filenames: string[]` — the filenames to sort.
- `sections: Section[]` — buckets with matching rules. **Order matters** — earlier sections win on conflict.
- `options: ClassifyOptions` — see below.

**Returns** `ClassifyResult` — `{ sections: Record<string, string[]> }`, plus `matches` when `explain: true`.

### Matchers

A section's `match` can be:

- a **string** — substring match (case-insensitive by default)
- a **RegExp** — `.test()`-ed against the filename; respects its own flags
- a **function** — `(filename) => boolean` for arbitrary logic
- an **array** of the above — OR-combined

```ts
{ name: 'legal', match: ['agreement', 'contract', /nda/i] }
```

### Globs

`glob()` compiles a glob pattern into a `RegExp`, so it works anywhere a matcher
is accepted:

```ts
import { classify, glob } from 'classify-filename';

classify(files, [
  { name: 'docs',   match: [glob('*.{doc,docx}'), glob('*.pdf')] },
  { name: 'drafts', match: glob('draft-??.*') },
]);
```

| Syntax | Matches |
| --- | --- |
| `*` | any run of characters except `/` |
| `**` | any run of characters, `/` included |
| `**/` | zero or more directories — `glob('**/a.ts')` matches `a.ts` too |
| `?` | exactly one character except `/` |
| `[abc]`, `[a-z]` | one character from the set |
| `[!abc]`, `[^abc]` | one character *not* in the set |
| `{a,b}` | alternation; nestable, as in `{a,b{c,d}}` |
| `\*` | a literal `*` — backslash escapes the next character |

Two things to know:

- **Patterns are anchored.** `glob('*.pdf')` matches the whole filename, unlike a
  bare string matcher, which matches a substring.
- **Case-insensitive by default**, to line up with string matchers. Pass
  `glob(pattern, { caseSensitive: true })` to opt out. The `caseSensitive`
  *option* on `classify()` does not affect globs — they compile to a RegExp, and
  RegExp matchers always respect their own flags.

### Options

| Option | Default | Behavior |
| --- | --- | --- |
| `caseSensitive` | `false` | Applies only to string matchers. RegExp matchers respect their own flags. |
| `fallback` | `'uncategorized'` | Bucket for unmatched files. Pass `false` to drop them. |
| `multiMatch` | `false` | If true, a file lands in **every** matching section, not just the first. |
| `sort` | `'asc'` | Natural-sort ascending. `'desc'`, a comparator, or `false` to disable. |
| `explain` | `false` | `true` adds a `matches` map from filename → section name. `'all'` maps to an array of every matching section. |

### Priority is section order

The first section whose predicate returns `true` wins:

```ts
// noc_agreement.pdf lands in 'noc', not 'agreements'.
classify(['noc_agreement.pdf'], [
  { name: 'noc',        match: 'noc' },        // checked first
  { name: 'agreements', match: 'agreement' },
]);
```

Put **narrow rules first**, **broad rules last**.

### Debugging with `explain`

```ts
const result = classify(files, sections, { explain: true });
console.log(result.matches);
// { 'noc_agreement.pdf': 'noc', 'random.txt': 'uncategorized', ... }
```

Under `multiMatch: true` a file lands in several sections at once, and
`explain: true` reports only the first. Use `explain: 'all'` to get every
section a file landed in, in section order:

```ts
classify(['noc_agreement.pdf'], sections, { multiMatch: true, explain: 'all' });
// matches: { 'noc_agreement.pdf': ['noc', 'agreements'] }
```

Both forms are typed exactly, so there is nothing to narrow at the call site:

```ts
classify(files, sections, { explain: true }).matches;  // Record<string, string>
classify(files, sections, { explain: 'all' }).matches; // Record<string, string[]>
```

Passing an options *variable* typed as plain `ClassifyOptions` gives
`Record<string, string | string[]>`, since either form could be inside it —
narrow it, or type the variable with the `explain` form you actually use.

### Section names must be unique

`classify()` throws when two sections share a `name`, or when a section is named
the same as the `fallback` bucket — both used to merge unrelated files into one
bucket with no warning. To OR two rule sets into a single bucket, use an array
matcher rather than repeating the name:

```ts
// Throws: Duplicate section name "legal"
[{ name: 'legal', match: 'agreement' }, { name: 'legal', match: 'contract' }]

// Do this instead
[{ name: 'legal', match: ['agreement', 'contract'] }]
```

Setting `fallback: false` frees up the fallback name for use as a section.

## Why not just `.filter()`?

`.filter()` gives you one bucket. Real file sorting needs multiple named buckets, priority rules, natural sort, and a fallback for unmatched files — that's boilerplate you'd rewrite every time. `classify-filename` wraps it in a single call.

## Not yet supported

- No file-object input (size, date) — filename-only. Planned for 0.3.
- No CLI — this is a library. A `bin` wrapper may follow.

See [ROADMAP.md](./ROADMAP.md) for what's planned and
[CHANGELOG.md](./CHANGELOG.md) for what has shipped.

## License

MIT
