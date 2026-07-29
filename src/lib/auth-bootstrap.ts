import { getAuthConfig, isDevelopmentBypassEnabled } from './auth-config';

export type AuthBootstrapStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'bypassed'
  | 'redirecting'
  | 'failed';

export type AuthBootstrapState = Readonly<{
  status: AuthBootstrapStatus;
  accessToken: string | null;
  error: string | null;
  /**
   * 토큰 발급 응답의 `roleList`를 방어적으로 파싱한 결과 — 문자열 배열
   * 항목만 남기고, 필드가 없거나 배열이 아니면 빈 배열이다. 'ADMIN' 판정 등
   * 실제 role 해석은 여기서 하지 않는다 — `capabilities.ts#getRole()`이
   * 이 배열을 override 다음 우선순위로 소비하는 유일한 판단 지점이다
   * (docs/design_v2/v2-backend-requests.md P-01, 확정된 계약).
   */
  roles: readonly string[];
}>;

type AuthBootstrapListener = () => void;

type UserRdo = {
  accessToken?: unknown;
  /**
   * 확정된 계약(P-01): `POST /api/users/token` 응답에 담겨 오는 역할 목록,
   * 예) `["USER", "ADMIN"]`. 선택 필드로 방어적으로 읽는다 — 배열이
   * 아니거나, 배열 안의 항목이 문자열이 아니면 해당 항목/전체를 조용히
   * 무시한다(부트스트랩을 실패시키지 않는다). 대소문자 정규화와 'ADMIN'
   * 판정은 `capabilities.ts`의 책임이다.
   */
  roleList?: unknown;
};

const idleState: AuthBootstrapState = Object.freeze({
  status: 'idle',
  accessToken: null,
  error: null,
  roles: [],
});

let currentState = idleState;
let inFlightBootstrap: Promise<AuthBootstrapState> | null = null;

const listeners = new Set<AuthBootstrapListener>();

export const authBootstrapNavigation = {
  redirectToLogin(loginUrl: string) {
    window.location.assign(loginUrl);
  },
};

function createState(
  status: AuthBootstrapStatus,
  accessToken: string | null,
  error: string | null = null,
  roles: readonly string[] = []
): AuthBootstrapState {
  return Object.freeze({
    status,
    accessToken,
    error,
    roles,
  });
}

function publishState(nextState: AuthBootstrapState) {
  currentState = nextState;
  listeners.forEach((listener) => {
    listener();
  });
  return currentState;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const message = error.message.trim();

    if (message.length > 0) {
      return message;
    }
  }

  return fallback;
}

function readAccessToken(body: unknown) {
  const accessToken =
    body && typeof body === 'object' && 'accessToken' in body
      ? (body as UserRdo).accessToken
      : undefined;

  if (typeof accessToken !== 'string') {
    throw new Error(
      'Token bootstrap response must include a non-empty accessToken string.'
    );
  }

  const normalizedAccessToken = accessToken.trim();

  if (normalizedAccessToken.length === 0) {
    throw new Error(
      'Token bootstrap response must include a non-empty accessToken string.'
    );
  }

  return normalizedAccessToken;
}

/**
 * `roleList`를 방어적으로 읽는다. 배열이 아니면(필드가 없거나, 형식이
 * 어긋나면) 빈 배열을 반환하고, 배열이어도 문자열이 아닌 항목은 걸러낸다.
 * accessToken 검증과 달리 이 함수는 절대 throw하지 않는다 — 필드가 없거나
 * 형식이 어긋나도 부트스트랩 자체는 성공해야 한다(호출부인
 * `capabilities.ts#getRole()`이 빈 배열을 자체 최소권한(least-privilege)
 * 폴백으로 처리한다). 'ADMIN' 판정 등 실제 role 해석은 여기서 하지 않는다.
 */
function readRoleList(body: unknown): readonly string[] {
  const rawRoleList =
    body && typeof body === 'object' && 'roleList' in body
      ? (body as UserRdo).roleList
      : undefined;

  if (!Array.isArray(rawRoleList)) {
    return [];
  }

  return rawRoleList.filter(
    (entry): entry is string => typeof entry === 'string'
  );
}

function getBootstrapFailureState(message: string) {
  if (isDevelopmentBypassEnabled()) {
    return publishState(createState('bypassed', null, message));
  }

  let loginUrl: string;

  try {
    ({ loginUrl } = getAuthConfig());
  } catch (error) {
    const configMessage = getErrorMessage(
      error,
      'Auth config could not be resolved for login redirect.'
    );
    const combinedMessage =
      configMessage === message ? message : `${message} ${configMessage}`;

    return publishState(createState('failed', null, combinedMessage));
  }

  const redirectingState = publishState(
    createState('redirecting', null, message)
  );

  if (typeof window === 'undefined') {
    return publishState(
      createState(
        'failed',
        null,
        `${message} Redirect to ${loginUrl} could not be started outside the browser.`
      )
    );
  }

  try {
    authBootstrapNavigation.redirectToLogin(loginUrl);
    return redirectingState;
  } catch {
    return publishState(
      createState('failed', null, `${message} Redirect to ${loginUrl} failed.`)
    );
  }
}

export function getAuthBootstrapState() {
  return currentState;
}

export function subscribeToAuthBootstrap(listener: AuthBootstrapListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getAccessToken() {
  return currentState.accessToken;
}

async function fetchTokenBootstrapBody(): Promise<unknown> {
  const { tokenUrl } = getAuthConfig();

  let response: Response;
  try {
    response = await fetch(tokenUrl, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    throw new Error(
      'Token bootstrap request failed before a response was received.'
    );
  }

  let parsedBody: unknown = null;

  try {
    parsedBody = await response.json();
  } catch {
    parsedBody = null;
  }

  if (!response.ok) {
    throw new Error(`Token bootstrap failed with status ${response.status}.`);
  }

  return parsedBody;
}

/**
 * 공개 API — 기존 동작 그대로 accessToken 문자열만 반환한다(하위 호환).
 * 역할까지 필요한 내부 부트스트랩 흐름은 `requestTokenBootstrap()`을 쓴다.
 */
export async function requestAccessTokenBootstrap() {
  const parsedBody = await fetchTokenBootstrapBody();

  return readAccessToken(parsedBody);
}

type TokenBootstrapResult = Readonly<{
  accessToken: string;
  roles: readonly string[];
}>;

async function requestTokenBootstrap(): Promise<TokenBootstrapResult> {
  const parsedBody = await fetchTokenBootstrapBody();

  return {
    accessToken: readAccessToken(parsedBody),
    roles: readRoleList(parsedBody),
  };
}

export function resetAuthBootstrapForTesting() {
  inFlightBootstrap = null;
  publishState(idleState);
}

export function bootstrapAuth() {
  if (inFlightBootstrap) {
    return inFlightBootstrap;
  }

  if (currentState.status !== 'idle') {
    return Promise.resolve(currentState);
  }

  publishState(createState('loading', null));

  inFlightBootstrap = requestTokenBootstrap()
    .then(({ accessToken, roles }) =>
      publishState(createState('authenticated', accessToken, null, roles))
    )
    .catch((error: unknown) =>
      getBootstrapFailureState(
        getErrorMessage(error, 'Token bootstrap failed unexpectedly.')
      )
    )
    .finally(() => {
      inFlightBootstrap = null;
    });

  return inFlightBootstrap;
}
