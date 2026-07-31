import { defineConfig } from '@playwright/test';

import baseConfig from './playwright.config';

/**
 * Runner for `e2e/parity-capture.spec.ts` only (Deliverables 1/3/4, app
 * side of the design↔app parity harness — see
 * `docs/design_v2/parity/README.md`).
 *
 * `playwright.config.ts` (the normal `pnpm e2e` entry point) explicitly
 * `testIgnore`s this spec so the slower, purpose-built evidence generator
 * never runs as part of (or slows down) the regression suite. This config
 * reuses everything else from it (the same mocked-network `webServer`,
 * `baseURL`, project/browser) via a single override so the two configs can
 * never drift on how the app itself is served.
 *
 * Serial/single-worker on purpose: the spec accumulates into module-level
 * `manifest`/`stylesOut` arrays and writes them once in `afterAll` — the
 * same pattern `capture-screenshots.spec.ts` uses — which only works if
 * every test in the file runs in the same worker.
 */
export default defineConfig({
  ...baseConfig,
  testIgnore: undefined,
  testMatch: ['**/parity-capture.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
});
