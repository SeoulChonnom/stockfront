/**
 * Shared design↔app parity capture matrix.
 *
 * Both `capture-design.mjs` (design prototype side) and
 * `e2e/parity-capture.spec.ts` (real app side, via Playwright) import this
 * SAME array so the two sides can never drift apart on which routes/
 * viewports/theme are captured. Do not duplicate this list anywhere else.
 *
 * - `designHash`: the hash-routed path in `Market Brief v2.dc.html`
 *   (`#${designHash}` once you also append `?mock=...` when a non-default
 *   fixture mode is required — see `mockMode`).
 * - `appRoute`: the app's pathname under its `/stock/` base path
 *   (Playwright's `baseURL` already includes `/stock/`, so specs should
 *   `page.goto(appRoute)` with a *relative* path, no leading slash needed
 *   beyond what `appRoute` already has — see the spec for the exact call).
 * - `viewports`: widths in CSS px; every viewport in this matrix uses the
 *   SAME height, `VIEWPORT_HEIGHT`.
 * - `mockMode`: the fixture/scenario mode for BOTH sides under normal
 *   circumstances (`ready` by default). If a route cannot render real
 *   content under `ready` on one side, the capture script for that side
 *   substitutes a working mode itself and records the substitution in the
 *   manifest with `status: 'ok'` and a `note` explaining what changed
 *   (never silently swapped) — or `status: 'blocked'` if nothing renders
 *   comparable content.
 * - `theme`: defaults to `'light'`; only the `-dark` entry overrides it.
 */

export const VIEWPORT_HEIGHT = 900;

/** @typedef {{ key: string, designHash: string, appRoute: string, viewports: number[], mockMode: string, theme: 'light'|'dark' }} MatrixEntry */

/** @type {MatrixEntry[]} */
export const MATRIX = [
  {
    key: 'market-latest',
    designHash: '/market/latest',
    appRoute: '/market/latest',
    viewports: [390, 768, 1280, 1440],
    mockMode: 'ready',
    theme: 'light',
  },
  {
    key: 'archive-search',
    designHash: '/market/archive/search',
    appRoute: '/market/archive/search',
    viewports: [390, 768, 1280],
    mockMode: 'ready',
    theme: 'light',
  },
  {
    key: 'archive-detail',
    designHash: '/market/archive/2026-07-21',
    appRoute: '/market/archive/2026-07-21',
    viewports: [390, 1280],
    mockMode: 'ready',
    theme: 'light',
  },
  {
    key: 'cluster-detail',
    designHash: '/market/cluster/51f0d9a0-9fc5-4f15-a4f9-62856f128683',
    appRoute: '/market/cluster/51f0d9a0-9fc5-4f15-a4f9-62856f128683',
    viewports: [390, 768, 1280],
    mockMode: 'ready',
    theme: 'light',
  },
  {
    key: 'ops-batches',
    designHash: '/ops/batches',
    appRoute: '/ops/batches',
    viewports: [390, 768, 1280],
    mockMode: 'ready',
    theme: 'light',
  },
  {
    key: 'not-found',
    designHash: '/no-such-route',
    appRoute: '/no-such-route',
    viewports: [1280],
    mockMode: 'ready',
    theme: 'light',
  },
  {
    key: 'market-latest-dark',
    designHash: '/market/latest',
    appRoute: '/market/latest',
    viewports: [1280],
    mockMode: 'ready',
    theme: 'dark',
  },
];

/** Fixed instant both fixture sets pin `NOW_KST`/`TODAY` to (KST, UTC+9). */
export const FIXED_NOW_KST = '2026-07-27T08:24:31+09:00';

/** The cluster id seeded identically in `fixtures.js` and `mock-api.ts`. */
export const CLUSTER_ID = '51f0d9a0-9fc5-4f15-a4f9-62856f128683';
