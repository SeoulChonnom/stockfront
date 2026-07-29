import { getAuthConfig, isDevelopmentBypassEnabled } from './auth-config';
// `Role` is a type-only import: it is erased at compile time
// (`verbatimModuleSyntax`), so this does not create a runtime circular
// dependency even though `capabilities.ts` imports runtime values (
// `getAuthBootstrapState`, `subscribeToAuthBootstrap`) from this file.
import type { Role } from './capabilities';

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
   * 토큰 발급 응답에 담겨 온 역할(있을 때만). 백엔드가 아직 role을 보내지
   * 않으므로 오늘은 항상 `null`이다 — `capabilities.ts`의 `getRole()`이
   * 이 값을 override 다음 우선순위로 소비하고, 없으면 자체 폴백으로
   * 넘어간다(docs/design_v2/v2-backend-requests.md P-01).
   */
  role: Role | null;
}>;

type AuthBootstrapListener = () => void;

type UserRdo = {
  accessToken?: unknown;
  /**
   * 백엔드가 아직 내려주지 않는 필드(P-01, 미확정). 오면 대소문자 무관하게
   * `'viewer' | 'operator'`로 정규화하고, 인식할 수 없는 값은 조용히
   * 무시한다(부트스트랩을 실패시키지 않는다).
   */
  role?: unknown;
  /**
   * P-01의 대안(세분화된 permissions 배열)을 위해 방어적으로 타입만
   * 예약해 둔다 — 현재는 파싱하지 않는다. 채택 여부는
   * docs/design_v2/v2-backend-requests.md P-01 참고.
   */
  permissions?: unknown;
};

const idleState: AuthBootstrapState = Object.freeze({
  status: 'idle',
  accessToken: null,
  error: null,
  role: null,
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
  role: Role | null = null
): AuthBootstrapState {
  return Object.freeze({
    status,
    accessToken,
    error,
    role,
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
 * `role`을 방어적으로 읽는다. 백엔드는 오늘 이 필드를 보내지 않으므로
 * `undefined`가 정상 경로다. 문자열이 아니거나 대소문자 무관 비교로도
 * `'viewer' | 'operator'`에 해당하지 않으면 `null`을 반환해 호출부가
 * `capabilities.ts`의 자체 폴백으로 넘어가게 한다 — 절대 throw하지 않는다
 * (accessToken 검증과의 핵심 차이).
 */
function readRole(body: unknown): Role | null {
  const rawRole =
    body && typeof body === 'object' && 'role' in body
      ? (body as UserRdo).role
      : undefined;

  if (typeof rawRole !== 'string') {
    return null;
  }

  const normalizedRole = rawRole.trim().toLowerCase();

  if (normalizedRole === 'viewer' || normalizedRole === 'operator') {
    return normalizedRole;
  }

  return null;
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
  role: Role | null;
}>;

async function requestTokenBootstrap(): Promise<TokenBootstrapResult> {
  const parsedBody = await fetchTokenBootstrapBody();

  return {
    accessToken: readAccessToken(parsedBody),
    role: readRole(parsedBody),
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
    .then(({ accessToken, role }) =>
      publishState(createState('authenticated', accessToken, null, role))
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
