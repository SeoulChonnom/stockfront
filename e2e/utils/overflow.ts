import type { Page } from '@playwright/test';

/**
 * At every supported width, document scrollWidth must not exceed clientWidth.
 * Intentional scoped scrolling inside data tables is allowed; document-level
 * horizontal scrolling is not.
 *
 * This module is shared by responsive E2E coverage so overflow diagnostics
 * stay consistent across specs.
 */

export type OverflowOffender = {
  /** Best-effort CSS-path-like selector (tag/id/class/:nth-of-type), capped at 6 ancestors. */
  selector: string;
  /** The offending element's own rendered width (`getBoundingClientRect().width`), rounded. */
  width: number;
  /** The offending element's `scrollWidth` (content width, may exceed `width` itself). */
  scrollWidth: number;
  /** How far past the viewport's right edge this element's box extends. */
  overflowPx: number;
  /** Best-effort selector for the offending element's parent. */
  parentSelector: string;
  /** The parent's rendered width, for comparing "child wider than parent" causes. */
  parentWidth: number;
};

type OverflowMeasurement = {
  scrollWidth: number;
  clientWidth: number;
};

export async function measureDocumentOverflow(
  page: Page
): Promise<OverflowMeasurement> {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
}

/**
 * Walks every element in the document looking for boxes whose right edge
 * extends past the viewport's client width. Elements that sit inside their
 * own horizontally-scrollable ancestor (`overflow-x: auto|scroll` — e.g.
 * `TableScrollWrapper`) are excluded because scoped table scroll is allowed;
 * only genuine document-level overflow is reported.
 */
export async function findOverflowOffenders(
  page: Page,
  limit = 6
): Promise<OverflowOffender[]> {
  return page.evaluate((maxResults) => {
    function cssPath(start: Element): string {
      const parts: string[] = [];
      let node: Element | null = start;

      while (node && parts.length < 6) {
        let selector = node.tagName.toLowerCase();

        if (node.id) {
          parts.unshift(`${selector}#${node.id}`);
          break;
        }

        const classNames = node.getAttribute('class');
        const firstClasses = classNames
          ? classNames.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.')
          : '';
        if (firstClasses) {
          selector += `.${firstClasses}`;
        }

        const parent: Element | null = node.parentElement;
        if (parent) {
          const sameTagSiblings = Array.from(parent.children).filter(
            (child) => child.tagName === node?.tagName
          );
          if (sameTagSiblings.length > 1) {
            selector += `:nth-of-type(${sameTagSiblings.indexOf(node) + 1})`;
          }
        }

        parts.unshift(selector);
        node = parent;
      }

      return parts.join(' > ');
    }

    // Starts from the PARENT, not `start` itself: a `TableScrollWrapper`
    // (`overflow-x: auto`) is only a legitimate scoped-scroll boundary if
    // its OWN box fits the viewport — if the wrapper's own rect overflows
    // (e.g. a flex/grid ancestor missing `min-width: 0` let it grow past the
    // viewport instead of shrinking it), that is a real bug and must still
    // be reported. Only genuine DESCENDANTS of a properly-sized scroll
    // container are exempt, since those legitimately scroll within it.
    function hasScrollableAncestor(start: Element): boolean {
      let node: Element | null = start.parentElement;
      while (node) {
        if (node !== document.documentElement) {
          const overflowX = getComputedStyle(node).overflowX;
          if (overflowX === 'auto' || overflowX === 'scroll') {
            return true;
          }
        }
        node = node.parentElement;
      }
      return false;
    }

    const viewportWidth = document.documentElement.clientWidth;
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>('body *')
    );
    const offenders: OverflowOffender[] = [];

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      const overflowPx = rect.right - viewportWidth;

      if (overflowPx <= 1) {
        continue;
      }

      if (hasScrollableAncestor(el)) {
        continue;
      }

      const parent = el.parentElement;
      offenders.push({
        selector: cssPath(el),
        width: Math.round(rect.width),
        scrollWidth: el.scrollWidth,
        overflowPx: Math.round(overflowPx),
        parentSelector: parent ? cssPath(parent) : '(no parent)',
        parentWidth: parent
          ? Math.round(parent.getBoundingClientRect().width)
          : 0,
      });
    }

    // `overflowPx = rect.right - viewportWidth` — since `viewportWidth` is the
    // same constant for every element in this pass, sorting by `overflowPx`
    // descending is equivalent to sorting by `rect.right` descending (the
    // worst/furthest-right offender first) without needing to carry `right`
    // as a separate field just for the sort.
    offenders.sort((a, b) => b.overflowPx - a.overflowPx);
    return offenders.slice(0, maxResults);
  }, limit);
}

function formatOffender(offender: OverflowOffender): string {
  return (
    `  - ${offender.selector}\n` +
    `      width=${offender.width}px scrollWidth=${offender.scrollWidth}px overflowPx=${offender.overflowPx}px\n` +
    `      parent: ${offender.parentSelector} (width=${offender.parentWidth}px)`
  );
}

/**
 * Asserts the document-level overflow rule and, on failure, reports which
 * element overflows (selector/width/parent width) instead of a bare
 * scrollWidth/clientWidth mismatch so a fix can be targeted precisely.
 */
export async function expectNoDocumentOverflow(
  page: Page,
  context: string
): Promise<void> {
  const { scrollWidth, clientWidth } = await measureDocumentOverflow(page);

  if (scrollWidth <= clientWidth) {
    return;
  }

  const offenders = await findOverflowOffenders(page);
  const detail =
    offenders.length > 0
      ? offenders.map(formatOffender).join('\n')
      : '  (no single element exceeds the viewport — check negative margins, letter-spacing, or a fixed min-width on a flex/grid child)';

  throw new Error(
    `[${context}] Document horizontal overflow: scrollWidth=${scrollWidth}px > clientWidth=${clientWidth}px (over by ${scrollWidth - clientWidth}px).\nTop offending elements:\n${detail}`
  );
}
