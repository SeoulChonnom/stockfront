import { useSyncExternalStore } from 'react';

/** ≤640px 여부. Tailwind의 sm 브레이크포인트와 같은 값을 쓴다. */
const QUERY = '(max-width: 640px)';

function getMediaQueryList(): MediaQueryList | null {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return null;
  }

  return window.matchMedia(QUERY);
}

function subscribe(onChange: () => void): () => void {
  const list = getMediaQueryList();

  if (!list) {
    return () => undefined;
  }

  list.addEventListener('change', onChange);

  return () => {
    list.removeEventListener('change', onChange);
  };
}

function getSnapshot(): boolean {
  return getMediaQueryList()?.matches ?? false;
}

export function useNarrowViewport(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
