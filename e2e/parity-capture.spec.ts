import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { Locator, Page } from '@playwright/test';
import { FIXED_NOW_KST, MATRIX } from '../scripts/parity/matrix.mjs';
import { probesFor } from '../scripts/parity/probes.mjs';
import {
  APP_TOKENS,
  STYLE_PROPERTIES,
} from '../scripts/parity/style-props.mjs';
import { expect, test } from './fixtures/console-guard';
import { installMockApi } from './fixtures/mock-api';

/**
 * App-side capture for the design↔app parity harness (see
 * `docs/design_v2/parity/README.md`). Reuses `installMockApi` so both
 * sides render the SAME fixture data — the only two knobs this suite
 * varies are viewport and theme, per `scripts/parity/matrix.mjs`.
 *
 * Deliberately NOT part of the normal `pnpm e2e` run (see
 * `playwright.parity.config.ts` / `package.json`'s `parity:app` script) —
 * it's a slower, purpose-built evidence generator, not a regression gate.
 *
 * Determinism: same discipline as `capture-screenshots.spec.ts` — fixed
 * clock, `prefers-reduced-motion: reduce`, `animations: 'disabled'`
 * screenshots, and waiting for real content markers instead of `sleep`.
 */

const REPO_ROOT = process.cwd();
const OUT_ROOT = path.join(REPO_ROOT, 'docs/design_v2/parity');
const OUT_APP = path.join(OUT_ROOT, 'app');
const OUT_REGIONS = path.join(OUT_ROOT, 'app-regions');

mkdirSync(OUT_APP, { recursive: true });
mkdirSync(OUT_REGIONS, { recursive: true });

type ManifestEntry = {
  key: string;
  side: 'app';
  width: number;
  height?: number;
  theme: 'light' | 'dark';
  mockMode: string;
  route: string;
  status: 'ok' | 'blocked';
  reason?: string;
  output?: string;
  regions?: Record<string, { status: string; reason?: string }>;
};

const manifest: ManifestEntry[] = [];
const stylesOut: {
  generatedAt: string;
  routes: Record<string, unknown>;
  fontProbe: unknown;
} = {
  generatedAt: new Date().toISOString(),
  routes: {},
  fontProbe: null,
};

/** Strips the leading slash matrix routes use (router-internal convention)
 * so `page.goto()` resolves relative to `baseURL` (`http://host/stock/`),
 * matching the existing convention in `capture-screenshots.spec.ts`. */
function toGotoPath(appRoute: string): string {
  return appRoute.replace(/^\//, '');
}

async function freezeClock(page: Page) {
  await page.clock.setFixedTime(new Date(FIXED_NOW_KST));
}

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => {
    window.localStorage.setItem('stockfront.theme', t);
  }, theme);
}

/** Route-specific "did real content render" checks — mirrors
 * `capture-design.mjs`'s `assertRealContent` so both sides apply the same
 * bar for "comparable content", not just "didn't crash". */
async function assertRealContent(page: Page, key: string) {
  const title = page.locator('#page-title');
  await title.waitFor({ state: 'visible', timeout: 10_000 });
  const text = ((await title.textContent()) ?? '').trim();
  if (!text) throw new Error('page-title is empty');

  const busyCount = await page.locator('[aria-busy="true"]').count();
  if (busyCount > 0)
    throw new Error(`still showing ${busyCount} aria-busy region(s)`);

  if (key === 'archive-search' || key === 'ops-batches') {
    const rows = await page.locator('table tbody tr').count();
    if (rows === 0) throw new Error(`${key} table has 0 rows`);
  }
  if (key === 'not-found') {
    if (!/이 주소에 해당하는 화면이 없습니다/.test(text)) {
      throw new Error(`unexpected not-found title text: "${text}"`);
    }
  }
}

async function captureRegion(locator: Locator, filePath: string) {
  const count = await locator.count().catch(() => 0);
  if (count === 0) return { status: 'missing' as const };
  try {
    await locator.first().scrollIntoViewIfNeeded({ timeout: 5_000 });
    await locator
      .first()
      .screenshot({ path: filePath, animations: 'disabled' });
    return { status: 'ok' as const };
  } catch (err) {
    return {
      status: 'error' as const,
      reason: String((err as Error).message ?? err),
    };
  }
}

async function extractStyles(locator: Locator) {
  const count = await locator.count().catch(() => 0);
  if (count === 0) return null;
  return locator
    .first()
    .evaluate((el, props: string[]) => {
      const cs = window.getComputedStyle(el);
      const out: Record<string, string> = {};
      for (const p of props)
        out[p] = (cs as unknown as Record<string, string>)[p];
      const rect = el.getBoundingClientRect();
      return { ...out, __rect: { width: rect.width, height: rect.height } };
    }, STYLE_PROPERTIES)
    .catch(() => null);
}

async function measureFontProbe(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector('#page-title') || document.body;
    const cs = window.getComputedStyle(el);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = `${cs.fontWeight} 16px ${cs.fontFamily}`;
    const sample = '가나다라마바사 ABCDEFG 0123456789 시장 브리프 배치 운영';
    const measuredWidth = ctx.measureText(sample).width;
    return {
      declaredFontFamily: cs.fontFamily,
      computedFontWeight: cs.fontWeight,
      plexKrAvailable: document.fonts.check('16px "IBM Plex Sans KR"'),
      sample,
      measuredWidthAt16px: measuredWidth,
    };
  });
}

test.describe
  .serial('Design↔app parity capture (Deliverables 1/3/4, app side)', () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
    });

    for (const entry of MATRIX) {
      for (const width of entry.viewports) {
        const label = `${entry.key}@${width}`;

        test(`${label} (theme=${entry.theme})`, async ({ page }) => {
          await freezeClock(page);
          await setTheme(page, entry.theme);
          await installMockApi(page, { scenario: 'ready', role: 'admin' });
          await page.setViewportSize({ width, height: 900 });

          let blockedReason: string | null = null;
          try {
            await page.goto(toGotoPath(entry.appRoute));
            await assertRealContent(page, entry.key);
          } catch (err) {
            blockedReason = String((err as Error).message ?? err);
          }

          if (entry.theme === 'dark') {
            await expect(page.locator('html')).toHaveAttribute(
              'data-theme',
              'dark'
            );
          }

          if (blockedReason) {
            manifest.push({
              key: entry.key,
              side: 'app',
              width,
              theme: entry.theme,
              mockMode: 'ready',
              route: entry.appRoute,
              status: 'blocked',
              reason: blockedReason,
            });
            test.fail(true, `blocked: ${blockedReason}`);
            return;
          }

          const fullPagePath = path.join(OUT_APP, `${label}.png`);
          await page.screenshot({
            path: fullPagePath,
            fullPage: true,
            animations: 'disabled',
          });

          const scrollWidth = await page.evaluate(
            () => document.documentElement.scrollWidth
          );
          const tokens = await page.evaluate((names: string[]) => {
            const cs = window.getComputedStyle(document.documentElement);
            const out: Record<string, string> = {};
            for (const n of names) out[n] = cs.getPropertyValue(n).trim();
            return out;
          }, APP_TOKENS);

          const probeStyles: Record<string, unknown> = {};
          const regionFiles: Record<
            string,
            { status: string; reason?: string }
          > = {};
          for (const probe of probesFor(entry.key, width)) {
            const locator = probe.app(page);
            const regionPath = path.join(
              OUT_REGIONS,
              `${label}--${probe.name}.png`
            );
            const regionResult = await captureRegion(locator, regionPath);
            regionFiles[probe.name] = regionResult;
            probeStyles[probe.name] =
              regionResult.status === 'ok'
                ? await extractStyles(locator)
                : null;
          }

          if (
            entry.key === 'market-latest' &&
            width === 1280 &&
            !stylesOut.fontProbe
          ) {
            stylesOut.fontProbe = await measureFontProbe(page);
          }

          stylesOut.routes[label] = {
            key: entry.key,
            width,
            mode: 'ready',
            theme: entry.theme,
            scrollWidth,
            tokens,
            probes: probeStyles,
          };

          manifest.push({
            key: entry.key,
            side: 'app',
            width,
            height: 900,
            theme: entry.theme,
            mockMode: 'ready',
            route: entry.appRoute,
            status: 'ok',
            output: path.relative(REPO_ROOT, fullPagePath),
            regions: regionFiles,
          });
        });
      }
    }

    test.afterAll(() => {
      writeFileSync(
        path.join(OUT_ROOT, 'styles-app.json'),
        `${JSON.stringify(stylesOut, null, 2)}\n`
      );
      writeFileSync(
        path.join(OUT_ROOT, 'manifest-app.json'),
        `${JSON.stringify(manifest, null, 2)}\n`
      );
    });
  });
