import { defineConfig, devices } from '@playwright/test';

/**
 * Phase 8/9 Playwright harness.
 *
 * `webServer` builds the app with `VITE_API_HOST` pointed at the SAME origin
 * the preview server serves from (`http://127.0.0.1:${PORT}`). That's
 * deliberate, not arbitrary: every test installs a network-routing mock via
 * `e2e/fixtures/mock-api.ts#installMockApi`, which intercepts requests before
 * they leave the browser — same-origin means the app's `fetch()` calls never
 * trip a CORS preflight against a response Playwright fabricated, and no real
 * backend needs to exist anywhere. `VITE_APP_ENV=development` enables the
 * app's dev auth bypass (`src/lib/auth-config.ts`) so the suite never depends
 * on a real login flow either.
 */
const PORT = 4173;
const HOST = `http://127.0.0.1:${PORT}`;
const BASE_URL = `${HOST}/stock/`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Local retries: this suite runs on a shared dev machine (other apps
  // competing for CPU), not a dedicated runner, and one run surfaced a
  // single-test 30s timeout under that contention with nothing wrong in the
  // app or the mock (a re-run passed in ~300ms). One retry absorbs that kind
  // of transient noise without hiding a real, reproducible failure — a bug
  // that's actually in the app fails the same way on retry too.
  // retries: 0 locally on purpose. A retry hides exactly the failures this
  // suite is most likely to grow — focus and live-region timing races — and
  // the full suite has been observed green at 169/169 with retries off, so
  // there is no flakiness to absorb. CI keeps 1 for infra noise only.
  retries: process.env.CI ? 1 : 0,
  // Capped rather than left to Playwright's default (which scales with CPU
  // core count): 4 parallel Chromium instances plus whatever else is
  // running on a shared dev machine is exactly what produced the 30s stall
  // above. 2 keeps the suite fast while leaving headroom.
  workers: 2,
  reporter: 'list',
  timeout: 45_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // `--host 127.0.0.1` is required, not cosmetic: without it, Vite's
    // preview server binds to `localhost`, which on this host resolves to
    // the IPv6 loopback (`::1`). Playwright's webServer readiness probe hits
    // the literal `127.0.0.1` from `BASE_URL` (IPv4) — against an IPv6-only
    // listener that connection never completes, so the probe times out after
    // 180s even though the server logs "ready" successfully. Binding both
    // sides to the same explicit `127.0.0.1` fixed it (confirmed by
    // re-running the suite after this change).
    // Invoke vite directly rather than via the `preview` package script:
    // `pnpm preview -- --host …` forwards a literal `--` into vite's argv,
    // which makes vite ignore every flag after it. The symptom is subtle —
    // vite silently binds its default `localhost` (IPv6 `::1` on macOS) and
    // ignores `--strictPort`, while Playwright's readiness probe hits the
    // IPv4 `127.0.0.1` in BASE_URL, so the probe times out after 180s even
    // though the server logged "ready" on the port you asked for.
    command: `pnpm build && pnpm exec vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      VITE_API_HOST: HOST,
      VITE_APP_ENV: 'development',
    },
  },
});
