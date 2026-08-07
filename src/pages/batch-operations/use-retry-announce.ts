import { useEffect, useRef } from 'react';

/** Announces only user-triggered refetches; initial/background fetches stay silent. */
export function useRetryAnnounce(
  isFetching: boolean,
  isError: boolean,
  onAnnounce: (message: string) => void
) {
  const pendingRef = useRef(false);

  // Keep the callback out of deps so inline callers do not re-announce on render.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `onAnnounce` intentionally excluded — see above
  useEffect(() => {
    if (isFetching || !pendingRef.current) {
      return;
    }

    pendingRef.current = false;
    onAnnounce(
      isError ? '다시 불러오지 못했습니다.' : '데이터를 다시 불러왔습니다.'
    );
  }, [isFetching, isError]);

  function retry(refetch: () => void) {
    pendingRef.current = true;
    onAnnounce('다시 불러오는 중입니다.');
    refetch();
  }

  return retry;
}
