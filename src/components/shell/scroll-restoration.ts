/** In-memory scroll positions keyed by pathname + search; save before navigate and restore on arrival. */

const scrollPositions = new Map<string, number>();

/** Builds the stable pathname + search key. */
export function buildScrollKey(pathname: string, search: string): string {
  if (search.length === 0) {
    return pathname;
  }

  return search.startsWith('?')
    ? `${pathname}${search}`
    : `${pathname}?${search}`;
}

/** Records the current offset (or the supplied value) under `key`. */
export function saveScrollPosition(key: string, y?: number): void {
  const value = y ?? (typeof window === 'undefined' ? 0 : window.scrollY);
  scrollPositions.set(key, value);
}

/** Returns a saved offset, or `undefined` for a new URL. */
export function getScrollPosition(key: string): number | undefined {
  return scrollPositions.get(key);
}

export function resetScrollPositionsForTesting(): void {
  scrollPositions.clear();
}
