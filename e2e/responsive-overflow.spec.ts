import { test } from '@playwright/test';

import {
  type InstallMockApiOptions,
  installMockApi,
} from './fixtures/mock-api';
import { expectNoDocumentOverflow } from './utils/overflow';
import { VIEWPORTS } from './utils/viewports';

/**
 * Phase 8 — responsive overflow sweep (handoff README §11 / §16-13).
 *
 * For every viewport in `VIEWPORTS` × every route/state below, asserts
 * `document.documentElement.scrollWidth <= clientWidth`. Scoped scroll
 * inside a table wrapper (`TableScrollWrapper`, `overflow-x: auto`) is
 * allowed — `expectNoDocumentOverflow` (`e2e/utils/overflow.ts`) excludes
 * descendants of such a wrapper from being flagged, since only DOCUMENT-level
 * horizontal scroll is forbidden.
 *
 * Paths are relative (no leading `/`) so Playwright resolves them against
 * `baseURL` (`http://127.0.0.1:4173/stock/`) as `/stock/<path>` — a
 * leading-slash path would resolve root-relative and silently drop the
 * `/stock/` base.
 *
 * Route/state coverage follows the task brief's required matrix (latest:
 * ready/partial/emptyMarkets/long; archive detail: ready; archive search:
 * results + 0 results; cluster: ready/long+heavy; batch: ready + a selected
 * job with the 4,000-char log; 404) plus every remaining §8 equivalence
 * class the mock API is required to support (failed/sparse/error5xx/loading)
 * so all 8 scenario keys are exercised at least once, not just present in
 * `mock-api.ts` unused.
 */

const CLUSTER_ID = '51f0d9a0-9fc5-4f15-a4f9-62856f128683';
// `jobStatusFor(5)` in mock-api.ts's BATCH_ALL seed is 'FAILED' -> jobId 1042-5.
// batchDetailFixture only returns the FULL 4,000-char LONG_LOG for a FAILED
// job when `batchDetailMode: 'longLog'` — see mock-api.ts.
const FAILED_JOB_ID = 1037;

type RouteState = {
  name: string;
  path: string;
  mockOptions: InstallMockApiOptions;
  /** 'loading' scenarios never resolve their fetch — wait for the skeleton's `aria-busy` marker instead of network idle. */
  loading?: boolean;
};

const ROUTE_STATES: readonly RouteState[] = [
  // /market/latest
  {
    name: 'latest / ready',
    path: 'market/latest',
    mockOptions: { scenario: 'ready' },
  },
  {
    name: 'latest / partial',
    path: 'market/latest',
    mockOptions: { scenario: 'partial' },
  },
  {
    name: 'latest / failed',
    path: 'market/latest',
    mockOptions: { scenario: 'failed' },
  },
  {
    name: 'latest / emptyMarkets',
    path: 'market/latest',
    mockOptions: { scenario: 'emptyMarkets' },
  },
  {
    name: 'latest / sparse',
    path: 'market/latest',
    mockOptions: { scenario: 'sparse' },
  },
  {
    name: 'latest / long (200-char unbroken token + long URLs)',
    path: 'market/latest',
    mockOptions: { scenario: 'long' },
  },
  {
    name: 'latest / error5xx',
    path: 'market/latest',
    mockOptions: { scenario: 'error5xx' },
  },
  {
    name: 'latest / loading skeleton',
    path: 'market/latest',
    mockOptions: { scenario: 'loading' },
    loading: true,
  },

  // /market/archive/:businessDate
  {
    name: 'archive detail 2026-07-06 / ready',
    path: 'market/archive/2026-07-06',
    mockOptions: { scenario: 'ready' },
  },

  // /market/archive/search
  {
    name: 'archive search / results',
    path: 'market/archive/search',
    mockOptions: { scenario: 'ready', archiveSearchMode: 'results' },
  },
  {
    name: 'archive search / 0 results',
    path: 'market/archive/search',
    mockOptions: { scenario: 'ready', archiveSearchMode: 'noResults' },
  },

  // /market/cluster/:uuid
  {
    name: 'cluster / ready',
    path: `market/cluster/${CLUSTER_ID}`,
    mockOptions: { scenario: 'ready' },
  },
  {
    name: 'cluster / long (unbroken 200-char token + long URL)',
    path: `market/cluster/${CLUSTER_ID}`,
    mockOptions: { scenario: 'ready', clusterMode: 'long' },
  },
  {
    name: 'cluster / heavy (50 articles, 20 tags)',
    path: `market/cluster/${CLUSTER_ID}`,
    mockOptions: { scenario: 'ready', clusterMode: 'heavy' },
  },

  // /ops/batches (Operator — VITE_APP_ENV=development defaults the role to operator)
  {
    name: 'batch ops / ready',
    path: 'ops/batches',
    mockOptions: { scenario: 'ready' },
  },
  {
    name: `batch ops / selected job ${FAILED_JOB_ID} + 4,000-char log`,
    path: `ops/batches?jobId=${FAILED_JOB_ID}&view=detail`,
    mockOptions: { scenario: 'long', batchDetailMode: 'longLog' },
  },

  // 404
  {
    name: '404 / unknown route',
    path: 'this/route/does/not/exist',
    mockOptions: { scenario: 'ready' },
  },
];

test.describe('responsive overflow sweep (handoff README §11 / §16-13)', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.width}px`, () => {
      for (const state of ROUTE_STATES) {
        test(state.name, async ({ page }) => {
          await page.setViewportSize({
            width: viewport.width,
            height: viewport.height,
          });
          await installMockApi(page, state.mockOptions);

          await page.goto(state.path);

          if (state.loading) {
            await page.waitForSelector('[aria-busy="true"]', {
              state: 'attached',
            });
          } else {
            await page.waitForLoadState('networkidle');
          }

          await expectNoDocumentOverflow(
            page,
            `${viewport.width}px · ${state.name}`
          );
        });
      }
    });
  }
});
