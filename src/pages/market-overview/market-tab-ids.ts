/**
 * `MarketTabs`/`MarketSection` shared id builders. Kept in their own module
 * (not exported from `market-tabs.tsx`) so that component module only ever
 * exports the `MarketTabs` component — Biome's
 * `lint/style/useComponentExportOnlyModules` forbids mixing plain-function
 * exports into a component module.
 */

export function marketTabId(index: number): string {
  return `market-tab-${index}`;
}

export function marketPanelId(index: number): string {
  return `market-panel-${index}`;
}
