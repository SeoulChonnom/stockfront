#!/usr/bin/env node
/**
 * Design-prototype-side capture for the parity harness.
 *
 * Serves `docs/design_v2/handoff_v2/` over plain HTTP (the prototype's
 * `support.js` does `fetch(location.href)`, so `file://` won't work),
 * drives it with Playwright, and produces:
 *   - `docs/design_v2/parity/design/<key>@<width>.png` (full page)
 *   - `docs/design_v2/parity/design-regions/<key>@<width>--<region>.png`
 *   - `docs/design_v2/parity/styles-design.json` (Deliverable 4 raw data)
 *   - `docs/design_v2/parity/manifest-design.json` (this side's manifest
 *     rows; `build-report.mjs` merges this with `manifest-app.json`)
 *
 * Usage: `node scripts/parity/capture-design.mjs [--outdir=<dir>]`
 * `--outdir` overrides `docs/design_v2/parity` — used to run the
 * determinism check (capture twice into two different dirs, shasum
 * compare) without touching the real output.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

import { MATRIX, FIXED_NOW_KST } from './matrix.mjs';
import { probesFor } from './probes.mjs';
import { STYLE_PROPERTIES, DESIGN_TOKENS } from './style-props.mjs';
import { startStaticServer } from './lib/static-server.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const DESIGN_ROOT = path.join(REPO_ROOT, 'docs/design_v2/handoff_v2');
const DESIGN_FILE_ENCODED = 'Market%20Brief%20v2.dc.html';

const PORT = 4790;
const HOST = '127.0.0.1';

const args = process.argv.slice(2);
const outdirArg = args.find((a) => a.startsWith('--outdir='));
const OUT_ROOT = outdirArg
  ? path.resolve(outdirArg.slice('--outdir='.length))
  : path.join(REPO_ROOT, 'docs/design_v2/parity');
const OUT_DESIGN = path.join(OUT_ROOT, 'design');
const OUT_REGIONS = path.join(OUT_ROOT, 'design-regions');

/** Per-key fallback fixture modes to try, in order, if `ready` doesn't render real content. */
const FALLBACK_MODES = {
  'market-latest': ['ready'],
  'market-latest-dark': ['ready'],
  'archive-search': ['ready'],
  'archive-detail': ['ready', 'partial', 'sparse'],
  'cluster-detail': ['ready', 'heavy', 'long'],
  'ops-batches': ['ready'],
  'not-found': ['ready'],
};

function buildUrl(hash, mockMode) {
  const query = mockMode && mockMode !== 'ready' ? `?mock=${mockMode}` : '';
  return `http://${HOST}:${PORT}/${DESIGN_FILE_ENCODED}#${hash}${query}`;
}

/** Route-specific "did real content render" checks — throws with a reason on failure. */
async function assertRealContent(page, key) {
  await page.waitForSelector('[data-app]', { state: 'attached', timeout: 10_000 });
  const title = page.locator('#page-title');
  await title.waitFor({ state: 'visible', timeout: 10_000 });
  const text = ((await title.textContent()) ?? '').trim();
  const skelCount = await page.locator('[data-skel]').count();
  if (!text) throw new Error('page-title is empty');
  if (skelCount > 0) throw new Error(`still showing ${skelCount} skeleton block(s)`);

  if (key === 'archive-search') {
    const rows = await page.locator('table tbody tr').count();
    if (rows === 0) throw new Error('archive results table has 0 rows');
  }
  if (key === 'ops-batches') {
    const rows = await page.locator('table tbody tr').count();
    if (rows === 0) throw new Error('ops history table has 0 rows');
  }
  if (key === 'not-found') {
    if (!/이 주소에 해당하는 화면이 없습니다/.test(text)) {
      throw new Error(`unexpected not-found title text: "${text}"`);
    }
  }
}

async function setDark(page) {
  const toggle = page.getByRole('button', { name: '다크 테마로 전환' });
  await toggle.click();
  await page
    .locator('[data-app][data-theme="dark"]')
    .waitFor({ state: 'attached', timeout: 5_000 });
}

async function captureRegion(locator, filePath) {
  const count = await locator.count().catch(() => 0);
  if (count === 0) return { status: 'missing' };
  try {
    await locator.first().scrollIntoViewIfNeeded({ timeout: 5_000 });
    await locator.first().screenshot({ path: filePath, animations: 'disabled' });
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', reason: String(err.message ?? err) };
  }
}

async function extractStyles(locator) {
  const count = await locator.count().catch(() => 0);
  if (count === 0) return null;
  return locator
    .first()
    .evaluate((el, props) => {
      const cs = window.getComputedStyle(el);
      const out = {};
      for (const p of props) out[p] = cs[p];
      const rect = el.getBoundingClientRect();
      out.__rect = { width: rect.width, height: rect.height };
      return out;
    }, STYLE_PROPERTIES)
    .catch(() => null);
}

async function measureFontProbe(page) {
  return page.evaluate(() => {
    const el = document.querySelector('#page-title') || document.body;
    const cs = window.getComputedStyle(el);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
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

async function main() {
  await mkdir(OUT_DESIGN, { recursive: true });
  await mkdir(OUT_REGIONS, { recursive: true });

  const server = await startStaticServer(DESIGN_ROOT, PORT, HOST);
  console.log(`[design] static server http://${HOST}:${PORT} -> ${DESIGN_ROOT}`);

  const browser = await chromium.launch();
  const manifest = [];
  const stylesOut = { generatedAt: new Date().toISOString(), routes: {} };
  let fontProbe = null;

  try {
    for (const entry of MATRIX) {
      for (const width of entry.viewports) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();
        await page.clock.setFixedTime(new Date(FIXED_NOW_KST));
        await page.emulateMedia({ reducedMotion: 'reduce' });

        const label = `${entry.key}@${width}`;
        const fallbacks = FALLBACK_MODES[entry.key] ?? ['ready'];
        let usedMode = null;
        let lastError = null;

        for (const mode of fallbacks) {
          try {
            await page.goto(buildUrl(entry.designHash, mode), {
              waitUntil: 'load',
              timeout: 20_000,
            });
            if (entry.theme === 'dark') await setDark(page);
            await assertRealContent(page, entry.key);
            usedMode = mode;
            break;
          } catch (err) {
            lastError = err;
          }
        }

        if (!usedMode) {
          manifest.push({
            key: entry.key,
            side: 'design',
            width,
            status: 'blocked',
            reason: String(lastError?.message ?? lastError),
            route: entry.designHash,
          });
          console.error(`[design] BLOCKED ${label}: ${lastError?.message ?? lastError}`);
          await context.close();
          continue;
        }

        const fullPagePath = path.join(OUT_DESIGN, `${label}.png`);
        await page.screenshot({
          path: fullPagePath,
          fullPage: true,
          animations: 'disabled',
        });

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const tokens = await page
          .locator('[data-app]')
          .first()
          .evaluate((el, names) => {
            const cs = window.getComputedStyle(el);
            const out = {};
            for (const n of names) out[n] = cs.getPropertyValue(n).trim();
            return out;
          }, DESIGN_TOKENS);

        const probeStyles = {};
        const regionFiles = {};
        for (const probe of probesFor(entry.key, width)) {
          const locator = probe.design(page);
          const regionPath = path.join(OUT_REGIONS, `${label}--${probe.name}.png`);
          const regionResult = await captureRegion(locator, regionPath);
          regionFiles[probe.name] = regionResult;
          probeStyles[probe.name] =
            regionResult.status === 'ok' ? await extractStyles(locator) : null;
        }

        if (entry.key === 'market-latest' && width === 1280 && !fontProbe) {
          fontProbe = await measureFontProbe(page);
        }

        stylesOut.routes[label] = {
          key: entry.key,
          width,
          mode: usedMode,
          theme: entry.theme,
          scrollWidth,
          tokens,
          probes: probeStyles,
        };

        manifest.push({
          key: entry.key,
          side: 'design',
          width,
          height: 900,
          theme: entry.theme,
          mockMode: usedMode,
          note: usedMode === fallbacks[0] ? undefined : `substituted mock=${usedMode} (ready did not render comparable content: ${lastError?.message ?? ''})`,
          route: entry.designHash,
          status: 'ok',
          output: path.relative(REPO_ROOT, fullPagePath),
          regions: regionFiles,
        });

        console.log(`[design] OK ${label} (mode=${usedMode})`);
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  stylesOut.fontProbe = fontProbe;

  await writeFile(
    path.join(OUT_ROOT, 'styles-design.json'),
    `${JSON.stringify(stylesOut, null, 2)}\n`
  );
  await writeFile(
    path.join(OUT_ROOT, 'manifest-design.json'),
    `${JSON.stringify(manifest, null, 2)}\n`
  );

  console.log(`[design] done. ${manifest.filter((m) => m.status === 'ok').length}/${manifest.length} ok.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
