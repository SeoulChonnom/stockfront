# Visual audit configuration

Read this file when creating or adapting `.visual-audit/config.json`.

## Top-level fields

- `outputDir`: Artifact directory relative to the current working directory.
- `failOnDiff`: Exit with code `2` when blocking differences remain. Default: `true`.
- `navigationTimeoutMs`: Browser navigation and selector timeout.
- `settleTimeMs`: Extra wait after network/font readiness.
- `stableCss`: CSS injected into both pages to disable unstable rendering.
- `styleProperties`: Computed CSS properties collected for mapped targets.
- `tolerances`: Numeric and pixel comparison thresholds.
- `viewports`: Named browser viewport definitions.
- `pages`: Reference/candidate page pairs.

## URLs

`referenceUrl` and `candidateUrl` accept:

- `http://` or `https://` URLs
- Absolute `file://` URLs
- Local HTML paths such as `./design/reference.html`; the script reads the file and injects a base URL before rendering it.
- `data:text/html` URLs for isolated fixtures.

Prefer a local HTTP server when the reference uses JavaScript modules, fetch requests, or external assets that cannot load from an injected local base URL.

## Viewports

Each viewport requires:

```json
{
  "name": "desktop",
  "width": 1440,
  "height": 1200,
  "deviceScaleFactor": 1
}
```

Keep `deviceScaleFactor` identical for reference and candidate. Use the exact design viewport when known.

## Page fields

Required:

- `id`: Stable artifact name.
- `referenceUrl`
- `candidateUrl`
- `targets`

Optional:

- `referenceReadySelector`, `candidateReadySelector`
- `fullPageScreenshot`: Default `true`.
- `maskSelectors.reference`, `maskSelectors.candidate`: Dynamic elements painted as masks in screenshots. This is a screenshot-time paint overlay only — it runs after measurement and does not remove the element from layout, so it cannot correct `y`/gap contamination from reference-only chrome that still occupies flow.
- `layoutHideSelectors.reference`, `layoutHideSelectors.candidate`: Elements force-set to `display:none` (real layout removal) before both measurement and screenshot. Use this — not `maskSelectors` — when a reference-only (or candidate-only) element occupies vertical space that has no counterpart on the other side, so every downstream `y` and full-page pixel comparison stops being contaminated by its offset.
- `gaps`: Explicit distances between mapped targets.
- `ignore`: Per-page accepted exceptions.
- `storageState`: Playwright storage-state JSON path for the candidate context.
- `extraHttpHeaders`: Headers applied to the candidate context.
- `executablePath` (top level): Optional Chromium executable path. The `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` environment variable is also supported.

## Targets

```json
{
  "id": "profile-title",
  "reference": ".profile-header h1",
  "candidate": "[data-visual-id='profile-title']",
  "parentId": "profile-header",
  "screenshot": true,
  "styleProperties": ["font-family", "font-size", "line-height"]
}
```

Rules:

- Both selectors must resolve to exactly one element.
- `parentId` improves report grouping and root-cause prioritization.
- `screenshot` defaults to `true`.
- `styleProperties` overrides the global property list for that target.
- Prefer stable attributes over generated class names or `nth-child` selectors.

## Gap definitions

```json
{
  "id": "title-to-description",
  "from": "profile-title",
  "to": "profile-description",
  "axis": "vertical"
}
```

Supported axes:

- `vertical`: `to.top - from.bottom`
- `horizontal`: `to.left - from.right`
- `x`: `to.left - from.left`
- `y`: `to.top - from.top`

Use explicit gaps for relationships where the visible spacing may originate from parent `gap`, padding, line-height, or margins.

## Tolerances

```json
{
  "positionPx": 1,
  "sizePx": 1,
  "spacingPx": 1,
  "pixelChannelThreshold": 0.1,
  "maxDiffPixelRatio": 0.002
}
```

- `pixelChannelThreshold` is the normalized per-channel threshold from `0` to `1`.
- `maxDiffPixelRatio` is the maximum changed-pixel ratio.
- Keep typography style values exact. Do not compensate for font mismatches by increasing pixel tolerances.

## Accepted exceptions

Use `ignore` only for known intentional differences. Keep each exception narrow and explain it.

```json
{
  "ignore": [
    {
      "target": "avatar",
      "kind": "style",
      "property": "background-image",
      "reason": "User-specific image differs between fixtures"
    },
    {
      "target": "page",
      "kind": "pixel",
      "reason": "Reference contains a nondeterministic canvas"
    }
  ]
}
```

Supported kinds are `style`, `geometry`, `gap`, and `pixel`. Omit `property` to ignore all differences of that kind for the target.
