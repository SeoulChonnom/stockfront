/**
 * Shared computed-style property list for Deliverable 4 (the numeric
 * ground truth). Both the design capture script and the app Playwright spec
 * import this so `styles-design.json` and `styles-app.json` always compare
 * apples to apples.
 */
export const STYLE_PROPERTIES = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'color',
  'backgroundColor',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'gap',
  'rowGap',
  'columnGap',
  'borderRadius',
  'borderTopWidth',
  'borderLeftWidth',
  'borderColor',
  'display',
  'flexDirection',
  'gridTemplateColumns',
  'width',
  'height',
  'textTransform',
];

/** Properties for which a numeric delta is meaningful (length-valued). */
export const LENGTH_PROPERTIES = new Set([
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'gap',
  'rowGap',
  'columnGap',
  'borderRadius',
  'borderTopWidth',
  'borderLeftWidth',
  'width',
  'height',
]);

/** Design's layout custom properties, read off `[data-app]`. */
export const DESIGN_TOKENS = ['--pad', '--gap', '--maxw', '--h1', '--lead', '--shell'];

/** App's layout + type-scale custom properties, read off `:root`. */
export const APP_TOKENS = [
  '--pad',
  '--gap',
  '--fs-display',
  '--fs-h1',
  '--fs-h2',
  '--fs-h3',
  '--fs-lead',
  '--fs-body',
  '--fs-sm',
  '--fs-label',
];

/**
 * Extracts computed style + bounding box for one element handle, browser-side.
 * Call via `page.evaluate(extractElementStyleSource, propNames)` — kept as a
 * plain function (not a closure) so it can be serialized across the
 * Playwright evaluate boundary from either capture script.
 */
export function extractComputedStyleInPage(el, propNames) {
  const cs = window.getComputedStyle(el);
  const out = {};
  for (const prop of propNames) {
    out[prop] = cs[prop];
  }
  const rect = el.getBoundingClientRect();
  out.__rect = { width: rect.width, height: rect.height };
  return out;
}

export function extractTokensInPage(el, tokenNames) {
  const cs = window.getComputedStyle(el);
  const out = {};
  for (const name of tokenNames) {
    out[name] = cs.getPropertyValue(name).trim();
  }
  return out;
}
