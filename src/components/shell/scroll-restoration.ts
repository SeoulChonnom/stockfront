/**
 * Scroll-restoration store — Market Brief UI v2 (README §7-1, §9 Interaction
 * Contracts).
 *
 * "스크롤 복원은 `navigate` 직전에 현재 URL 키로 `window.scrollY`를 저장하고,
 * 복귀 시 해당 키의 값으로 되돌린다. 새 URL은 0으로 이동한다."
 *
 * This module is the single place that keeps that map. It lives outside
 * `src/lib/**` (Phase 4's file-ownership boundary keeps this agent out of
 * `src/lib/router.ts`/`app-state.ts`) but is intentionally plain, dependency
 * -free TypeScript so any screen (owned by other phases) can import it
 * alongside its own `navigate()` calls:
 *
 * ```ts
 * import { buildScrollKey, saveScrollPosition } from '@/components/shell/scroll-restoration';
 *
 * function onRowClick() {
 *   saveScrollPosition(buildScrollKey(url.pathname, url.searchParams.toString()));
 *   navigate(`/market/cluster/${id}?origin=latest`);
 * }
 * ```
 *
 * The App Shell's own nav (rail / mobile header / drawer links, see
 * `nav-list.tsx`) already calls `saveScrollPosition` before every navigation
 * it triggers, and `App.tsx` restores the scroll position (or 0 for a
 * never-visited key) after every route change. Screens only need to call
 * `saveScrollPosition` themselves for in-page navigations they own (e.g. an
 * Archive row opening a Cluster detail) — restoration on arrival is handled
 * centrally by `App.tsx`, not per-screen.
 *
 * In-memory only (module-level `Map`), matching `src/lib/router.ts`'s own
 * `lastHref`/`lastSnapshot` module state — a full page reload naturally
 * starts a fresh session, same as the router's own state does.
 */

const scrollPositions = new Map<string, number>();

/** Builds the stable key this store is addressed by: `pathname` + `search` (§7-1 — must include both, not pathname alone). */
export function buildScrollKey(pathname: string, search: string): string {
  if (search.length === 0) {
    return pathname;
  }

  return search.startsWith('?')
    ? `${pathname}${search}`
    : `${pathname}?${search}`;
}

/** Records the current scroll offset under `key`. Defaults to `window.scrollY` when `y` isn't given. */
export function saveScrollPosition(key: string, y?: number): void {
  const value = y ?? (typeof window === 'undefined' ? 0 : window.scrollY);
  scrollPositions.set(key, value);
}

/** Returns the saved offset for `key`, or `undefined` for a URL never visited before (caller should treat that as 0). */
export function getScrollPosition(key: string): number | undefined {
  return scrollPositions.get(key);
}

export function resetScrollPositionsForTesting(): void {
  scrollPositions.clear();
}
