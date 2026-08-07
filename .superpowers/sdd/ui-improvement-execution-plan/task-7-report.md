# Task 7 report — typography, spacing, and component variants

## Scope

Task 7 migrated only the five exact typography utilities requested by the
plan, promoted the two repeated spacing patterns into small public component
variants, and left all unmatched arbitrary values untouched.

| exact source utility | semantic utility | production before | production after |
| --- | --- | ---: | ---: |
| `text-[13.5px]` | `text-body` | 45 | 0 |
| `text-[12.5px]` | `text-body-sm` | 31 | 0 |
| `text-[11px]` | `text-label` | 27 | 0 |
| `text-[11.5px]` | `text-caption` | 29 | 0 |
| `text-[14.5px]` | `text-card-heading` | 7 | 0 |
| **total** |  | **139** | **0** |

Variant work is intentionally narrow:

- `Card` exposes `padding='inset'` for the two repeated `px-[18px] py-4`
  call sites.
- `TableHead` and `TableCell` expose `padding='compact'` for the five heads
  and four cells that exactly use `py-[9px] px-3`.
- Direct React behavior tests prove the public variants render their padding
  and that caller classes still win through `cn()`/`twMerge`.

Every typography replacement preserves existing responsive/state prefixes and
explicit `leading-*` utilities. Intentional 14px and 15px headings were not
normalized.

## Root cause and fix

The first visual run reproduced a mismatch even though the semantic classes
had the correct compiled CSS. `cn()` used the default `tailwind-merge`
configuration, which does not know the project's custom font-size utilities.
It classified them as text utilities that conflict with semantic color classes:

```text
twMerge('text-body text-fg-soft')       -> 'text-fg-soft'
twMerge('text-label text-faint')        -> 'text-faint'
twMerge('text-card-heading text-fg')    -> 'text-fg'
twMerge('text-[13.5px] text-fg-soft')   -> 'text-[13.5px] text-fg-soft'
```

The resulting nav links changed from 13.5px/21.6px to the inherited
14px/22.4px, and the same merge path produced the large archive/batch/trigger
capture deltas. Temporary isolation proved the Card-only and Table-only groups
were pixel-identical to the Task 6 baseline; typography-only reproduced the
entire mismatch.

TDD evidence is recorded by `src/lib/utils.test.ts`: the five coexistence
assertions failed 5/7 tests against the default merge, then passed after
`src/lib/utils.ts` extended the existing `font-size` class group with exactly
the five semantic classes. The test also proves last-wins behavior between
semantic font sizes and preserves normal `px-*` conflict merging.

## Remaining arbitrary-value tail

Using the same production-source scan as the earlier tasks, the numeric plan
prefix fell from 296 to 146 occurrences. The 150 removed occurrences are the
139 typography classes above plus 11 exact repeated padding declarations. The
remaining scans are intentionally unmatched values:

```text
all arbitrary utilities: 520
all color-var utilities: 204
plan-prefix color-var utilities: 190
plan-prefix numeric utilities: 146
```

These tails include responsive geometry, one-off spacing, status colors,
surface colors, and other values without an exact Task 7 token/variant match;
no speculative tokens were introduced.

## Visual and computed-style evidence

The final built CSS and browser measurements retain the requested values:

| semantic utility | computed font size / line height |
| --- | --- |
| `text-body` | 13.5px / 21.6px |
| `text-body-sm` | 12.5px / 20px |
| `text-label` | 11px / 17.6px |
| `text-caption` | 11.5px / 18.4px |
| `text-card-heading` | 14.5px / 23.2px |

The clean Task 6 checkout, Card-only isolation, Table-only isolation, and
final Task 7 capture all agree pixel-for-pixel. The required final aggregate
is:

```text
e1b77810dfc94c578747c333550696ef04b26822308cd0a5f95947f5284938a
```

The manifest SHA remains
`05e0b000f2504908dcd40c3a02eca1a393b6606d1d86b5444f77cbbbd504077f`.

## Verification

- `pnpm lint:fix` — passed.
- `pnpm lint` — passed; 180 files checked.
- `pnpm build` — passed (`tsc -b` and Vite transformed 1,889 modules).
- `pnpm test` — passed; 39 files / 363 tests.
- `pnpm run knip` — passed with no findings.
- `pnpm exec playwright test e2e/capture-screenshots.spec.ts` — 18/18
  passed; aggregate SHA above.
- `pnpm e2e` — 170 passed, 1 known pre-existing failure in
  `e2e/archive-search.spec.ts:180` because it still expects the old
  `아카이브 검색 결과를 불러오지 못했습니다` copy.

Temporary diagnostic checkouts/specs and their local capture processes were
removed after the final verification. No Task 7 source-text safelist or probe
directives were added.
