/**
 * Shared design↔app region probes (Deliverable 3 + 4).
 *
 * Each probe is a *logical name* keyed pair of locator-builder functions —
 * `design(page)` and `app(page)` each return a Playwright `Locator` for
 * their respective side. Both `capture-design.mjs` and
 * `e2e/parity-capture.spec.ts` import this SAME file so the two sides can
 * never pick different elements for "the same" region.
 *
 * Locators were derived empirically (rendered DOM dumped via Playwright,
 * not guessed from the template source) — two things that are NOT what a
 * first read of the source suggests:
 *
 * 1. Design ids are `#mk-US`/`#mk-KR` (uppercase `marketType`), not the
 *    lowercase `#mk-us`/`#mk-kr` the task brief mentioned.
 * 2. The design framework (`support.js`) wraps every `{{ interpolation }}`
 *    in its own `<span class="sc-interp">`. A naive "first `span` inside
 *    this container" locator picks that text-wrapper span instead of an
 *    intended status chip/badge — every such probe below excludes it via
 *    `span:not(.sc-interp)`.
 *
 * `minWidth`: some regions only exist in the 2-column desktop layout (both
 * sides collapse to a single master/detail pane below 1181px) — the probe
 * is skipped below that width rather than matching the wrong element.
 */

function byId(page, id) {
  return page.locator(`#${id}`);
}

/** First non-framework-wrapper span inside a locator — see file header note 2. */
function firstRealSpan(locator) {
  return locator.locator('span:not(.sc-interp)').first();
}

/**
 * Nearest ancestor `<section>` of a locator, skipping any intervening plain
 * `<div>`. Design and app both wrap the market-latest/archive-detail header
 * card's `<h1>`+lead paragraph in one extra `<div>` before the true card
 * boundary (`<section>`) — confirmed identical on both sides by dumping the
 * actual rendered DOM, not by reading the template/JSX alone (a naive "any
 * nearest section/div/aside" match lands one level too shallow, on that
 * inner div, which contains neither the status chip nor the market meta
 * row — a genuine but non-obvious asymmetry that a source-only read would
 * have missed).
 */
function nearestSection(locator) {
  return locator.locator('xpath=ancestor::section[1]');
}

/** Nearest ancestor container of any common landmark tag — used only where
 * the heading is a DIRECT child of the true card boundary (no intervening
 * wrapper div), verified per-route below. */
function nearestPanel(locator) {
  return locator.locator(
    'xpath=ancestor::*[self::section or self::div or self::aside or self::header][1]'
  );
}

// ---------------------------------------------------------------------------
// market-page: shared by market-latest, market-latest-dark, archive-detail
// (DecisionHeaderCard + MarketSection — identical DOM shape on both routes).
// ---------------------------------------------------------------------------
const marketPageProbes = [
  {
    name: 'page-title',
    design: (page) => byId(page, 'page-title'),
    app: (page) => byId(page, 'page-title'),
  },
  {
    name: 'header-card',
    design: (page) => nearestSection(byId(page, 'page-title')),
    app: (page) => nearestSection(byId(page, 'page-title')),
  },
  {
    name: 'status-badge',
    design: (page) => firstRealSpan(nearestSection(byId(page, 'page-title'))),
    app: (page) => firstRealSpan(nearestSection(byId(page, 'page-title'))),
  },
  {
    name: 'main-landmark',
    design: (page) => byId(page, 'main'),
    app: (page) => byId(page, 'main-content'),
  },
  {
    name: 'mk-us-section',
    design: (page) => byId(page, 'mk-US'),
    app: (page) => byId(page, 'mk-section-0'),
  },
  {
    name: 'mk-kr-section',
    design: (page) => byId(page, 'mk-KR'),
    app: (page) => byId(page, 'mk-section-1'),
  },
  {
    name: 'mk-us-index-table',
    design: (page) => byId(page, 'mk-US').locator('table'),
    app: (page) => byId(page, 'mk-section-0').locator('table'),
  },
];

// ---------------------------------------------------------------------------
// archive-search
// ---------------------------------------------------------------------------
const archiveSearchProbes = [
  {
    name: 'page-title',
    design: (page) => byId(page, 'page-title'),
    app: (page) => byId(page, 'page-title'),
  },
  {
    name: 'filter-heading',
    design: (page) => byId(page, 'filter-h'),
    app: (page) => byId(page, 'archive-filter-heading'),
  },
  {
    name: 'filter-panel',
    // Design's `<section aria-labelledby="filter-h">` IS the styled card
    // (border/padding/background live on the section itself). The app's
    // equivalent `<section aria-labelledby="archive-filter-heading">` is a
    // bare, unstyled wrapper — the real card (border/padding/background) is
    // its single direct child `<div>` (`archive-search-filters.tsx`). A
    // naive same-selector match on both sides caught that unstyled app
    // wrapper instead, reporting a fake "no border/no padding" diff (cycle
    // 2, section 0) even though the app genuinely renders a bordered white
    // card one level deeper.
    design: (page) => page.locator('section[aria-labelledby="filter-h"]'),
    app: (page) =>
      page.locator('section[aria-labelledby="archive-filter-heading"] > div').first(),
  },
  {
    name: 'results-heading',
    design: (page) => byId(page, 'results-h'),
    app: (page) => byId(page, 'archive-results-heading'),
  },
  {
    name: 'results-table',
    // The results table is the only `<table>` on this route on either
    // side (the filter card has no table) — simpler and more robust than
    // climbing from the heading through its header-row `<div>`.
    design: (page) => page.locator('table').first(),
    app: (page) => page.locator('table').first(),
  },
  {
    name: 'result-row-status-badge',
    // The first row's first real (non-`sc-interp`) `<span>` is the
    // `pageIdLabel` span inside the FIRST cell (기준일), not the status
    // badge in the THIRD cell (상태) — `firstRealSpan` over the whole row
    // matched that unstyled text node on both sides (cycle 2, section 0),
    // even though both sides visibly render the same green `● 준비 완료`
    // badge. Scoping to the status cell specifically (3rd `td`/`th`, same
    // column position on both sides) fixes it; the badge's own wrapping
    // `<span>` still comes before its inner dot `<span>` in document order,
    // so `firstRealSpan` on that scoped cell resolves to the badge itself.
    design: (page) =>
      firstRealSpan(
        page.locator('table').first().locator('tbody tr').first().locator('td, th').nth(2)
      ),
    app: (page) =>
      firstRealSpan(
        page.locator('table').first().locator('tbody tr').first().locator('td, th').nth(2)
      ),
  },
];

// ---------------------------------------------------------------------------
// cluster-detail
// ---------------------------------------------------------------------------
const clusterDetailProbes = [
  {
    name: 'page-title',
    design: (page) => byId(page, 'page-title'),
    app: (page) => byId(page, 'page-title'),
  },
  {
    name: 'header-card',
    // Here the `<h1>` IS a direct child of the true card boundary on both
    // sides (design: `<section>`; app: a plain `<div>`) — no extra wrapper
    // layer, unlike market-page above, so the generic (div-inclusive)
    // nearest-ancestor match is already correct.
    design: (page) => nearestPanel(byId(page, 'page-title')),
    app: (page) => nearestPanel(byId(page, 'page-title')),
  },
  {
    name: 'analysis-heading',
    design: (page) => byId(page, 'an-h'),
    app: (page) => byId(page, 'cluster-analysis-heading'),
  },
  {
    name: 'analysis-panel',
    design: (page) => page.locator('section[aria-labelledby="an-h"]'),
    app: (page) => page.locator('section[aria-labelledby="cluster-analysis-heading"]'),
  },
  {
    name: 'articles-heading',
    design: (page) => byId(page, 'ar-h'),
    app: (page) => byId(page, 'cluster-articles-heading'),
  },
  {
    name: 'articles-panel',
    design: (page) => page.locator('section[aria-labelledby="ar-h"]'),
    app: (page) => page.locator('section[aria-labelledby="cluster-articles-heading"]'),
  },
  {
    name: 'representative-heading',
    design: (page) => byId(page, 'rep-h'),
    app: (page) => byId(page, 'cluster-representative-heading'),
  },
  {
    name: 'representative-panel',
    // Design nests `#rep-h` in a `<section>` inside an `<aside>`; the app
    // renders the heading directly inside the `<aside>` with no extra
    // section wrapper — a known structural asymmetry, not a bug on either
    // side, noted in the parity report.
    design: (page) => page.locator('section[aria-labelledby="rep-h"]'),
    app: (page) => page.locator('aside[aria-labelledby="cluster-representative-heading"]'),
  },
];

// ---------------------------------------------------------------------------
// ops-batches
// ---------------------------------------------------------------------------
const opsBatchesProbes = [
  {
    name: 'page-title',
    design: (page) => byId(page, 'page-title'),
    app: (page) => byId(page, 'page-title'),
  },
  {
    name: 'trigger-btn',
    design: (page) => byId(page, 'trigger-btn'),
    app: (page) => byId(page, 'trigger-btn'),
  },
  {
    name: 'summary-tiles',
    // `section[aria-label="배치 요약"]` is the OUTER flex column that also
    // contains the (conditional) attention banner above the tile grid — not
    // the grid itself. The app's `role=group[name="배치 실행 요약"]` already
    // correctly resolves to just the 3-tile grid (`batch-summary-tiles.tsx`
    // renders that aria-label directly on the grid div), so design's
    // locator needs to reach one level deeper: its own inline
    // `display:grid;grid-template-columns:var(--g3)` div, scoped inside the
    // 배치 요약 section so it can't match the unrelated grid on
    // archive-search's filter fields.
    design: (page) =>
      page
        .locator('section[aria-label="배치 요약"] div[style*="grid-template-columns"]')
        .first(),
    app: (page) => page.getByRole('group', { name: '배치 실행 요약' }),
  },
  {
    name: 'list-heading',
    design: (page) => byId(page, 'ops-list-h'),
    app: (page) => page.getByRole('heading', { name: '실행 이력' }),
  },
  {
    name: 'history-table',
    // Only `<table>` on this route on either side (the detail panel uses a
    // `<dl>`, not a table) — robust without climbing from the heading.
    design: (page) => page.locator('table').first(),
    app: (page) => page.locator('table').first(),
  },
  {
    name: 'detail-heading',
    // Only visible in the 2-column desktop layout (>=1181px) — below that,
    // both sides show the master list only, unless `?view=detail` is set,
    // which this matrix's default routes don't set.
    minWidth: 1181,
    design: (page) => byId(page, 'ops-detail-h'),
    app: (page) => page.getByRole('heading', { level: 2, name: /^job\s*\d+/i }),
  },
  {
    name: 'detail-summary',
    // Only `<dl>` on this route on either side.
    minWidth: 1181,
    design: (page) => page.locator('dl').first(),
    app: (page) => page.locator('dl').first(),
  },
];

// ---------------------------------------------------------------------------
// not-found — minimal page, only a couple of comparable regions exist.
// ---------------------------------------------------------------------------
const notFoundProbes = [
  {
    name: 'page-title',
    design: (page) => byId(page, 'page-title'),
    app: (page) => byId(page, 'page-title'),
  },
  {
    name: 'main-landmark',
    design: (page) => byId(page, 'main'),
    app: (page) => byId(page, 'main-content'),
  },
];

export const PROBES = {
  'market-latest': marketPageProbes,
  'market-latest-dark': marketPageProbes,
  'archive-detail': marketPageProbes,
  'archive-search': archiveSearchProbes,
  'cluster-detail': clusterDetailProbes,
  'ops-batches': opsBatchesProbes,
  'not-found': notFoundProbes,
};

/** Probes applicable for a given matrix key at a given viewport width. */
export function probesFor(key, width) {
  const all = PROBES[key] ?? [];
  return all.filter((p) => !p.minWidth || width >= p.minWidth);
}
