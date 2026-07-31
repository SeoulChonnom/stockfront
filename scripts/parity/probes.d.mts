import type { Locator, Page } from '@playwright/test';

/**
 * Type declaration for the sibling `probes.mjs` (plain, untyped JS shared
 * verbatim between `capture-design.mjs` and `e2e/parity-capture.spec.ts` —
 * see that file's header comment). Declared here rather than adding types
 * to `probes.mjs` itself: that file is the parity capture harness, which
 * this repo's instructions say not to modify. A sibling `.d.mts` (the
 * TypeScript-recognized declaration companion for a `.mjs` module) gives
 * `eslint`'s type-aware rules (`@typescript-eslint/no-unsafe-*`) real types
 * for `probesFor`'s return value without touching the harness's runtime
 * behavior at all.
 */
export type Probe = {
  name: string;
  design: (page: Page) => Locator;
  app: (page: Page) => Locator;
  minWidth?: number;
};

export function probesFor(key: string, width: number): Probe[];
