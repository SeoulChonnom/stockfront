---
name: pixel-perfect-react-ui
description: Reproduce or improve an existing React UI from reference HTML or a rendered reference page, then verify visual fidelity with Playwright screenshots, computed styles, element geometry, and spacing measurements. Use this skill whenever a user asks to match, port, redesign, restyle, or visually compare a React page against HTML, a design prototype, or another web implementation—especially when prior attempts missed fonts, margins, padding, gaps, sizing, alignment, or responsive behavior. Do not use it for open-ended visual ideation when there is no reference implementation to match.
---

# Pixel-Perfect React UI

Make the React implementation measurably match the reference. Treat screenshots as evidence, not as the only source of truth.

## Core rules

- Preserve application behavior, routing, accessibility, and data flow unless the user explicitly asks to change them.
- Establish a reproducible baseline before broad styling changes.
- Compare rendered values from the browser: computed styles, bounding rectangles, actual element-to-element gaps, and screenshots.
- Work section by section. Do not attempt a full-page visual rewrite in one uncontrolled pass.
- Fix shared causes before local symptoms: fonts and reset, page container, parent layout, dimensions, spacing, then decoration.
- Never make the candidate the new baseline merely to make a failing comparison pass.
- Do not use arbitrary child margins, excessive absolute positioning, transforms, or screenshot overlays to fake alignment.
- Do not stop after one visually plausible render. Repeat measurement, correction, and verification until the defined gates pass or a concrete blocker is documented.

## Required inputs

Resolve these from the request and repository whenever possible:

- Reference HTML file or reference page URL
- Candidate React page URL or route
- Commands needed to run the reference and candidate pages
- Required viewports and responsive states
- Dynamic states that must be captured, such as an open menu or modal

When details are missing, inspect the repository and choose conservative defaults. Use desktop `1440x1200` and mobile `390x844` unless the reference clearly targets different dimensions.

## Workflow

### 1. Inspect before editing

1. Find the React entry points, route, layout, component boundaries, styling approach, design tokens, reset styles, and font loading.
2. Determine how to start the app and whether Playwright is already configured.
3. Inspect the reference HTML and its linked CSS, fonts, images, SVGs, media queries, and JavaScript-driven states.
4. Identify the smallest set of files that should change. Avoid unrelated refactors.

### 2. Create the visual audit configuration

Copy `assets/visual-audit.config.example.json` into the project, normally as `.visual-audit/config.json`, and adapt it.

Read `references/config.md` when creating or changing the configuration.

Define stable selector pairs for every visually important region. Prefer `data-visual-id` or `data-testid` in the candidate. Use selectors that identify exactly one element.

At minimum, map:

- Page/root container
- Header or top navigation
- Main content container
- Each major section/card
- Primary headings and supporting text
- Important controls and repeated item containers

Define explicit gap measurements for relationships that are easy to miss, such as heading-to-description, card-to-card, label-to-input, and section-to-section spacing.

### 3. Capture the baseline

Run:

```bash
node <skill-directory>/scripts/visual-audit.mjs \
  --config .visual-audit/config.json \
  --mode all
```

The script captures both pages at every configured viewport and writes:

- Full-page screenshots
- Element screenshots
- Computed style and geometry JSON
- Pixel-diff images
- Machine-readable JSON report
- Human-readable Markdown report

If Playwright is unavailable, use the repository package manager to add it as a development dependency or reuse an installed `@playwright/test` package. Install the configured Chromium browser when required.

Do not edit the React UI until the reference baseline and selector mapping are valid. Fix missing, ambiguous, or unstable selectors first.

### 4. Establish foundations first

Correct these in order:

1. Font files, font-family, weight availability, font rendering, and global reset
2. Root background, box sizing, page width, max-width, and outer padding
3. Major flex/grid structure and responsive breakpoints
4. Typography: font size, weight, line-height, letter spacing, and wrapping
5. Component width, height, min/max constraints, and alignment
6. Parent padding and `gap`
7. Child margins only when the reference truly uses them
8. Borders, radius, shadows, colors, icons, and decorative details

Wait for `document.fonts.ready` during verification. A font mismatch invalidates downstream spacing conclusions.

### 5. Implement one section at a time

Choose the highest-level failing section that has a stable selector. For each iteration:

1. Read the latest report.
2. Identify whether several descendants move in the same direction.
3. If they do, inspect the nearest common parent before editing children.
4. Make the smallest coherent change.
5. Re-run the audit for the relevant page and viewport.
6. Confirm that the targeted difference improved without regressing already-passing regions.

Prefer this correction order inside a section:

- Parent display, flow, width, and alignment
- Parent padding and gap
- Child intrinsic dimensions
- Typography and wrapping
- Local margins
- Decoration

### 6. Use both numeric and image evidence

Treat numeric differences as the primary diagnostic evidence:

- `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`
- `x`, `y`, `width`, `height`
- Padding, margin, row-gap, and column-gap
- Actual rendered distance between mapped elements
- Background, color, border, radius, and shadow

Use screenshot and pixel diff to catch effects not represented well by individual CSS properties, including antialiasing, gradients, shadows, SVG rendering, clipping, and stacking.

Do not accept a result merely because the full-page screenshot appears close. Large parent offsets can hide multiple local errors, and compensating errors can make a screenshot look correct at only one viewport.

### 7. Verify responsive and interactive states

After static desktop sections pass:

1. Verify every configured viewport.
2. Check wrapping, overflow, scrollbars, sticky/fixed elements, and collapsed navigation.
3. Capture required interactive states with stable setup steps in the application or test fixture.
4. Confirm keyboard focus and semantic controls still work after styling changes.

Do not infer a completely new mobile design from a desktop-only reference. Preserve existing responsive behavior and document any unavoidable interpretation.

### 8. Apply quality gates

A section passes only when:

- Required selectors exist exactly once on both pages.
- Required fonts are loaded and computed typography matches.
- Important geometry and explicit gap differences are within configured tolerances.
- Pixel difference is within the configured threshold or the remaining difference is explained and approved.
- No previously passing section regresses.
- The candidate still builds and relevant functional tests pass.

A page is complete only after component/section checks and full-page checks pass at all required viewports.

### 9. Report completion

Summarize:

- Files changed
- Viewports and states verified
- Final numeric and pixel-diff results
- Functional tests run
- Any remaining known differences and their concrete causes

Do not claim pixel-perfect completion when the report still contains unexplained blocking differences.

## Script usage

```bash
# Capture and compare everything
node <skill-directory>/scripts/visual-audit.mjs --config .visual-audit/config.json --mode all

# Capture reference only
node <skill-directory>/scripts/visual-audit.mjs --config .visual-audit/config.json --mode reference

# Capture candidate only
node <skill-directory>/scripts/visual-audit.mjs --config .visual-audit/config.json --mode candidate

# Compare existing captures without reopening browsers
node <skill-directory>/scripts/visual-audit.mjs --config .visual-audit/config.json --mode compare

# Limit work during an iteration
node <skill-directory>/scripts/visual-audit.mjs \
  --config .visual-audit/config.json \
  --mode all \
  --page profile \
  --viewport desktop

# Inspect differences without returning a failing exit code
node <skill-directory>/scripts/visual-audit.mjs \
  --config .visual-audit/config.json \
  --mode all \
  --no-fail-on-diff
```

## Failure handling

- If a selector is missing or matches multiple elements, repair the mapping instead of weakening the check.
- If local `file://` loading breaks assets, serve the reference directory through a local HTTP server and update `referenceUrl`.
- If authentication blocks the candidate, use an existing test login fixture or configured storage state. Do not bypass application security.
- If text rendering differs across machines, run reference and candidate captures in the same Playwright browser and environment. Keep typography checks exact while allowing a narrowly justified pixel threshold.
- If a visual effect is intentionally different, record the exception in the configuration with a reason; do not silently increase global tolerances.
