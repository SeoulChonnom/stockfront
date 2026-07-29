/**
 * Role / capability gating — Market Brief UI v2 (README §10, §14 D-01).
 *
 * 이 파일은 프런트엔드 role/capability 판단의 단일 지점(single source of
 * truth)이다. 여기서 하는 판단은 UX 장치(affordance)일 뿐 보안 경계가
 * 아니다 — 운영 메뉴를 감추거나 버튼을 비활성화해도 서버가 `/ops/*` 조회와
 * 배치 실행(trigger) 권한을 강제하지 않으면 누구든 API를 직접 호출해
 * 우회할 수 있다. 실제 접근 제어는 반드시 백엔드가 수행해야 한다.
 *
 * 현재 저장소에는 역할을 알려주는 백엔드 계약이 없다(JWT claim도, 권한
 * API도 없음 — README §14 D-01). 실제 역할 출처가 생기면 이 파일의
 * `getRole()` 구현부만 교체하면 된다(다른 파일은 `can`/`useRole`/
 * `useCapabilities`를 통해서만 역할을 소비하므로 교체 지점이 하나로
 * 고정된다).
 */

import { useMemo, useSyncExternalStore } from 'react';

import {
  getAuthBootstrapState,
  subscribeToAuthBootstrap,
} from './auth-bootstrap';
import { isDevelopmentBypassEnabled } from './auth-config';

export type Role = 'viewer' | 'operator';

export type Capability =
  | 'ops.view'
  | 'ops.trigger'
  | 'ops.viewLogs'
  | 'ops.advancedTriggerOptions';

type Listener = () => void;

const listeners = new Set<Listener>();

let roleOverride: Role | null = null;

/**
 * override도, auth-bootstrap이 파싱한 실제 역할도 없을 때의 최종 폴백.
 *
 * **폴백을 'operator'로 두는 이유 (변경 시 반드시 재검토할 것)**:
 * 현재 백엔드는 `/api/users/token` 응답에 역할을 아직 내려주지 않는다
 * (docs/design_v2/v2-backend-requests.md P-01). 그리고 오늘 시점에는
 * 이 앱을 쓰는 모든 사용자가 이미 `/ops/batches`에 대한 전체 접근 권한을
 * 갖고 있다 — 즉 "역할 개념 자체가 아직 실재하지 않는" 상태다. 이런
 * 상태에서 폴백을 'viewer'로 두면, 실제로는 운영자인 사용자의 배치
 * 운영·수동 실행 접근을 UI 리뉴얼이라는 **사이드이펙트로 조용히
 * 제거하는 기능 회귀**를 프로덕션에 배포하는 셈이 된다(아무도 role을
 * 바꾸거나 요청한 적이 없는데 접근이 사라짐). 'operator'를 폴백으로
 * 두면 오늘의 동작을 정확히 그대로 유지하고, 백엔드가 role을 보내주기
 * 시작하는 순간 이 파일의 변경 없이 실제 게이팅이 자동으로 시작된다
 * (auth-bootstrap.ts가 파싱한 role이 이 폴백보다 먼저 소비되므로).
 *
 * 개발 빌드(`VITE_APP_ENV=development`)에서도 결과적으로 동일하게
 * 'operator'다 — 로컬에서 override 없이 Operator 화면을 바로 볼 수
 * 있게 하려는 README §5 "(개발 빌드에서만) 상태 시뮬레이터"와 같은
 * 의도이며, 최종 폴백과 값이 같아졌을 뿐 별개의 이유로 남겨둔다.
 *
 * **다시 한번 명시**: 이 판단은 UX 장치(affordance)일 뿐 보안 경계가
 * 아니다. 서버가 `/ops/*` 조회와 배치 실행(trigger) 권한을 강제하지
 * 않으면 누구든 API를 직접 호출해 우회할 수 있다 — 실제 접근 제어는
 * 반드시 백엔드가 수행해야 한다.
 */
function getDefaultRole(): Role {
  if (isDevelopmentBypassEnabled()) {
    // 개발 빌드 기본값. README §5의 "(개발 빌드에서만) 상태 시뮬레이터"와
    // 같은 의도 — 로컬 개발 중 override 없이 Operator 화면을 바로 볼 수
    // 있게 한다. 아래 최종 폴백과 오늘은 같은 값('operator')으로
    // 수렴하지만, 개발 환경 기본값과 프로덕션 최종 폴백은 서로 다른
    // 이유로 결정되는 별개의 값이므로 분기를 유지한다.
    return 'operator';
  }

  // 최종 폴백. 위 `getRole()`/파일 상단 주석의 사유를 그대로 따른다.
  return 'operator';
}

function notifyListeners(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

/**
 * 테스트 및 (향후) 실제 역할 소스 연동을 위한 override 지점.
 * `null`을 넘기면 override를 해제하고 `getDefaultRole()`로 되돌아간다.
 */
export function setRoleOverride(role: Role | null): void {
  if (roleOverride === role) {
    return;
  }

  roleOverride = role;
  notifyListeners();
}

export function resetRoleOverrideForTesting(): void {
  setRoleOverride(null);
}

/**
 * 현재 역할을 읽는 단일 지점. 우선순위:
 *   1. `setRoleOverride()`로 설정된 명시적 override(테스트, DEV 역할
 *      시뮬레이터) — 최우선.
 *   2. auth-bootstrap이 토큰 응답에서 파싱한 실제 역할(있을 때만) — 백엔드가
 *      role을 보내주기 시작하는 순간부터 여기서 잡힌다(P-01).
 *   3~4. `getDefaultRole()` 폴백(개발 기본값 / 최종 폴백 — 위 주석 참고).
 */
export function getRole(): Role {
  if (roleOverride) {
    return roleOverride;
  }

  const bootstrapRole = getAuthBootstrapState().role;

  if (bootstrapRole) {
    return bootstrapRole;
  }

  return getDefaultRole();
}

function subscribeToOverrideStore(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * override 저장소와 auth-bootstrap 저장소를 함께 구독한다 — 둘 중 하나만
 * 바뀌어도 `useRole()`/`useCapabilities()`가 리렌더되어야 하기 때문이다
 * (예: 로그인 완료로 실제 role이 도착하는 시점).
 */
function subscribeRole(listener: Listener): () => void {
  const unsubscribeOverride = subscribeToOverrideStore(listener);
  const unsubscribeBootstrap = subscribeToAuthBootstrap(listener);

  return () => {
    unsubscribeOverride();
    unsubscribeBootstrap();
  };
}

/** 역할이 바뀌면 리렌더되는 훅. `useSyncExternalStore`로 auth-bootstrap과 동일한 구독 패턴을 따른다. */
export function useRole(): Role {
  return useSyncExternalStore(subscribeRole, getRole, getRole);
}

const CAPABILITIES_BY_ROLE: Readonly<Record<Role, ReadonlySet<Capability>>> =
  Object.freeze({
    viewer: new Set<Capability>(),
    operator: new Set<Capability>([
      'ops.view',
      'ops.trigger',
      'ops.viewLogs',
      'ops.advancedTriggerOptions',
    ]),
  });

/** README §10 Role/Capability Map의 판정 함수. role 생략 시 현재 역할을 사용한다. */
export function can(capability: Capability, role: Role = getRole()): boolean {
  return CAPABILITIES_BY_ROLE[role].has(capability);
}

export type Capabilities = Readonly<{
  role: Role;
  can: (capability: Capability) => boolean;
}>;

/** 컴포넌트에서 `role`과 `can()`을 함께 쓰기 위한 편의 훅. */
export function useCapabilities(): Capabilities {
  const role = useRole();

  return useMemo(
    () => ({
      role,
      can: (capability: Capability) => can(capability, role),
    }),
    [role]
  );
}
