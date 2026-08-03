import { useEffect, useRef } from 'react';

/**
 * README §8 "retrying" contract, used independently by the list and detail
 * regions of `/ops/batches` (§7-6 point 5: their loading/error states don't
 * share state). A manual retry announces "다시 불러오는 중입니다."
 * immediately, then — once that retry's fetch settles — "데이터를 다시
 * 불러왔습니다." on success or a failure announcement on error.
 *
 * `pendingRef` only flips true inside `retry()` itself, so the region's
 * ordinary initial load (which also transitions `isFetching` true→false)
 * never fires a spurious "다시 불러왔습니다." — only a fetch the user
 * actually triggered via the retry button does.
 */
export function useRetryAnnounce(
  isFetching: boolean,
  isError: boolean,
  onAnnounce: (message: string) => void
) {
  const pendingRef = useRef(false);

  // `onAnnounce` is deliberately excluded from the deps below: callers pass an
  // inline closure, so including it would re-run the effect on every render and
  // re-announce spuriously. It must fire only on an isFetching/isError change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `onAnnounce` intentionally excluded — see above
  useEffect(() => {
    if (isFetching || !pendingRef.current) {
      return;
    }

    pendingRef.current = false;
    onAnnounce(
      isError ? '다시 불러오지 못했습니다.' : '데이터를 다시 불러왔습니다.'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetching, isError]);

  function retry(refetch: () => void) {
    pendingRef.current = true;
    onAnnounce('다시 불러오는 중입니다.');
    refetch();
  }

  return retry;
}
