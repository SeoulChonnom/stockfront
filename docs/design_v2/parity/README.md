# Design ↔ App parity harness

Reusable screen-by-screen visual + numeric comparison between the design
prototype (`docs/design_v2/handoff_v2/Market Brief v2.dc.html`) and the real
app (this repo's `src/`), at multiple viewports, driven off ONE shared
route/probe matrix so the two sides can never drift apart.

## How to rerun

```sh
pkill -f "vite preview" || true   # stale IPv6-only preview can squat :4173

pnpm run parity:design   # design prototype side (standalone Node + Playwright, serves handoff_v2/ itself)
pnpm run parity:app      # real app side (Playwright spec, builds + previews the app, reuses installMockApi)
pnpm run parity:report   # composites (ImageMagick) + style-diff.md + merged manifest.json

# or all three in order:
pnpm run parity
```

`parity:app` is a normal Playwright spec (`e2e/parity-capture.spec.ts`) run
through its own config, `playwright.parity.config.ts` — it is intentionally
**excluded** from `playwright.config.ts` (`testIgnore`) so the regular
`pnpm e2e` suite never runs or is slowed down by it.

Requires ImageMagick (`magick`) on `PATH` or at `/opt/homebrew/bin/magick`
for `parity:report`.

## What's in this directory

| Path | What it is |
|---|---|
| `design/<key>@<width>.png` | Full-page screenshot, design prototype |
| `app/<key>@<width>.png` | Full-page screenshot, real app |
| `design-regions/`, `app-regions/` | Per-probe element screenshots at 1:1 scale (intermediate — feeds `compare-regions/`) |
| `compare/<key>@<width>.png` | Side-by-side full-page composite (design left / app right, labeled, 1:1 scale, no resizing) |
| `compare-regions/<key>@<width>--<region>.png` | Side-by-side region composite — **read these first**; full-page screenshots downsample tall pages and hide small padding/type differences |
| `styles-design.json`, `styles-app.json` | Raw `getComputedStyle` + layout-token dumps per route/viewport/probe (Deliverable 4 source data) |
| `style-diff.md` | Human-readable diff of the above — top offenders, font-family finding, then per-route/per-probe property tables |
| `manifest-design.json`, `manifest-app.json`, `manifest.json` | Per-capture record: route/hash, mock mode, viewport, theme, role, output paths, `ok`/`blocked` status |

## The matrix

Single source of truth: `scripts/parity/matrix.mjs` (routes/viewports/theme)
and `scripts/parity/probes.mjs` (named element pairs for Deliverables 3/4).
Both `scripts/parity/capture-design.mjs` and `e2e/parity-capture.spec.ts`
import these same two files — there is no second copy anywhere to drift.

7 capture keys × their viewports = 17 shots per side (34 total), each with
5–8 named region probes (110 region pairs total). Every route rendered under
the default `mock=ready` fixture mode on the first try — no substitutions
were needed for this run (see `manifest.json`'s `mockMode`/`note` fields if
a future rerun needs one; the harness records it there rather than silently
swapping fixtures).

## Caveats a reader must know

- **Design ids are uppercase**: the market section ids are `#mk-US`/`#mk-KR`
  (uppercase `marketType`), not the lowercase `#mk-us`/`#mk-kr` a first read
  of the section title might suggest — verified against the rendered DOM,
  not assumed. `probes.mjs` documents this and a second, subtler one: the
  design framework (`support.js`) wraps every `{{ interpolation }}` in its
  own `<span class="sc-interp">`, which silently breaks a naive "first
  `span` in this container" locator (it grabs the text-wrapper span, not an
  intended status chip) unless excluded.
- **Structural asymmetry, not a bug**: `cluster-detail`'s representative
  article card nests `#rep-h` in a `<section>` inside an `<aside>` on the
  design side; the app renders the heading directly inside the `<aside>`
  with no extra section wrapper. Both region probes still capture "the
  representative-article card", just with one fewer DOM layer on the app
  side.
- **A real product difference the harness surfaces, not a measurement
  artifact**: the Ops Batches list on the **app** renders a full date-range +
  status **filter form** (`BatchFilterBar`) above "실행 이력"; the **design**
  prototype has no such form on that screen (only two shortcut buttons —
  "실패만 보기"/"부분 실패만 보기" — and a "필터 해제" button once a status
  filter is already active). See `compare/ops-batches@1280.png`. Don't read
  this as a spacing/token bug — it's a scope difference between the two
  artifacts.
- **US/KR market badges are missing on the app**: `mappers.ts` doesn't carry
  `marketType` into the view model, so the small "US"/"KR" mono chips the
  design shows next to "미국 증시"/"한국 증시" (and the "마지막 갱신" line at
  the bottom of the header card) don't render on the app. Visible in
  `compare/market-latest@1280.png` / `compare-regions/market-latest@1280--header-card.png`.
  This is a data-layer gap already called out in the app's own source
  comments, not something this harness invented.
- **Font-family**: IBM Plex Sans KR is confirmed NOT installed on the
  machine this harness ran on (`fc-list | grep -i plex` finds nothing).
  `document.fonts.check('16px "IBM Plex Sans KR"')` misleadingly reports
  `true` on BOTH sides regardless (a known Chromium looseness in that API,
  not evidence of anything) — the real evidence is an identical Korean+Latin
  sample string measured via `canvas.measureText()` at the same computed
  font-size/weight on `#page-title`: **0.000px delta** on both sides. Both
  stacks fall back to the same system sans-serif, so every `fontSize`
  comparison in `style-diff.md` is valid apples-to-apples.
- **Determinism (full design capture run twice, byte-for-byte)**: 16 of the
  17 full-page screenshots and 106 of 110 region screenshots were
  byte-identical (`shasum -a 256`) across two complete reruns. One route,
  `cluster-detail@390` (plus 3 of its region crops), rendered into one of
  **two** stable pixel outputs across repeated runs, differing by ~1.2% of
  pixels at sub-5%-color-delta magnitude (invisible to the eye — a `-fuzz 5%`
  ImageMagick compare reports 0 differing pixels). This was chased down, not
  hand-waved: `prefers-reduced-motion: reduce` is active and the only
  transition in the whole prototype is a 0.12s→1ms skip-link, ruling out
  animation; `document.documentElement.scrollHeight` was byte-identical
  (`1949`) across every run, ruling out a layout/reflow race; a manual
  viewport-resize-then-screenshot (bypassing Playwright's `fullPage`
  stitching) still reproduced the same two-way split; `--disable-gpu` /
  `--force-color-profile=srgb` did not change it. It looks like GPU/software
  rasterizer anti-aliasing jitter on this route's border-heavy layout at
  390px, not a fixable animation/clock source — flagged honestly rather than
  claimed clean.
- **`ops-batches`/`archive-search` "detail"/"results" panels below 1181px**:
  both sides collapse to a single master/detail pane below that width; the
  `detail-heading`/`detail-summary` probes are skipped below 1181px on
  purpose (`probes.mjs`'s `minWidth`), not silently mismatched.
