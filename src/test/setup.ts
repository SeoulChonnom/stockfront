import '@testing-library/jest-dom/vitest';

// jsdom intentionally reports `window.scrollTo` as not implemented. The app
// calls it during route focus/scroll restoration, so provide a silent no-op
// baseline; individual tests can still replace it with `vi.spyOn` as needed.
window.scrollTo = () => undefined;

// jsdom implements no scrolling, so `Element.scrollIntoView` is absent. The
// market page calls it to move to a `?market=` section. Anchor scrolling is
// verified in Playwright, where layout is real; here a no-op just keeps the
// effect from throwing.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

// jsdom ships no `ResizeObserver`. `TableScrollWrapper` uses one to decide
// whether its table actually scrolls (and therefore whether it needs a tab
// stop and edge fades). jsdom also reports every box as 0x0, so a real
// implementation would measure nothing useful here anyway — the scroll
// affordance is covered by Playwright, where layout is real. This stub only
// keeps the effect from throwing on mount.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {
      return undefined;
    }
    unobserve() {
      return undefined;
    }
    disconnect() {
      return undefined;
    }
  };
}
