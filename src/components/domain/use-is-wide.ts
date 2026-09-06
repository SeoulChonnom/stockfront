import { useSyncExternalStore } from 'react';

/**
 * 필드 그리드가 2열로 펴지는 지점과 같은 값이다(`min-[641px]:grid-cols-2`).
 * 한 화면에 두 개의 반응형 경계를 두지 않는다 — 필터가 접히는 폭과 필드가
 * 한 줄로 서는 폭이 어긋나면, 그 사이 구간에서 "펼쳤는데 여전히 1열"이라는
 * 어중간한 상태가 생긴다.
 */
const WIDE_QUERY = '(min-width: 641px)';

function subscribeToWide(onChange: () => void) {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return () => {
      // No matchMedia (jsdom): nothing to unsubscribe from.
    };
  }

  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * `matchMedia`가 없으면 **넓은 화면으로 친다.** jsdom 단위 테스트가 그
 * 경우인데, 여기서 `false`를 돌려주면 필드가 접힌 채 렌더되어 필터를 다루는
 * 모든 테스트가 화면에 없는 입력을 찾게 된다. 기능을 감추는 쪽보다 드러내는
 * 쪽이 안전한 기본값이다 — `theme.ts`가 `matchMedia` 부재 시 라이트로
 * 떨어지는 것과 같은 판단이다.
 */
function getIsWide() {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return true;
  }

  return window.matchMedia(WIDE_QUERY).matches;
}

/** 641px 이상인지 여부. 이 화면이 쓰는 유일한 반응형 경계다 — 두 번째를 만들지 않는다. */
export function useIsWide(): boolean {
  return useSyncExternalStore(subscribeToWide, getIsWide, getIsWide);
}
