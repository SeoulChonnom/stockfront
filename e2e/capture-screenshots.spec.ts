import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/console-guard';
import {
  type InstallMockApiOptions,
  installMockApi,
} from './fixtures/mock-api';

/**
 * Phase 9 Part B — v2 screenshot evidence (handoff README §16).
 *
 * Writes PNGs to `docs/design_v2/v2-screenshots/` (NEVER
 * `docs/design_v2/screenshots/` — that is existing v1 evidence) plus a
 * `manifest.json` recording route/viewport/theme/role/fixture per file.
 *
 * Determinism:
 * - `installMockApi`'s fixtures already pin `NOW_KST`/`TODAY`
 *   (2026-07-27T08:24:31 KST) — see `e2e/fixtures/mock-api.ts`.
 * - `page.clock.setFixedTime(...)` freezes the BROWSER's own `Date.now()` to
 *   the same instant before each capture, so `formatRelativeFreshness`'s
 *   "N시간 전 생성" text (which defaults to real wall-clock time otherwise)
 *   is reproducible across runs/days instead of drifting.
 * - Captures wait for real content markers (a heading, `aria-busy`, a
 *   dialog role) rather than fixed `sleep`s.
 * - Every test in this spec emulates `prefers-reduced-motion: reduce`
 *   (`base.css` already turns all animation/transition durations to
 *   0.01ms under that media query — README §6/§11). Without it, states
 *   with an in-flight spinner or skeleton shimmer (#11 loading, #15
 *   trigger-pending) get caught at a different animation frame on every
 *   run, producing byte-different PNGs from a rerun with zero code
 *   changes. This makes the shots deterministic regression evidence
 *   instead of animation noise.
 */

const OUTPUT_DIR = path.join(process.cwd(), 'docs/design_v2/v2-screenshots');
const NOW_KST_WITH_OFFSET = '2026-07-27T08:24:31+09:00';

type Theme = 'light' | 'dark';
type Role = 'user' | 'admin';

type ManifestEntry = {
  file: string;
  route: string;
  viewport: string;
  theme: Theme;
  role: Role;
  fixture: string;
};

const manifest: ManifestEntry[] = [];

mkdirSync(OUTPUT_DIR, { recursive: true });

async function freezeClock(page: Page) {
  await page.clock.setFixedTime(new Date(NOW_KST_WITH_OFFSET));
}

async function setTheme(page: Page, theme: Theme) {
  await page.addInitScript((t) => {
    window.localStorage.setItem('stockfront.theme', t);
  }, theme);
}

type CaptureOptions = {
  file: string;
  route: string;
  viewport: { width: number; height: number };
  viewportLabel: string;
  theme?: Theme;
  role?: Role;
  mock: InstallMockApiOptions;
  fixtureLabel: string;
  /** Runs after `goto` and before the screenshot — waits for the right content marker. */
  waitFor: (page: Page) => Promise<unknown>;
};

async function capture(page: Page, options: CaptureOptions): Promise<void> {
  const theme = options.theme ?? 'light';
  const role = options.role ?? 'admin';

  await freezeClock(page);
  await setTheme(page, theme);
  await installMockApi(page, { ...options.mock, role });
  await page.setViewportSize(options.viewport);
  await page.goto(options.route);
  await options.waitFor(page);

  const filePath = path.join(OUTPUT_DIR, options.file);
  await page.screenshot({
    animations: 'disabled',
    path: filePath,
    fullPage: true,
  });

  manifest.push({
    file: options.file,
    route: `/${options.route}`,
    viewport: options.viewportLabel,
    theme,
    role,
    fixture: options.fixtureLabel,
  });
}

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const CLUSTER_ID = '51f0d9a0-9fc5-4f15-a4f9-62856f128683';

async function waitForHeading(page: Page, text: string | RegExp) {
  await expect(page.locator('#page-title')).toHaveText(text, {
    timeout: 10_000,
  });
}

test.describe
  .serial('Phase 9 Part B — v2 screenshot evidence', () => {
    test.beforeEach(async ({ page }) => {
      // Freeze animation/transition state before any navigation so every
      // capture in this spec — not just the two visibly-animated ones —
      // is immune to spinner/shimmer phase drift between runs.
      await page.emulateMedia({ reducedMotion: 'reduce' });
    });

    test('01 latest / ready / desktop / light', async ({ page }) => {
      await capture(page, {
        file: '01-latest-ready-desktop-light.png',
        route: 'market/latest',
        viewport: DESKTOP,
        viewportLabel: '1440',
        mock: { scenario: 'ready' },
        fixtureLabel: 'pageFixture(ready)',
        waitFor: (p) => waitForHeading(p, '최신 시장 브리프'),
      });
    });

    test('02 latest / ready / mobile / light', async ({ page }) => {
      await capture(page, {
        file: '02-latest-ready-mobile-light.png',
        route: 'market/latest',
        viewport: MOBILE,
        viewportLabel: '390',
        mock: { scenario: 'ready' },
        fixtureLabel: 'pageFixture(ready)',
        waitFor: (p) => waitForHeading(p, '최신 시장 브리프'),
      });
    });

    test('03 archive search / ready / desktop / light', async ({ page }) => {
      await capture(page, {
        file: '03-archive-search-ready-desktop-light.png',
        route: 'market/archive/search',
        viewport: DESKTOP,
        viewportLabel: '1440',
        mock: { scenario: 'ready', archiveSearchMode: 'results' },
        fixtureLabel: 'archiveFixture(ready, page=1)',
        waitFor: (p) => p.locator('table tbody tr').first().waitFor(),
      });
    });

    test('04 archive search / ready / mobile / light', async ({ page }) => {
      await capture(page, {
        file: '04-archive-search-ready-mobile-light.png',
        route: 'market/archive/search',
        viewport: MOBILE,
        viewportLabel: '390',
        mock: { scenario: 'ready', archiveSearchMode: 'results' },
        fixtureLabel: 'archiveFixture(ready, page=1)',
        waitFor: (p) => p.locator('table tbody tr').first().waitFor(),
      });
    });

    test('05 archive detail / ready / desktop / light', async ({ page }) => {
      await capture(page, {
        file: '05-archive-detail-ready-desktop-light.png',
        route: 'market/archive/2026-07-06',
        viewport: DESKTOP,
        viewportLabel: '1440',
        mock: { scenario: 'ready' },
        fixtureLabel: 'pageFixture(ready, 2026-07-06)',
        waitFor: (p) => waitForHeading(p, /2026-07-06 시장 브리프/),
      });
    });

    test('06 archive detail / ready / mobile / light', async ({ page }) => {
      await capture(page, {
        file: '06-archive-detail-ready-mobile-light.png',
        route: 'market/archive/2026-07-06',
        viewport: MOBILE,
        viewportLabel: '390',
        mock: { scenario: 'ready' },
        fixtureLabel: 'pageFixture(ready, 2026-07-06)',
        waitFor: (p) => waitForHeading(p, /2026-07-06 시장 브리프/),
      });
    });

    test('07 cluster detail / ready / desktop / light', async ({ page }) => {
      await capture(page, {
        file: '07-cluster-detail-ready-desktop-light.png',
        route: `market/cluster/${CLUSTER_ID}?origin=latest`,
        viewport: DESKTOP,
        viewportLabel: '1440',
        mock: { scenario: 'ready' },
        fixtureLabel: 'clusterFixture(ready)',
        waitFor: (p) => waitForHeading(p, /.+/),
      });
    });

    test('08 cluster detail / ready / mobile / light', async ({ page }) => {
      await capture(page, {
        file: '08-cluster-detail-ready-mobile-light.png',
        route: `market/cluster/${CLUSTER_ID}?origin=latest`,
        viewport: MOBILE,
        viewportLabel: '390',
        mock: { scenario: 'ready' },
        fixtureLabel: 'clusterFixture(ready)',
        waitFor: (p) => waitForHeading(p, /.+/),
      });
    });

    test('09 batch ops / ready / desktop / light / admin', async ({ page }) => {
      await capture(page, {
        file: '09-batch-ops-ready-desktop-light-admin.png',
        route: 'ops/batches',
        viewport: DESKTOP,
        viewportLabel: '1440',
        role: 'admin',
        mock: { scenario: 'ready' },
        fixtureLabel: 'batchListFixture(ready) + batchDetailFixture',
        waitFor: (p) => waitForHeading(p, '배치 운영'),
      });
    });

    test('10 batch ops / ready / mobile / light / admin', async ({ page }) => {
      await capture(page, {
        file: '10-batch-ops-ready-mobile-light-admin.png',
        route: 'ops/batches',
        viewport: MOBILE,
        viewportLabel: '390',
        role: 'admin',
        mock: { scenario: 'ready' },
        fixtureLabel: 'batchListFixture(ready) + batchDetailFixture',
        waitFor: (p) => waitForHeading(p, '배치 운영'),
      });
    });

    test('11 latest / loading skeleton / desktop', async ({ page }) => {
      await capture(page, {
        file: '11-latest-loading-desktop.png',
        route: 'market/latest',
        viewport: DESKTOP,
        viewportLabel: '1440',
        mock: { scenario: 'loading' },
        fixtureLabel: 'scenario=loading (never resolves)',
        waitFor: (p) =>
          p.waitForSelector('[aria-busy="true"]', { state: 'attached' }),
      });
    });

    test('12 latest / error 5xx / desktop', async ({ page, consoleGuard }) => {
      consoleGuard.allowConsoleError(/Failed to load resource.*500/);
      await capture(page, {
        file: '12-latest-error5xx-desktop.png',
        route: 'market/latest',
        viewport: DESKTOP,
        viewportLabel: '1440',
        mock: { scenario: 'error5xx' },
        fixtureLabel: 'scenario=error5xx',
        waitFor: (p) =>
          expect(p.getByText('데이터를 불러오지 못했습니다')).toBeVisible(),
      });
    });

    test('13 latest / PARTIAL / desktop', async ({ page }) => {
      await capture(page, {
        file: '13-latest-partial-desktop.png',
        route: 'market/latest',
        viewport: DESKTOP,
        viewportLabel: '1440',
        mock: { scenario: 'partial' },
        fixtureLabel: 'pageFixture(partial)',
        waitFor: (p) =>
          expect(
            p.getByText('이 브리프는 일부 데이터가 누락된 상태로 생성됐습니다')
          ).toBeVisible(),
      });
    });

    test('14 batch ops / permission 403 / desktop / user', async ({ page }) => {
      await capture(page, {
        file: '14-batch-ops-permission403-desktop-user.png',
        route: 'ops/batches',
        viewport: DESKTOP,
        viewportLabel: '1440',
        role: 'user',
        mock: { scenario: 'ready' },
        fixtureLabel: 'PermissionState (role=user)',
        waitFor: (p) => expect(p.getByText('403 · FORBIDDEN')).toBeVisible(),
      });
    });

    test('15 trigger / pending / desktop', async ({ page }) => {
      await freezeClock(page);
      await setTheme(page, 'light');
      await installMockApi(page, {
        scenario: 'ready',
        role: 'admin',
        triggerMode: 'success',
      });
      await page.setViewportSize(DESKTOP);
      await page.goto('ops/batches');
      await page.getByRole('button', { name: '수동 실행' }).click();
      await page.getByRole('button', { name: '실행', exact: true }).click();
      await expect(page.getByText('실행 요청을 보내고 있습니다')).toBeVisible();

      await page.screenshot({
        animations: 'disabled',
        path: path.join(OUTPUT_DIR, '15-trigger-pending-desktop.png'),
        fullPage: true,
      });
      manifest.push({
        file: '15-trigger-pending-desktop.png',
        route: '/ops/batches',
        viewport: '1440',
        theme: 'light',
        role: 'admin',
        fixture: 'triggerMode=success (captured mid-flight, 300ms mock delay)',
      });
    });

    test('16 trigger / success / desktop', async ({ page }) => {
      await capture(page, {
        file: '16-trigger-success-desktop.png',
        route: 'ops/batches',
        viewport: DESKTOP,
        viewportLabel: '1440',
        mock: { scenario: 'ready', triggerMode: 'success' },
        fixtureLabel: 'triggerResult(success) -> jobId 1043',
        waitFor: async (p) => {
          await p.getByRole('button', { name: '수동 실행' }).click();
          await p.getByRole('button', { name: '실행', exact: true }).click();
          await expect(p.getByText('job 1043').first()).toBeVisible({
            timeout: 10_000,
          });
        },
      });
    });

    test('17 trigger / 409 conflict / desktop', async ({
      page,
      consoleGuard,
    }) => {
      consoleGuard.allowConsoleError(/Failed to load resource.*409/);
      await capture(page, {
        file: '17-trigger-409-desktop.png',
        route: 'ops/batches',
        viewport: DESKTOP,
        viewportLabel: '1440',
        mock: { scenario: 'ready', triggerMode: 'conflict409' },
        fixtureLabel: 'triggerResult(conflict409) -> existingJobId 1042',
        waitFor: async (p) => {
          await p.getByRole('button', { name: '수동 실행' }).click();
          await p.getByRole('button', { name: '실행', exact: true }).click();
          await expect(p.getByRole('alert')).toBeVisible({ timeout: 10_000 });
        },
      });
    });

    test('18 latest / ready / desktop / dark (light+dark representative pair)', async ({
      page,
    }) => {
      await capture(page, {
        file: '18-latest-ready-desktop-dark.png',
        route: 'market/latest',
        viewport: DESKTOP,
        viewportLabel: '1440',
        theme: 'dark',
        mock: { scenario: 'ready' },
        fixtureLabel:
          'pageFixture(ready) — same route/fixture as #01, dark theme',
        waitFor: (p) => waitForHeading(p, '최신 시장 브리프'),
      });
    });

    test.afterAll(() => {
      const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
      writeFileSync(
        manifestPath,
        `${JSON.stringify(
          {
            generatedBy: 'e2e/capture-screenshots.spec.ts',
            note: 'Phase 9 Part B v2 screenshot evidence. Never overwrites docs/design_v2/screenshots/ (v1 evidence).',
            count: manifest.length,
            screenshots: manifest,
          },
          null,
          2
        )}\n`
      );
    });
  });
