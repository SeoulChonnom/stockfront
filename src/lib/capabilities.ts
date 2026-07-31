/**
 * Role / capability gating — Market Brief UI v2 (README §10, §14 D-01).
 *
 * 이 파일은 프런트엔드 role/capability 판단의 단일 지점(single source of
 * truth)이다. 여기서 하는 판단은 UX 장치(affordance)일 뿐 보안 경계가
 * 아니다 — 운영 메뉴를 감추거나 버튼을 비활성화해도 서버가 `/ops/*` 조회와
 * 배치 실행(trigger) 권한을 강제하지 않으면 누구든 API를 직접 호출해
 * 우회할 수 있다. 실제 접근 제어는 반드시 백엔드가 수행해야 한다.
 *
 * 역할 계약은 확정됐다(docs/design_v2/v2-backend-requests.md P-01):
 * `POST /api/users/token` 응답의 `roleList: string[]`가 유일한 역할
 * 출처이며, "Operator"라는 별도 역할은 존재하지 않는다 — `roleList`에
 * `ADMIN`이 포함되어 있으면 `admin`, 그 외에는 전부 `user`다. 이 파일이
 * `roleList`(→ `auth-bootstrap.ts`가 파싱)를 읽어 `admin`/`user`로
 * 정규화하는 유일한 지점이며, 다른 파일은 `can`/`useRole`/
 * `useCapabilities`를 통해서만 역할을 소비한다.
 */

import { useMemo, useSyncExternalStore } from 'react';

import {
  getAuthBootstrapState,
  subscribeToAuthBootstrap,
} from './auth-bootstrap';
import { isDevelopmentBypassEnabled } from './auth-config';

export type Role = 'user' | 'admin';

export type Capability =
  | 'ops.view'
  | 'ops.trigger'
  | 'ops.viewLogs'
  | 'ops.advancedTriggerOptions';

type Listener = () => void;

const listeners = new Set<Listener>();

let roleOverride: Role | null = null;

/**
 * override도, auth-bootstrap이 파싱한 `roleList`도 없을 때(필드 자체가
 * 없거나 배열이 아니어서 빈 배열로 들어온 경우)의 최종 폴백.
 *
 * **폴백을 'user'(최소 권한)로 두는 이유 (변경 시 반드시 재검토할 것)**:
 * 예전에는 백엔드가 역할을 전혀 내려주지 않아서(P-01 미확정) 폴백을
 * 'operator'로 두어야 했다 — 역할 출처가 아예 없는 상태에서 폴백을
 * 제한적으로 두면, 실제로는 운영자인 사용자의 접근을 조용히 제거하는
 * 기능 회귀가 되기 때문이었다. 그 사유는 이제 성립하지 않는다: 백엔드가
 * `roleList`를 실제로 내려주므로(P-01 확정), `roleList`가 없거나
 * `ADMIN`을 포함하지 않는다는 것은 "이 사용자가 실제로 관리자가
 * 아니다"라는 신호다. 따라서 최소 권한(least privilege)이 올바른
 * 기본값이다 — `roleList`가 응답에서 누락되는 이례적인 상황이 오더라도,
 * 이제는 그 사용자를 관리자로 승격시키는 대신 `user`로 안전하게
 * 취급한다.
 *
 * **다시 한번 명시**: 이 판단은 UX 장치(affordance)일 뿐 보안 경계가
 * 아니다. 실제 접근 제어는 서버가 수행한다 — 백엔드는 비관리자 토큰의
 * `/ops/*` 조회와 배치 실행(trigger)에 403을 반환한다(PO 확인,
 * 2026-07-30). 여기서 하는 일은 그 위에 얹힌 표현 계층이다: 어차피
 * 403이 될 기능을 화면에 노출하지 않는 것.
 *
 * 이 구분을 유지할 것. 새 운영 기능을 추가할 때 `can(...)` 게이팅만
 * 걸고 서버 인가를 확인하지 않으면, 화면에서만 사라질 뿐 API는 그대로
 * 열려 있게 된다.
 */
function getDefaultRole(): Role {
  if (isDevelopmentBypassEnabled()) {
    // 개발 빌드 기본값 — 이 경로는 토큰 엔드포인트를 아예 호출하지 않는다
    // (README §5 "(개발 빌드에서만) 상태 시뮬레이터"). `roleList`를 받아올
    // 방법이 로컬에는 없으므로, 여기서 'user'를 반환하면 로컬 개발 중
    // override 없이는 운영 화면 자체를 볼 수 없어 개발이 막힌다. 아래
    // 최종 폴백과는 서로 다른 이유로 결정되는 별개의 값이므로 분기를
    // 유지하고, 'admin'으로 고정해 둔다.
    return 'admin';
  }

  // 최종 폴백. 위 doc comment의 최소 권한(least-privilege) 사유를 그대로
  // 따른다.
  return 'user';
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
 * `auth-bootstrap.ts`가 파싱한 `roleList`를 `admin`/`user`로 정규화하는
 * 유일한 지점. 배열이 비어 있으면(필드 자체가 없거나 형식이 어긋난 경우)
 * `null`을 반환해 호출부가 `getDefaultRole()` 폴백으로 넘어가게 한다 —
 * 배열이 비어있지 않으면 무조건 `admin`/`user` 둘 중 하나로 확정된 판단을
 * 내린다(예: `["USER"]`처럼 `ADMIN`이 없는 실제 응답은 폴백이 아니라
 * `'user'`라는 확정된 판단이다).
 */
function deriveRoleFromRoleList(roles: readonly string[]): Role | null {
  if (roles.length === 0) {
    return null;
  }

  const isAdmin = roles.some((entry) => entry.trim().toLowerCase() === 'admin');

  return isAdmin ? 'admin' : 'user';
}

/**
 * 현재 역할을 읽는 단일 지점. 우선순위:
 *   1. `setRoleOverride()`로 설정된 명시적 override(테스트, DEV 역할
 *      시뮬레이터) — 최우선.
 *   2. auth-bootstrap이 토큰 응답에서 파싱한 `roleList`로부터 도출한 실제
 *      역할(있을 때만, `deriveRoleFromRoleList` 참고) — P-01 확정 계약.
 *   3~4. `getDefaultRole()` 폴백(개발 기본값 / 최종 폴백 — 위 주석 참고).
 */
export function getRole(): Role {
  if (roleOverride) {
    return roleOverride;
  }

  const bootstrapRole = deriveRoleFromRoleList(getAuthBootstrapState().roles);

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
    user: new Set<Capability>(),
    admin: new Set<Capability>([
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
