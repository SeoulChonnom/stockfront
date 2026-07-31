# Parity findings — cycle 5 (from the visual-audit gap harness)

Source: the `pixel-perfect-react-ui` visual-audit harness (`.visual-audit/`), which measures
**actual rendered distance between mapped elements** — something the per-element
computed-style harness in `scripts/parity/` structurally cannot see. That is why these
survived four clean cycles.

## Settled first: the font question is closed, do not act on it

The audit report suggests adding a `font-family` ignore because
`document.fonts.check('16px "IBM Plex Sans KR"')` returns `true` on the reference.

**That is a false positive and the recommendation is withdrawn.** Chromium returns `true`
once *any* fallback in the stack can render the text. Verified directly:

- No `@font-face`, no `<link>`, no `fonts.googleapis`/`gstatic`, no `FontFace` constructor
  anywhere in `Market Brief v2.dc.html` or `support.js`.
- IBM Plex is not installed (`fc-list` → 0 matches; nothing in `~/Library/Fonts`,
  `/Library/Fonts`, `/System/Library/Fonts`).

There is no font resource for the reference to load, so it renders the same system fallback
the app does. The earlier canvas `measureText` result (0.000px delta on identical text at
identical size) stands. The residual 2–12% per-target pixel ratios are glyph antialiasing,
not a typeface difference. **Do not add a font-family ignore.**

## I — instrumentation, fix before trusting geometry

- **I1 — the prototype's `URL /stock/...` strip is masked but still occupies layout.**
  It takes ~39px of vertical space in the reference only, so every target's absolute `y` is
  offset by that amount and the full-page pixel ratios (7.7–26%) are dominated by ghosting,
  not by real differences. Masking hides it from the image; it does not remove it from flow.
  Inject `display:none` (not `visibility`/opacity) on that element on the reference side
  before capture, so `y` and full-page pixel ratios become usable signal.
  **Do not paper over this with ~60 per-target `y` ignore rules** — the previous agent was
  right to refuse that.

## U — real UI bugs the gap measurements found

- **U1 — page content wrapper uses a fixed Tailwind `gap` instead of the responsive
  `--gap` token.** This is the headline finding. Four of five pages
  (`market-overview-page.tsx`, `archive-search-page.tsx`, `cluster-detail-page.tsx`,
  `batch-operations-page.tsx`) wrap content in a flat `gap-5` (20px), or `gap-4 sm:gap-5`,
  where the design uses `--gap`, which correctly steps 20px → 12px below 640px. The app's
  own `--gap` token already resolves to 12px at mobile — it just isn't being used here.
  Result: every section-to-section distance on mobile is 20–21px against the design's 12px.
  Use the existing token rather than hand-tuned per-breakpoint utilities.

- **U2 — archive-search title→description is 8px, design is 6px, at every viewport.**
  The design's title `<section>` uses `display:flex; gap:6px`; the app uses an `mt-2` margin.

- **U3 — 핵심 이슈 article cards.** `row-gap`/`column-gap` 10px/18px in the design vs
  16px/16px in the app; horizontal padding 18px vs the app's 16px (`px-4`).

- **U4 — batch summary tiles.** `padding-top`/`padding-bottom` 14px in the design vs 16px in
  the app.

- **U5 — ops `수동 실행` button carries a drop shadow the design doesn't have**
  (`box-shadow: rgba(...) 0 16px 30px …`). The design's buttons use border + fill only;
  shadow is reserved for sticky/overlay surfaces per README §6.

- **U6 — index table row `border-bottom-width` is 1px in the app, 0 in the design.**
  **Verify visually before changing anything.** The design's own screenshots appear to show
  row separators in 대표 지수, so a computed width of 0 may mean the separator is drawn some
  other way (a child element, a background gradient, `box-shadow`). Removing real row
  separators from a dense financial table would be a legibility regression. If the design
  genuinely has no separator, match it; if it draws one differently, match the appearance,
  not the property.

## Not bugs — confirmed, leave alone

- The 4 `border-*-color` diffs accompanying U6 are a `getComputedStyle` artifact: a
  zero-width border still resolves a colour (`currentColor`). One finding, not five.
- Summary tile left accent: design uses `border-left: 3px`, the app an inset `box-shadow`
  plus a uniform 1px border. Different technique, same rendered pixels.
- `detail-heading` / `detail-summary` missing on the reference at tablet/mobile: the design
  removes the ops detail panel from the DOM below 1181px (`sc-if`); the app keeps it and
  hides it with CSS. Same responsive behaviour, different strategy.

---

# Known remaining differences (closing record)

Written at the end of the parity effort (8 cycles). Everything below was measured, has a
stated cause, and was left deliberately. If you are picking this up cold, start here.

## Left because matching would regress something we care about more

- **Interactive control heights.** The design uses 36 / 38 / 40 / 44px for controls at the
  same semantic level — it is internally inconsistent. The app standardises on ≥44px per the
  44×44 touch-target floor in README §15 / `11-design-system-interaction-spec.md` §9.
  Cost: ~4px on `ops-batches` `title-to-first-block`, and 4–8px on cluster-detail's
  `action-row` / `header-card`. Declined in cycles 6, 7 and 8. Do not "fix" this by shrinking
  buttons.

- **Ops pipeline stages.** The prototype's fixture fabricates per-stage completion and
  timings the backend does not provide (the block is tagged `PROPOSED · BACKEND`). The app
  shows a capability boundary instead. Recorded in `v2-decisions.md` §10.

## Left unexplained — genuinely open

- **`ops-batches` `history-table` is ~25px taller than the design** (~1.25px per row over
  20 rows), at every viewport. **Two separate root-cause attempts were wrong**, both times by
  citing `getComputedStyle(tr).borderBottomWidth` as `0` on the reference. That reading is an
  artifact: the design declares `border-bottom: 1px solid var(--line)` inline on every
  `<th scope="row">` and every `<td>`, so both sides do draw a 1px separator per row. The
  design's cells are `padding: 10px 18px` (row header and counts) / `10px 12px` (status,
  duration) with `vertical-align: top`.
  A per-row height decomposition in the browser — cell padding, line-height, subline
  metrics, badge height — is the way to settle it. ~1.25px per row suggests line-height or
  badge-height rounding rather than a structural difference. **Do not remove row separators
  to close this.**

## Artifacts — not differences, do not chase

- **`font-family` differs on every probe.** Both sides render the same system fallback.
  There is no `@font-face`, `<link>`, `fonts.googleapis`/`gstatic`, or `FontFace` call
  anywhere in `Market Brief v2.dc.html` or `support.js`, and IBM Plex is not installed
  (`fc-list` → 0; nothing in `~/Library/Fonts`, `/Library/Fonts`, `/System/Library/Fonts`).
  `document.fonts.check()` returning `true` is a **known false positive** — Chromium returns
  true once any fallback can render the text. The canvas `measureText` delta on identical
  text at identical size is 0.000px. This has been mistaken for a real finding twice.

- **`border-*-color` diffs on zero-width or cell-level borders.** `getComputedStyle` still
  resolves a colour (`currentColor`) for a border that is never painted, and reports `0` on a
  `<tr>` whose border is declared on its cells. This pattern has produced **four** false
  findings in this project. Confirm where a border is actually declared in the prototype
  source before citing it as a cause.

- **`display: block` vs `flex` + `gap` on `filter-panel`, `articles-panel`,
  `representative-panel`.** The design uses block layout with child margins, the app uses
  flex with `gap`. Identical rendered result — means, not ends.

- **Summary tile left accent**: design `border-left: 3px`, app inset `box-shadow` + uniform
  1px border. Same rendered pixels.

- **`detail-heading` / `detail-summary` absent on the reference below 1181px**: the design
  removes the ops detail panel from the DOM (`sc-if`); the app keeps it and hides it with
  CSS. Same responsive behaviour, different strategy.

## Open decision for the product owner

- **Pagination current-page indicator.** The app no longer fills the current page, matching
  the prototype's *rendered* output. But the prototype carries a
  `[data-nav][data-active="true"]{background:var(--accent-soft);…}` rule (line 71) that never
  paints, because every pagination button also has an inline `style` attribute and inline
  beats a stylesheet selector. So the app currently matches a **prototype bug**, and the
  current page has no visual indicator at all — only `aria-current`. Recommendation: restore
  the highlight. Awaiting a decision.
