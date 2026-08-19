import { useSyncExternalStore } from 'react';

import {
  getAuthBootstrapState,
  subscribeToAuthBootstrap,
} from './auth-bootstrap';

/**
 * 표시용 사용자 이름. 토큰 응답(`/api/user/token`)의 `name` 필드에서 온다.
 *
 * `capabilities.ts`와 나눠 둔다 — 저쪽은 "이 사람이 무엇을 할 수 있는가"이고
 * 여기는 "이 사람이 누구인가"다. 둘을 한 훅에 묶으면 권한 검사 때문에 이름이
 * 리렌더를 타거나 그 반대가 된다.
 *
 * **없으면 `null`이다.** 로그인 전(`idle`/`loading`), 개발 우회(`bypassed` —
 * 토큰 자체가 없다), 그리고 백엔드가 `name`을 비워 보낸 경우가 모두 여기에
 * 해당한다. 그때 화면은 이름 줄을 지운다. 예전에는 셸 두 곳이 `ops.analyst`
 * 라는 리터럴을 박아 두어, 실제로 누가 로그인했든 모든 사용자가 같은 이름을
 * 봤다 — 바로 옆 역할 라벨은 진짜 값이라 더 그럴듯하게 읽혔다. 자리표시자를
 * 다시 만드느니 줄을 비우는 쪽이 정직하다.
 */
export function useAuthUserName(): string | null {
  return useSyncExternalStore(
    subscribeToAuthBootstrap,
    getAuthUserName,
    getAuthUserName
  );
}

function getAuthUserName(): string | null {
  return getAuthBootstrapState().name;
}
