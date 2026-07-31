#!/usr/bin/env node

import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const DEFAULT_STYLE_PROPERTIES = [
  'display',
  'position',
  'box-sizing',
  'overflow',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'white-space',
  'color',
  'background-color',
  'width',
  'height',
  'min-width',
  'max-width',
  'min-height',
  'max-height',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'row-gap',
  'column-gap',
  'align-items',
  'justify-content',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-radius',
  'box-shadow',
  'opacity',
  'transform',
];

const DEFAULT_TOLERANCES = {
  positionPx: 1,
  sizePx: 1,
  spacingPx: 1,
  pixelChannelThreshold: 0.1,
  maxDiffPixelRatio: 0.002,
};

function printHelp() {
  console.log(`Visual audit for reference HTML and React candidates

Usage:
  node visual-audit.mjs --config <path> [options]

Options:
  --config <path>          Configuration JSON file (required)
  --mode <mode>            all | reference | candidate | compare (default: all)
  --page <id>              Limit to one page id
  --viewport <name>        Limit to one viewport name
  --headed                 Show Chromium while capturing
  --no-fail-on-diff        Always exit 0 after a completed comparison
  --help                    Show this message

Exit codes:
  0  Completed and passed, or --no-fail-on-diff was used
  1  Configuration, browser, or execution error
  2  Comparison completed with blocking differences
`);
}

function parseArgs(argv) {
  const args = {
    mode: 'all',
    headed: false,
    failOnDiffOverride: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--config') {
      args.config = argv[++index];
    } else if (arg === '--mode') {
      args.mode = argv[++index];
    } else if (arg === '--page') {
      args.page = argv[++index];
    } else if (arg === '--viewport') {
      args.viewport = argv[++index];
    } else if (arg === '--headed') {
      args.headed = true;
    } else if (arg === '--no-fail-on-diff') {
      args.failOnDiffOverride = false;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.help && !args.config) {
    throw new Error('--config is required');
  }
  if (!['all', 'reference', 'candidate', 'compare'].includes(args.mode)) {
    throw new Error(`Unsupported mode: ${args.mode}`);
  }
  return args;
}

function sanitize(value) {
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unnamed';
}

function normalizeLocalOrRemoteUrl(value) {
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)) {
    return value;
  }
  return pathToFileURL(path.resolve(process.cwd(), value)).href;
}


function injectBaseHref(html, baseHref) {
  if (/<base\s/i.test(html)) {
    return html;
  }
  const baseTag = `<base href="${baseHref}">`;
  if (/<head(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(?:\s[^>]*)?>/i, (match) => `${match}${baseTag}`);
  }
  return `${baseTag}${html}`;
}

async function loadDocument(page, sourceValue, navigationTimeoutMs) {
  if (/^data:text\/html/i.test(sourceValue)) {
    const commaIndex = sourceValue.indexOf(',');
    if (commaIndex < 0) {
      throw new Error('Invalid data:text/html URL');
    }
    const metadata = sourceValue.slice(0, commaIndex);
    const payload = sourceValue.slice(commaIndex + 1);
    const html = /;base64/i.test(metadata)
      ? Buffer.from(payload, 'base64').toString('utf8')
      : decodeURIComponent(payload);
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: navigationTimeoutMs });
    return sourceValue.slice(0, Math.min(sourceValue.length, 120));
  }

  if (!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(sourceValue)) {
    const localPath = path.resolve(process.cwd(), sourceValue);
    if (/\.html?$/i.test(localPath)) {
      const html = await fs.readFile(localPath, 'utf8');
      const baseHref = pathToFileURL(`${path.dirname(localPath)}${path.sep}`).href;
      await page.setContent(injectBaseHref(html, baseHref), {
        waitUntil: 'domcontentloaded',
        timeout: navigationTimeoutMs,
      });
      return pathToFileURL(localPath).href;
    }
  }

  const url = normalizeLocalOrRemoteUrl(sourceValue);
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: navigationTimeoutMs,
  });
  return url;
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function loadPlaywright() {
  const requireFromCwd = createRequire(path.join(process.cwd(), 'package.json'));
  const packageNames = ['playwright', '@playwright/test', 'playwright-core'];
  const errors = [];

  for (const packageName of packageNames) {
    try {
      const loaded = requireFromCwd(packageName);
      if (loaded?.chromium) {
        return loaded;
      }
    } catch (error) {
      errors.push(`${packageName}: ${error.message}`);
    }
  }

  throw new Error(
    `Playwright is required. Install \"playwright\" or \"@playwright/test\" in the current project.\n${errors.join('\n')}`,
  );
}

function validateConfig(config) {
  if (!Array.isArray(config.pages) || config.pages.length === 0) {
    throw new Error('config.pages must contain at least one page');
  }
  if (!Array.isArray(config.viewports) || config.viewports.length === 0) {
    throw new Error('config.viewports must contain at least one viewport');
  }

  const pageIds = new Set();
  for (const page of config.pages) {
    if (!page.id || pageIds.has(page.id)) {
      throw new Error(`Each page requires a unique id; invalid id: ${page.id}`);
    }
    pageIds.add(page.id);
    if (!page.referenceUrl || !page.candidateUrl) {
      throw new Error(`Page ${page.id} requires referenceUrl and candidateUrl`);
    }
    if (!Array.isArray(page.targets) || page.targets.length === 0) {
      throw new Error(`Page ${page.id} requires at least one target`);
    }

    const targetIds = new Set();
    for (const target of page.targets) {
      if (!target.id || targetIds.has(target.id)) {
        throw new Error(`Page ${page.id} has an invalid or duplicate target id: ${target.id}`);
      }
      targetIds.add(target.id);
      if (!target.reference || !target.candidate) {
        throw new Error(`Target ${page.id}/${target.id} requires reference and candidate selectors`);
      }
    }

    for (const gap of page.gaps ?? []) {
      if (!gap.id || !targetIds.has(gap.from) || !targetIds.has(gap.to)) {
        throw new Error(`Gap ${page.id}/${gap.id ?? '<missing>'} references unknown targets`);
      }
      if (!['vertical', 'horizontal', 'x', 'y'].includes(gap.axis)) {
        throw new Error(`Gap ${page.id}/${gap.id} has unsupported axis: ${gap.axis}`);
      }
    }
  }

  const viewportNames = new Set();
  for (const viewport of config.viewports) {
    if (!viewport.name || viewportNames.has(viewport.name)) {
      throw new Error(`Each viewport requires a unique name; invalid name: ${viewport.name}`);
    }
    viewportNames.add(viewport.name);
    if (!Number.isFinite(viewport.width) || !Number.isFinite(viewport.height)) {
      throw new Error(`Viewport ${viewport.name} requires numeric width and height`);
    }
  }
}

function selectWork(config, args) {
  const pages = args.page ? config.pages.filter((page) => page.id === args.page) : config.pages;
  const viewports = args.viewport
    ? config.viewports.filter((viewport) => viewport.name === args.viewport)
    : config.viewports;

  if (pages.length === 0) {
    throw new Error(`No page matched --page ${args.page}`);
  }
  if (viewports.length === 0) {
    throw new Error(`No viewport matched --viewport ${args.viewport}`);
  }
  return { pages, viewports };
}

function captureDirectory(outputDir, pageId, viewportName, side) {
  return path.join(outputDir, sanitize(pageId), sanitize(viewportName), side);
}

function comparisonDirectory(outputDir, pageId, viewportName) {
  return path.join(outputDir, sanitize(pageId), sanitize(viewportName), 'comparison');
}

async function waitForStablePage(page, readySelector, config) {
  if (readySelector) {
    await page.locator(readySelector).first().waitFor({
      state: 'visible',
      timeout: config.navigationTimeoutMs,
    });
  }

  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  });

  if (config.stableCss) {
    await page.addStyleTag({ content: config.stableCss });
  }

  try {
    await page.waitForLoadState('networkidle', { timeout: Math.min(config.navigationTimeoutMs, 5000) });
  } catch {
    // Long-polling and dev servers may never become fully idle.
  }

  if (config.settleTimeMs > 0) {
    await page.waitForTimeout(config.settleTimeMs);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

/**
 * Actually remove elements from layout flow (not merely paint them over).
 * Used for reference-only chrome — e.g. a masked debug strip — that would
 * otherwise still occupy vertical space and offset every downstream `y`
 * measurement and full-page pixel comparison. Unlike `maskSelectors`
 * (screenshot-time paint overlay only, applied after measurement), this runs
 * before both measurement and screenshot so geometry reflects the same DOM
 * the pixels are compared against.
 */
async function removeFromLayout(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector);
    const count = await locator.count();
    if (count === 0) continue;
    await locator.evaluateAll((elements) => {
      for (const element of elements) {
        element.style.setProperty('display', 'none', 'important');
      }
    });
  }
}

async function measureTarget(page, target, side, globalStyleProperties) {
  const selector = target[side];
  const locator = page.locator(selector);
  const count = await locator.count();

  if (count !== 1) {
    return {
      id: target.id,
      selector,
      parentId: target.parentId ?? null,
      count,
      error: count === 0 ? 'selector-not-found' : 'selector-not-unique',
    };
  }

  const styleProperties = target.styleProperties ?? globalStyleProperties;
  const value = await locator.first().evaluate((element, properties) => {
    const rect = element.getBoundingClientRect();
    const computed = getComputedStyle(element);
    const styles = {};
    for (const property of properties) {
      styles[property] = computed.getPropertyValue(property);
    }

    return {
      tagName: element.tagName.toLowerCase(),
      text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160),
      rect: {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        viewportX: rect.left,
        viewportY: rect.top,
        width: rect.width,
        height: rect.height,
        top: rect.top + window.scrollY,
        right: rect.right + window.scrollX,
        bottom: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      },
      styles,
    };
  }, styleProperties);

  return {
    id: target.id,
    selector,
    parentId: target.parentId ?? null,
    count,
    ...value,
  };
}

function computeGaps(gapDefinitions, measurements) {
  const byId = new Map(measurements.map((measurement) => [measurement.id, measurement]));
  return (gapDefinitions ?? []).map((definition) => {
    const from = byId.get(definition.from);
    const to = byId.get(definition.to);
    if (!from?.rect || !to?.rect) {
      return {
        ...definition,
        error: 'target-measurement-unavailable',
      };
    }

    let value;
    if (definition.axis === 'vertical') {
      value = to.rect.top - from.rect.bottom;
    } else if (definition.axis === 'horizontal') {
      value = to.rect.left - from.rect.right;
    } else if (definition.axis === 'x') {
      value = to.rect.left - from.rect.left;
    } else {
      value = to.rect.top - from.rect.top;
    }

    return {
      ...definition,
      value,
    };
  });
}

async function captureSide({ browser, config, pageConfig, viewport, side, outputDir, headed }) {
  const isCandidate = side === 'candidate';
  const contextOptions = {
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
    locale: config.locale ?? 'ko-KR',
    timezoneId: config.timezoneId ?? 'Asia/Seoul',
    colorScheme: config.colorScheme ?? 'light',
    reducedMotion: 'reduce',
  };

  if (isCandidate && pageConfig.storageState) {
    contextOptions.storageState = path.resolve(process.cwd(), pageConfig.storageState);
  }
  if (isCandidate && pageConfig.extraHttpHeaders) {
    contextOptions.extraHTTPHeaders = pageConfig.extraHttpHeaders;
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const destination = captureDirectory(outputDir, pageConfig.id, viewport.name, side);
  await fs.mkdir(path.join(destination, 'targets'), { recursive: true });

  const sourceValue = pageConfig[`${side}Url`];
  const readySelector = pageConfig[`${side}ReadySelector`];

  try {
    const url = await loadDocument(page, sourceValue, config.navigationTimeoutMs);
    await waitForStablePage(page, readySelector, config);
    await removeFromLayout(page, pageConfig.layoutHideSelectors?.[side] ?? []);

    const globalStyleProperties = config.styleProperties ?? DEFAULT_STYLE_PROPERTIES;
    const measurements = [];
    for (const target of pageConfig.targets) {
      measurements.push(await measureTarget(page, target, side, globalStyleProperties));
    }

    const gaps = computeGaps(pageConfig.gaps, measurements);
    const maskSelectors = pageConfig.maskSelectors?.[side] ?? [];
    const masks = maskSelectors.map((selector) => page.locator(selector));

    if (pageConfig.fullPageScreenshot !== false) {
      await page.screenshot({
        path: path.join(destination, 'full-page.png'),
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
        mask: masks,
      });
    }

    for (const target of pageConfig.targets) {
      if (target.screenshot === false) {
        continue;
      }
      const measurement = measurements.find((item) => item.id === target.id);
      if (measurement?.count !== 1) {
        continue;
      }
      await page.locator(target[side]).first().screenshot({
        path: path.join(destination, 'targets', `${sanitize(target.id)}.png`),
        animations: 'disabled',
        caret: 'hide',
      });
    }

    const capture = {
      generatedAt: new Date().toISOString(),
      side,
      pageId: pageConfig.id,
      viewport,
      url,
      measurements,
      gaps,
      runtime: {
        title: await page.title(),
        userAgent: await page.evaluate(() => navigator.userAgent),
        headed,
      },
    };

    await writeJson(path.join(destination, 'measurements.json'), capture);
    return capture;
  } finally {
    await context.close();
  }
}

function isIgnored(pageConfig, query) {
  return (pageConfig.ignore ?? []).some((rule) => {
    if (rule.target !== query.target) return false;
    if (rule.kind !== query.kind) return false;
    if (rule.property && rule.property !== query.property) return false;
    return true;
  });
}

function round(value, places = 3) {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function compareMeasurements(referenceCapture, candidateCapture, pageConfig, tolerances) {
  const selectorIssues = [];
  const styleDiffs = [];
  const geometryDiffs = [];
  const gapDiffs = [];

  const referenceById = new Map(referenceCapture.measurements.map((item) => [item.id, item]));
  const candidateById = new Map(candidateCapture.measurements.map((item) => [item.id, item]));

  for (const target of pageConfig.targets) {
    const reference = referenceById.get(target.id);
    const candidate = candidateById.get(target.id);

    for (const [side, measurement] of [['reference', reference], ['candidate', candidate]]) {
      if (!measurement || measurement.count !== 1) {
        selectorIssues.push({
          target: target.id,
          side,
          selector: target[side],
          count: measurement?.count ?? 0,
          issue: measurement?.error ?? 'measurement-missing',
        });
      }
    }

    if (!reference?.rect || !candidate?.rect) {
      continue;
    }

    const geometryChecks = [
      ['x', tolerances.positionPx],
      ['y', tolerances.positionPx],
      ['width', tolerances.sizePx],
      ['height', tolerances.sizePx],
    ];

    for (const [property, tolerance] of geometryChecks) {
      const expected = reference.rect[property];
      const actual = candidate.rect[property];
      const delta = actual - expected;
      if (Math.abs(delta) > tolerance && !isIgnored(pageConfig, {
        target: target.id,
        kind: 'geometry',
        property,
      })) {
        geometryDiffs.push({
          target: target.id,
          parentId: target.parentId ?? null,
          property,
          expected: round(expected),
          actual: round(actual),
          delta: round(delta),
          tolerance,
        });
      }
    }

    const styleProperties = new Set([
      ...Object.keys(reference.styles ?? {}),
      ...Object.keys(candidate.styles ?? {}),
    ]);
    for (const property of styleProperties) {
      const expected = reference.styles?.[property] ?? '';
      const actual = candidate.styles?.[property] ?? '';
      if (expected !== actual && !isIgnored(pageConfig, {
        target: target.id,
        kind: 'style',
        property,
      })) {
        styleDiffs.push({
          target: target.id,
          parentId: target.parentId ?? null,
          property,
          expected,
          actual,
        });
      }
    }
  }

  const referenceGaps = new Map(referenceCapture.gaps.map((item) => [item.id, item]));
  const candidateGaps = new Map(candidateCapture.gaps.map((item) => [item.id, item]));
  for (const gap of pageConfig.gaps ?? []) {
    const reference = referenceGaps.get(gap.id);
    const candidate = candidateGaps.get(gap.id);
    if (!Number.isFinite(reference?.value) || !Number.isFinite(candidate?.value)) {
      gapDiffs.push({
        target: gap.id,
        issue: 'gap-measurement-unavailable',
      });
      continue;
    }
    const delta = candidate.value - reference.value;
    if (Math.abs(delta) > tolerances.spacingPx && !isIgnored(pageConfig, {
      target: gap.id,
      kind: 'gap',
    })) {
      gapDiffs.push({
        target: gap.id,
        axis: gap.axis,
        from: gap.from,
        to: gap.to,
        expected: round(reference.value),
        actual: round(candidate.value),
        delta: round(delta),
        tolerance: tolerances.spacingPx,
      });
    }
  }

  return { selectorIssues, styleDiffs, geometryDiffs, gapDiffs };
}

async function comparePngsInBrowser(page, referencePath, candidatePath, diffPath, threshold) {
  const [referenceBuffer, candidateBuffer] = await Promise.all([
    fs.readFile(referencePath),
    fs.readFile(candidatePath),
  ]);

  const result = await page.evaluate(async ({ referenceBase64, candidateBase64, thresholdValue }) => {
    const decode = async (base64) => {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    };

    const [reference, candidate] = await Promise.all([
      decode(referenceBase64),
      decode(candidateBase64),
    ]);

    const width = Math.max(reference.width, candidate.width);
    const height = Math.max(reference.height, candidate.height);

    const makeCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    };

    const referenceCanvas = makeCanvas();
    const candidateCanvas = makeCanvas();
    const diffCanvas = makeCanvas();

    const referenceContext = referenceCanvas.getContext('2d', { willReadFrequently: true });
    const candidateContext = candidateCanvas.getContext('2d', { willReadFrequently: true });
    const diffContext = diffCanvas.getContext('2d');

    referenceContext.clearRect(0, 0, width, height);
    candidateContext.clearRect(0, 0, width, height);
    referenceContext.drawImage(reference, 0, 0);
    candidateContext.drawImage(candidate, 0, 0);

    const referenceData = referenceContext.getImageData(0, 0, width, height);
    const candidateData = candidateContext.getImageData(0, 0, width, height);
    const diffData = diffContext.createImageData(width, height);
    const channelLimit = Math.max(0, Math.min(1, thresholdValue)) * 255;

    let diffPixels = 0;
    for (let index = 0; index < referenceData.data.length; index += 4) {
      const redDelta = Math.abs(referenceData.data[index] - candidateData.data[index]);
      const greenDelta = Math.abs(referenceData.data[index + 1] - candidateData.data[index + 1]);
      const blueDelta = Math.abs(referenceData.data[index + 2] - candidateData.data[index + 2]);
      const alphaDelta = Math.abs(referenceData.data[index + 3] - candidateData.data[index + 3]);
      const changed = Math.max(redDelta, greenDelta, blueDelta, alphaDelta) > channelLimit;

      if (changed) {
        diffPixels += 1;
        diffData.data[index] = 255;
        diffData.data[index + 1] = 0;
        diffData.data[index + 2] = 255;
        diffData.data[index + 3] = 255;
      } else {
        const gray = Math.round(
          (candidateData.data[index] + candidateData.data[index + 1] + candidateData.data[index + 2]) / 3,
        );
        diffData.data[index] = gray;
        diffData.data[index + 1] = gray;
        diffData.data[index + 2] = gray;
        diffData.data[index + 3] = 70;
      }
    }

    diffContext.putImageData(diffData, 0, 0);
    return {
      referenceWidth: reference.width,
      referenceHeight: reference.height,
      candidateWidth: candidate.width,
      candidateHeight: candidate.height,
      comparedWidth: width,
      comparedHeight: height,
      totalPixels: width * height,
      diffPixels,
      diffPixelRatio: width * height === 0 ? 0 : diffPixels / (width * height),
      diffDataUrl: diffCanvas.toDataURL('image/png'),
    };
  }, {
    referenceBase64: referenceBuffer.toString('base64'),
    candidateBase64: candidateBuffer.toString('base64'),
    thresholdValue: threshold,
  });

  await fs.mkdir(path.dirname(diffPath), { recursive: true });
  const diffBase64 = result.diffDataUrl.replace(/^data:image\/png;base64,/, '');
  await fs.writeFile(diffPath, Buffer.from(diffBase64, 'base64'));
  delete result.diffDataUrl;
  return result;
}

async function comparePixels({ browser, outputDir, pageConfig, viewport, tolerances }) {
  const referenceDir = captureDirectory(outputDir, pageConfig.id, viewport.name, 'reference');
  const candidateDir = captureDirectory(outputDir, pageConfig.id, viewport.name, 'candidate');
  const comparisonDir = comparisonDirectory(outputDir, pageConfig.id, viewport.name);
  await fs.mkdir(path.join(comparisonDir, 'targets'), { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 32, height: 32 },
    deviceScaleFactor: 1,
  });
  const diffPage = await context.newPage();
  const pixelDiffs = [];

  const comparePair = async (target, referencePath, candidatePath, diffPath) => {
    try {
      await Promise.all([fs.access(referencePath), fs.access(candidatePath)]);
    } catch {
      pixelDiffs.push({ target, issue: 'screenshot-missing', referencePath, candidatePath });
      return;
    }

    if (isIgnored(pageConfig, { target, kind: 'pixel' })) {
      pixelDiffs.push({ target, ignored: true });
      return;
    }

    const result = await comparePngsInBrowser(
      diffPage,
      referencePath,
      candidatePath,
      diffPath,
      tolerances.pixelChannelThreshold,
    );
    pixelDiffs.push({
      target,
      ...result,
      diffPixelRatio: round(result.diffPixelRatio, 6),
      threshold: tolerances.maxDiffPixelRatio,
      passed: result.diffPixelRatio <= tolerances.maxDiffPixelRatio,
      diffPath,
    });
  };

  if (pageConfig.fullPageScreenshot !== false) {
    await comparePair(
      '__full-page__',
      path.join(referenceDir, 'full-page.png'),
      path.join(candidateDir, 'full-page.png'),
      path.join(comparisonDir, 'full-page.diff.png'),
    );
  }

  for (const target of pageConfig.targets) {
    if (target.screenshot === false) continue;
    const filename = `${sanitize(target.id)}.png`;
    await comparePair(
      target.id,
      path.join(referenceDir, 'targets', filename),
      path.join(candidateDir, 'targets', filename),
      path.join(comparisonDir, 'targets', `${sanitize(target.id)}.diff.png`),
    );
  }

  await context.close();
  return pixelDiffs;
}

function diffPriority(diff) {
  const property = diff.property ?? '';
  if (/font-family|font-size|font-weight|line-height|letter-spacing/.test(property)) return 1;
  if (/display|position|width|height|max-width|min-width|align-items|justify-content/.test(property)) return 2;
  if (/padding|gap|margin/.test(property) || diff.axis) return 3;
  if (/x|y/.test(property)) return 4;
  return 5;
}

function sortDiffs(diffs) {
  return [...diffs].sort((left, right) => {
    const priority = diffPriority(left) - diffPriority(right);
    if (priority !== 0) return priority;
    return String(left.target).localeCompare(String(right.target));
  });
}

function makeMarkdownReport(report) {
  const lines = [
    '# Visual Audit Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Result sets: ${report.summary.resultSets}`,
    `- Passed: ${report.summary.passed}`,
    `- Failed: ${report.summary.failed}`,
    `- Blocking differences: ${report.summary.blockingDifferences}`,
    '',
  ];

  for (const result of report.results) {
    lines.push(`## ${result.pageId} / ${result.viewport.name}`);
    lines.push('');
    lines.push(`Status: **${result.status.toUpperCase()}**`);
    lines.push('');
    lines.push(`- Selector issues: ${result.selectorIssues.length}`);
    lines.push(`- Typography/style differences: ${result.styleDiffs.length}`);
    lines.push(`- Geometry differences: ${result.geometryDiffs.length}`);
    lines.push(`- Explicit gap differences: ${result.gapDiffs.length}`);
    lines.push(`- Failing pixel comparisons: ${result.pixelDiffs.filter((item) => item.passed === false || item.issue).length}`);
    lines.push('');

    if (result.selectorIssues.length > 0) {
      lines.push('### Selector issues');
      lines.push('');
      lines.push('| Target | Side | Count | Issue | Selector |');
      lines.push('|---|---:|---:|---|---|');
      for (const issue of result.selectorIssues) {
        lines.push(`| ${issue.target} | ${issue.side} | ${issue.count} | ${issue.issue} | \`${issue.selector}\` |`);
      }
      lines.push('');
    }

    const combined = sortDiffs([
      ...result.styleDiffs.map((item) => ({ ...item, kind: 'style' })),
      ...result.geometryDiffs.map((item) => ({ ...item, kind: 'geometry' })),
      ...result.gapDiffs.map((item) => ({ ...item, kind: 'gap' })),
    ]);

    if (combined.length > 0) {
      lines.push('### Highest-priority numeric differences');
      lines.push('');
      lines.push('| Kind | Target | Property | Expected | Actual | Delta |');
      lines.push('|---|---|---|---:|---:|---:|');
      for (const diff of combined.slice(0, 80)) {
        const property = diff.property ?? diff.axis ?? diff.issue ?? '';
        lines.push(`| ${diff.kind} | ${diff.target} | ${property} | ${String(diff.expected ?? '')} | ${String(diff.actual ?? '')} | ${String(diff.delta ?? '')} |`);
      }
      if (combined.length > 80) {
        lines.push('');
        lines.push(`_Only the first 80 of ${combined.length} numeric differences are shown. Read report.json for all details._`);
      }
      lines.push('');
    }

    if (result.pixelDiffs.length > 0) {
      lines.push('### Pixel comparisons');
      lines.push('');
      lines.push('| Target | Diff pixels | Diff ratio | Threshold | Result |');
      lines.push('|---|---:|---:|---:|---|');
      for (const pixel of result.pixelDiffs) {
        const status = pixel.ignored ? 'ignored' : pixel.issue ? pixel.issue : pixel.passed ? 'pass' : 'fail';
        lines.push(`| ${pixel.target} | ${pixel.diffPixels ?? ''} | ${pixel.diffPixelRatio ?? ''} | ${pixel.threshold ?? ''} | ${status} |`);
      }
      lines.push('');
    }
  }

  return `${lines.join('\n')}\n`;
}

async function loadCapture(outputDir, pageId, viewportName, side) {
  const filePath = path.join(captureDirectory(outputDir, pageId, viewportName, side), 'measurements.json');
  return readJson(filePath);
}

async function compareOne({ browser, config, pageConfig, viewport, outputDir }) {
  const [referenceCapture, candidateCapture] = await Promise.all([
    loadCapture(outputDir, pageConfig.id, viewport.name, 'reference'),
    loadCapture(outputDir, pageConfig.id, viewport.name, 'candidate'),
  ]);

  const tolerances = { ...DEFAULT_TOLERANCES, ...(config.tolerances ?? {}) };
  const numeric = compareMeasurements(referenceCapture, candidateCapture, pageConfig, tolerances);
  const pixelDiffs = await comparePixels({ browser, outputDir, pageConfig, viewport, tolerances });

  const blockingDifferences =
    numeric.selectorIssues.length +
    numeric.styleDiffs.length +
    numeric.geometryDiffs.length +
    numeric.gapDiffs.length +
    pixelDiffs.filter((item) => item.issue || item.passed === false).length;

  const result = {
    pageId: pageConfig.id,
    viewport,
    status: blockingDifferences === 0 ? 'passed' : 'failed',
    blockingDifferences,
    ...numeric,
    pixelDiffs,
  };

  await writeJson(
    path.join(comparisonDirectory(outputDir, pageConfig.id, viewport.name), 'comparison.json'),
    result,
  );
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return 0;
  }

  const configPath = path.resolve(process.cwd(), args.config);
  const rawConfig = await readJson(configPath);
  const config = {
    ...rawConfig,
    navigationTimeoutMs: rawConfig.navigationTimeoutMs ?? 30000,
    settleTimeMs: rawConfig.settleTimeMs ?? 150,
    stableCss: rawConfig.stableCss ?? '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
  };
  validateConfig(config);
  const { pages, viewports } = selectWork(config, args);
  const outputDir = path.resolve(process.cwd(), config.outputDir ?? '.visual-audit/artifacts');
  await fs.mkdir(outputDir, { recursive: true });

  const playwright = await loadPlaywright();
  const executablePath = config.executablePath ?? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const browser = await playwright.chromium.launch({
    headless: !args.headed,
    ...(executablePath ? { executablePath } : {}),
  });
  const results = [];

  try {
    if (args.mode === 'all' || args.mode === 'reference' || args.mode === 'candidate') {
      const sides = args.mode === 'all' ? ['reference', 'candidate'] : [args.mode];
      for (const pageConfig of pages) {
        for (const viewport of viewports) {
          for (const side of sides) {
            console.error(`[capture] ${pageConfig.id}/${viewport.name}/${side}`);
            await captureSide({
              browser,
              config,
              pageConfig,
              viewport,
              side,
              outputDir,
              headed: args.headed,
            });
          }
        }
      }
    }

    if (args.mode === 'all' || args.mode === 'compare') {
      for (const pageConfig of pages) {
        for (const viewport of viewports) {
          console.error(`[compare] ${pageConfig.id}/${viewport.name}`);
          results.push(await compareOne({
            browser,
            config,
            pageConfig,
            viewport,
            outputDir,
          }));
        }
      }

      const report = {
        generatedAt: new Date().toISOString(),
        configPath,
        outputDir,
        summary: {
          resultSets: results.length,
          passed: results.filter((result) => result.status === 'passed').length,
          failed: results.filter((result) => result.status === 'failed').length,
          blockingDifferences: results.reduce((sum, result) => sum + result.blockingDifferences, 0),
        },
        results,
      };
      await writeJson(path.join(outputDir, 'report.json'), report);
      await fs.writeFile(path.join(outputDir, 'report.md'), makeMarkdownReport(report), 'utf8');

      console.log(JSON.stringify(report.summary));
      const failOnDiff = args.failOnDiffOverride ?? config.failOnDiff ?? true;
      if (failOnDiff && report.summary.blockingDifferences > 0) {
        return 2;
      }
    }

    return 0;
  } finally {
    await browser.close();
  }
}

main()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error) => {
    console.error(`[visual-audit] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
