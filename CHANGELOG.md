# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.2.0 — 2026-09-15

No exported API signatures changed, and no existing option or matcher form
behaves differently — verified against the published 0.1.2 across 972
option/section combinations, with byte-identical output.

Two changes are nevertheless backward-incompatible at runtime, and are listed
under **Changed** below: `classify()` now throws on duplicate section names and
on a section named the same as `fallback`. Both configurations previously
produced silently wrong buckets, so callers relying on them were already getting
corrupt output — but callers who pass either one **will now get an exception
where 0.1.x returned a result**, and should be checked before upgrading.

### Added

- **`glob()` matcher helper.** Compiles a glob pattern into a `RegExp`, usable
  anywhere a matcher is accepted. Supports `*`, `**`, `?`, `[abc]` / `[!abc]`,
  nested `{a,b}` alternation, and `\` escapes. Patterns are anchored (they must
  match the whole filename) and case-insensitive by default, matching the
  behavior of string matchers; pass `{ caseSensitive: true }` to opt out. Zero
  dependencies, as ever.

  ```ts
  import { classify, glob } from 'classify-filename';

  classify(files, [{ name: 'docs', match: [glob('*.pdf'), glob('*.{doc,docx}')] }]);
  ```

- **`explain: 'all'`** — a lossless form of `explain` that maps each filename to
  an array of *every* section it landed in, in section order. Under
  `multiMatch: true` a file lands in several sections, but `explain: true`
  reports only the first — precisely the case `explain` exists to debug.

  ```ts
  classify(['noc_agreement.pdf'], sections, { multiMatch: true, explain: 'all' });
  // matches: { 'noc_agreement.pdf': ['noc', 'agreements'] }
  ```

  `explain: true` is unchanged and still returns `Record<string, string>`.
  Overloads give each literal form an exact return type, so `matches` types as
  `Record<string, string>` or `Record<string, string[]>` with no narrowing at
  the call site. Passing an options *variable* typed as plain `ClassifyOptions`
  yields `Record<string, string | string[]>`, since either form could be in it.

- Validation for section configurations that previously failed silently — see
  **Changed** below.

### Fixed

- **Section, fallback, and file names that collide with `Object.prototype`.**
  Buckets and the `explain` map were plain objects keyed by caller-supplied
  strings, so those names reached the prototype instead of creating own
  properties. A section named `__proto__` vanished from the result entirely,
  taking its files with it; a file named `__proto__` crashed `explain: 'all'`
  with a `TypeError`; and a file named `constructor` was dropped from the
  `explain: true` map. Both structures are now built as `Map`s and converted with
  `Object.fromEntries`, which always defines own properties. The result stays an
  ordinary object — not a null-prototype one — so `hasOwnProperty` and spreading
  keep working.

- **A `g` or `y` flagged RegExp matcher skipped files.** Such a regex carries
  `lastIndex` between `.test()` calls, so `/\.pdf/g` matched `a.pdf`, skipped
  `b.pdf`, matched `c.pdf` — a file's fate depended on how many filenames
  happened to precede it. Matchers are now rewound per call, against a clone, so
  the caller's regex is never mutated. Sticky (`y`) patterns stay anchored.

### Changed

- **Backward-incompatible:** `classify()` now throws on two configurations that
  used to corrupt the output quietly. Both are programming errors with no
  sensible silent behavior, but code that passes either one changes from
  returning a (wrong) result to raising:
  - **Duplicate section names.** Under `multiMatch` the same file was pushed
    into the shared bucket twice; otherwise the later section was unreachable.
    Combine the rules into one section with an array matcher instead.
  - **A section named the same as `fallback`.** Unmatched files were silently
    poured into a real section. Rename the section, or set a different
    `fallback` — or `fallback: false`, which makes the name available again.

  A section `name` that is not a non-empty string now throws a `TypeError`.

## 0.1.2 — 2026-07-14

### Changed

- README: sorting rationale and roadmap detail. Added the `router` keyword.

## 0.1.1 — 2026-07-13

### Added

- `repository`, `bugs`, and `homepage` fields in `package.json`.
- npm, size, types, and license badges in the README.

## 0.1.0 — 2026-07-10

### Added

- Initial release: `classify()` with string, RegExp, function, and array
  matchers; `caseSensitive`, `fallback`, `multiMatch`, `sort`, and `explain`
  options.
