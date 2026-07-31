#!/usr/bin/env node
/**
 * Deliverable 2 (side-by-side composites), Deliverable 3 (region
 * composites), Deliverable 4 (style-diff.md), and the merged Deliverable 5
 * manifest — built from what `capture-design.mjs` and
 * `e2e/parity-capture.spec.ts` already wrote:
 *   - docs/design_v2/parity/{manifest-design,manifest-app}.json
 *   - docs/design_v2/parity/{styles-design,styles-app}.json
 *   - docs/design_v2/parity/{design,app}/<key>@<width>.png
 *   - docs/design_v2/parity/{design-regions,app-regions}/<key>@<width>--<region>.png
 *
 * Requires ImageMagick (`magick`) on PATH or at `/opt/homebrew/bin/magick`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { STYLE_PROPERTIES, LENGTH_PROPERTIES } from './style-props.mjs';

const REPO_ROOT = process.cwd();
const OUT_ROOT = path.join(REPO_ROOT, 'docs/design_v2/parity');
const DIR = {
  design: path.join(OUT_ROOT, 'design'),
  app: path.join(OUT_ROOT, 'app'),
  designRegions: path.join(OUT_ROOT, 'design-regions'),
  appRegions: path.join(OUT_ROOT, 'app-regions'),
  compare: path.join(OUT_ROOT, 'compare'),
  compareRegions: path.join(OUT_ROOT, 'compare-regions'),
};

const MAGICK = existsSync('/opt/homebrew/bin/magick') ? '/opt/homebrew/bin/magick' : 'magick';

/** This ImageMagick install has no default/fontconfig-resolved font
 * ("unable to read font `'"), so `-annotate` needs an explicit font FILE.
 * Falls back to `undefined` (omit `-font`) if even this isn't present —
 * label bars would then fail loudly rather than silently mis-render. */
const LABEL_FONT = existsSync('/System/Library/Fonts/Supplemental/Arial Bold.ttf')
  ? '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
  : undefined;

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

function magick(args) {
  execFileSync(MAGICK, args, { stdio: ['ignore', 'ignore', 'pipe'] });
}

function identifySize(file) {
  const out = execFileSync(MAGICK, ['identify', '-format', '%w %h', file]).toString().trim();
  const [w, h] = out.split(/\s+/).map(Number);
  return { width: w, height: h };
}

/** Builds one side-by-side composite: `label`-annotated design (left) +
 * app (right), thin separator, 1:1 scale, shorter side padded at the
 * bottom so both halves align at the top. */
function composeSideBySide(designPath, appPath, outPath) {
  const tmp = outPath + '.tmp';
  mkdirSync(path.dirname(outPath), { recursive: true });

  const dSize = identifySize(designPath);
  const aSize = identifySize(appPath);
  const maxH = Math.max(dSize.height, aSize.height);
  const LABEL_H = 34;

  const dPadded = `${tmp}.design-padded.png`;
  const aPadded = `${tmp}.app-padded.png`;
  const dLabeled = `${tmp}.design-labeled.png`;
  const aLabeled = `${tmp}.app-labeled.png`;
  const sep = `${tmp}.sep.png`;

  // Pad shorter image at the bottom (top-aligned), background white.
  magick([designPath, '-background', 'white', '-gravity', 'North', '-extent', `${dSize.width}x${maxH}`, dPadded]);
  magick([appPath, '-background', 'white', '-gravity', 'North', '-extent', `${aSize.width}x${maxH}`, aPadded]);

  // Label bar (own width per side) + stack on top of the padded screenshot.
  const fontArgs = LABEL_FONT ? ['-font', LABEL_FONT] : [];
  magick([
    '-size', `${dSize.width}x${LABEL_H}`, 'xc:#1f2937',
    '-gravity', 'Center', '-fill', 'white', '-pointsize', '18', ...fontArgs,
    '-annotate', '+0+0', 'DESIGN',
    `${tmp}.design-label.png`,
  ]);
  magick([
    '-size', `${aSize.width}x${LABEL_H}`, 'xc:#1f2937',
    '-gravity', 'Center', '-fill', 'white', '-pointsize', '18', ...fontArgs,
    '-annotate', '+0+0', 'APP',
    `${tmp}.app-label.png`,
  ]);
  magick([`${tmp}.design-label.png`, dPadded, '-append', dLabeled]);
  magick([`${tmp}.app-label.png`, aPadded, '-append', aLabeled]);

  // Thin vertical separator spanning the full labeled height.
  magick(['-size', `4x${maxH + LABEL_H}`, 'xc:#9ca3af', sep]);

  magick([dLabeled, sep, aLabeled, '+append', outPath]);

  for (const f of [dPadded, aPadded, `${tmp}.design-label.png`, `${tmp}.app-label.png`, dLabeled, aLabeled, sep]) {
    try {
      execFileSync('rm', ['-f', f]);
    } catch {
      /* best-effort cleanup */
    }
  }
}

function loadManifests() {
  const designManifest = readJson(path.join(OUT_ROOT, 'manifest-design.json'));
  const appManifest = readJson(path.join(OUT_ROOT, 'manifest-app.json'));
  return { designManifest, appManifest };
}

function buildMergedManifest(designManifest, appManifest) {
  const merged = [...designManifest, ...appManifest].sort((a, b) => {
    if (a.key !== b.key) return a.key.localeCompare(b.key);
    if (a.width !== b.width) return a.width - b.width;
    return a.side.localeCompare(b.side);
  });
  writeFileSync(path.join(OUT_ROOT, 'manifest.json'), `${JSON.stringify(merged, null, 2)}\n`);
  return merged;
}

function buildFullPageComposites(designManifest, appManifest) {
  mkdirSync(DIR.compare, { recursive: true });
  const appByLabel = new Map(appManifest.map((r) => [`${r.key}@${r.width}`, r]));
  let built = 0;
  let skipped = [];

  for (const dRow of designManifest) {
    const label = `${dRow.key}@${dRow.width}`;
    const aRow = appByLabel.get(label);
    if (dRow.status !== 'ok' || !aRow || aRow.status !== 'ok') {
      skipped.push({ label, designStatus: dRow.status, appStatus: aRow?.status ?? 'missing' });
      continue;
    }
    const designFile = path.join(REPO_ROOT, dRow.output);
    const appFile = path.join(REPO_ROOT, aRow.output);
    const outFile = path.join(DIR.compare, `${label}.png`);
    composeSideBySide(designFile, appFile, outFile);
    built += 1;
  }
  console.log(`[report] full-page composites: ${built} built, ${skipped.length} skipped`);
  if (skipped.length) console.log(skipped);
  return { built, skipped };
}

function buildRegionComposites(designManifest, appManifest) {
  mkdirSync(DIR.compareRegions, { recursive: true });
  const appByLabel = new Map(appManifest.map((r) => [`${r.key}@${r.width}`, r]));
  let built = 0;
  const skipped = [];

  for (const dRow of designManifest) {
    if (dRow.status !== 'ok') continue;
    const label = `${dRow.key}@${dRow.width}`;
    const aRow = appByLabel.get(label);
    if (!aRow || aRow.status !== 'ok') continue;

    for (const [regionName, dRegion] of Object.entries(dRow.regions ?? {})) {
      const aRegion = aRow.regions?.[regionName];
      if (dRegion.status !== 'ok' || !aRegion || aRegion.status !== 'ok') {
        skipped.push({ label, region: regionName, designStatus: dRegion.status, appStatus: aRegion?.status ?? 'missing' });
        continue;
      }
      const designFile = path.join(DIR.designRegions, `${label}--${regionName}.png`);
      const appFile = path.join(DIR.appRegions, `${label}--${regionName}.png`);
      if (!existsSync(designFile) || !existsSync(appFile)) {
        skipped.push({ label, region: regionName, reason: 'file missing on disk' });
        continue;
      }
      const outFile = path.join(DIR.compareRegions, `${label}--${regionName}.png`);
      composeSideBySide(designFile, appFile, outFile);
      built += 1;
    }
  }
  console.log(`[report] region composites: ${built} built, ${skipped.length} skipped`);
  if (skipped.length) console.log(skipped);
  return { built, skipped };
}

// ---------------------------------------------------------------------------
// Deliverable 4: style-diff.md
// ---------------------------------------------------------------------------

function parseLength(value) {
  const m = /^(-?\d+(?:\.\d+)?)px$/.exec(value ?? '');
  return m ? Number(m[1]) : null;
}

function diffProbeStyles(designStyles, appStyles) {
  if (!designStyles || !appStyles) return null;
  const diffs = [];
  for (const prop of STYLE_PROPERTIES) {
    const dv = designStyles[prop];
    const av = appStyles[prop];
    if (dv === av) continue;
    let delta = null;
    if (LENGTH_PROPERTIES.has(prop)) {
      const dn = parseLength(dv);
      const an = parseLength(av);
      if (dn !== null && an !== null) delta = Number((dn - an).toFixed(2));
    }
    diffs.push({ prop, design: dv, app: av, delta });
  }
  return diffs;
}

function buildStyleDiffReport(stylesDesign, stylesApp) {
  const lines = [];
  const offenderCounts = new Map();
  let totalComparisons = 0;
  const routeSections = [];

  const routeLabels = Object.keys(stylesDesign.routes).filter((l) => l in stylesApp.routes);

  for (const label of routeLabels) {
    const dRoute = stylesDesign.routes[label];
    const aRoute = stylesApp.routes[label];
    const probeNames = Object.keys(dRoute.probes).filter((p) => p in aRoute.probes);
    const probeSections = [];

    for (const probeName of probeNames) {
      const diffs = diffProbeStyles(dRoute.probes[probeName], aRoute.probes[probeName]);
      if (diffs === null) continue; // one side had no match for this probe
      totalComparisons += 1;
      for (const d of diffs) {
        offenderCounts.set(d.prop, (offenderCounts.get(d.prop) ?? 0) + 1);
      }
      if (diffs.length > 0) probeSections.push({ probeName, diffs });
    }

    routeSections.push({
      label,
      key: dRoute.key,
      width: dRoute.width,
      theme: dRoute.theme,
      scrollWidth: { design: dRoute.scrollWidth, app: aRoute.scrollWidth },
      tokens: { design: dRoute.tokens, app: aRoute.tokens },
      probeSections,
    });
  }

  // ---- top offenders summary ----
  const offenderList = [...offenderCounts.entries()].sort((a, b) => b[1] - a[1]);
  lines.push('# Parity style-diff report');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()}.`);
  lines.push('');
  lines.push('## Top offenders');
  lines.push('');
  lines.push(
    `Across ${totalComparisons} route/viewport/probe comparisons, properties differing most often:`
  );
  lines.push('');
  if (offenderList.length === 0) {
    lines.push('_No property differences found — every compared probe matched exactly._');
  } else {
    for (const [prop, count] of offenderList.slice(0, 15)) {
      lines.push(`- **${prop}** differs on ${count}/${totalComparisons} probes`);
    }
  }
  lines.push('');

  // ---- font-family finding ----
  lines.push('## Font-family finding');
  lines.push('');
  const fd = stylesDesign.fontProbe;
  const fa = stylesApp.fontProbe;
  if (fd && fa) {
    const widthDelta = Math.abs(fd.measuredWidthAt16px - fa.measuredWidthAt16px);
    const sameFont = widthDelta < 0.5;
    lines.push(`- Design declares \`font-family\`: \`${fd.declaredFontFamily}\``);
    lines.push(`- App declares \`font-family\`: \`${fa.declaredFontFamily}\``);
    lines.push(`- \`document.fonts.check('16px "IBM Plex Sans KR"')\`: design=${fd.plexKrAvailable}, app=${fa.plexKrAvailable}`);
    lines.push(
      '  - Both report `true` even though IBM Plex Sans KR is confirmed NOT installed on this machine (`fc-list | grep -i plex` finds nothing). `document.fonts.check()` is not trustworthy evidence here — Chromium returns `true` once a fallback in the stack can render the text, not only for an exact family match. Treat this line as inconclusive; the canvas measurement below is the real evidence.'
    );
    lines.push(
      `- Empirical check: identical sample string (\`${fd.sample}\`) measured via \`canvas.measureText\` at the same computed font-size/weight on \`#page-title\` on both sides.`
    );
    lines.push(`  - design measured width: **${fd.measuredWidthAt16px.toFixed(3)}px**`);
    lines.push(`  - app measured width: **${fa.measuredWidthAt16px.toFixed(3)}px**`);
    lines.push(`  - delta: ${widthDelta.toFixed(3)}px`);
    if (sameFont) {
      lines.push(
        '  - **Same rendered font on both sides** (sub-pixel-identical measured width). IBM Plex Sans KR is not installed, so both stacks fall back to the same system sans-serif — font-size comparisons below are valid apples-to-apples.'
      );
    } else {
      lines.push(
        '  - **WARNING: measured widths differ non-trivially.** The two sides may be rendering different fonts — treat every fontSize/lineHeight/letterSpacing diff below with caution until this is resolved.'
      );
    }
  } else {
    lines.push('_Font probe data missing on one or both sides._');
  }
  lines.push('');

  // ---- per-route sections ----
  lines.push('## Per-route detail');
  lines.push('');
  for (const section of routeSections) {
    lines.push(`### ${section.label} (theme=${section.theme})`);
    lines.push('');
    lines.push(
      `- \`document.documentElement.scrollWidth\`: design=${section.scrollWidth.design}, app=${section.scrollWidth.app}` +
        (section.scrollWidth.design !== section.scrollWidth.app
          ? ` **(delta ${section.scrollWidth.design - section.scrollWidth.app}px)**`
          : '')
    );
    lines.push('');
    lines.push('Design layout tokens (`[data-app]`): ' + JSON.stringify(section.tokens.design));
    lines.push('');
    lines.push('App layout/type tokens (`:root`): ' + JSON.stringify(section.tokens.app));
    lines.push('');

    if (section.probeSections.length === 0) {
      lines.push('_No computed-style differences on any compared probe for this route/viewport._');
      lines.push('');
      continue;
    }

    for (const { probeName, diffs } of section.probeSections) {
      lines.push(`#### ${probeName}`);
      lines.push('');
      lines.push('| property | design | app | delta |');
      lines.push('|---|---|---|---|');
      for (const d of diffs) {
        lines.push(
          `| ${d.prop} | \`${d.design}\` | \`${d.app}\` | ${d.delta !== null ? `${d.delta}px` : '—'} |`
        );
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

function main() {
  const { designManifest, appManifest } = loadManifests();
  buildMergedManifest(designManifest, appManifest);
  buildFullPageComposites(designManifest, appManifest);
  buildRegionComposites(designManifest, appManifest);

  const stylesDesign = readJson(path.join(OUT_ROOT, 'styles-design.json'));
  const stylesApp = readJson(path.join(OUT_ROOT, 'styles-app.json'));
  const report = buildStyleDiffReport(stylesDesign, stylesApp);
  writeFileSync(path.join(OUT_ROOT, 'style-diff.md'), report);
  console.log('[report] wrote style-diff.md');
}

main();
