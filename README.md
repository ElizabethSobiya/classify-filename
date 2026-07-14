# classify-filename

[![npm version](https://img.shields.io/npm/v/classify-filename.svg)](https://www.npmjs.com/package/classify-filename)
[![npm downloads](https://img.shields.io/npm/dm/classify-filename.svg)](https://www.npmjs.com/package/classify-filename)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/classify-filename.svg)](https://bundlephobia.com/package/classify-filename)
[![types included](https://img.shields.io/npm/types/classify-filename.svg)](https://www.npmjs.com/package/classify-filename)
[![license](https://img.shields.io/npm/l/classify-filename.svg)](./LICENSE)

Sort filenames into named buckets by rules. Zero dependencies, tiny footprint.

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

### Options

| Option | Default | Behavior |
| --- | --- | --- |
| `caseSensitive` | `false` | Applies only to string matchers. RegExp matchers respect their own flags. |
| `fallback` | `'uncategorized'` | Bucket for unmatched files. Pass `false` to drop them. |
| `multiMatch` | `false` | If true, a file lands in **every** matching section, not just the first. |
| `sort` | `'asc'` | Natural-sort ascending. `'desc'`, a comparator, or `false` to disable. |
| `explain` | `false` | When true, result includes a `matches` map from filename → section name. |

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

## Why not just `.filter()`?

`.filter()` gives you one bucket. Real file sorting needs multiple named buckets, priority rules, natural sort, and a fallback for unmatched files — that's boilerplate you'd rewrite every time. `classify-filename` wraps it in a single call.

## Not in v1

- No glob support — use a RegExp for now.
- No file-object input (size, date) — filename-only. Coming in v1.1.
- No CLI — this is a library. A `bin` wrapper may follow.

See [ROADMAP.md](./ROADMAP.md) for what's planned.

## License

MIT
