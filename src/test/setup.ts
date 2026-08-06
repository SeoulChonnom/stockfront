import '@testing-library/jest-dom/vitest';

// jsdom intentionally reports `window.scrollTo` as not implemented. The app
// calls it during route focus/scroll restoration, so provide a silent no-op
// baseline; individual tests can still replace it with `vi.spyOn` as needed.
window.scrollTo = () => undefined;
