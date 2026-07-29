import { useState } from 'react';

/**
 * Retains the last non-null value passed in, across renders where the
 * current value goes back to `undefined`. Used by `archive-search-page.tsx`
 * to keep the previous successful `ArchiveListView` on screen while a new
 * filter/page query is loading or has errored (§8 "refetching(이전 결과
 * 유지)" / "error(...필터와 이전 결과 유지)") — see that file's comment for
 * why this can't be done via `useArchiveList`'s own TanStack Query options
 * instead.
 *
 * Implemented as the "adjust state during render" pattern (React docs; the
 * same pattern this repo's `AnnounceProvider` already uses for its
 * route-key reset) rather than a `useRef` — reading `ref.current` during
 * render is flagged by this repo's `react-hooks/refs` lint rule (and is a
 * real correctness hazard under concurrent rendering), so state is the
 * value actually read here.
 */
export function useLastGoodData<T>(value: T | undefined): T | null {
  const [lastGood, setLastGood] = useState<T | null>(value ?? null);

  if (value !== undefined && value !== lastGood) {
    setLastGood(value);
  }

  return value !== undefined ? value : lastGood;
}
