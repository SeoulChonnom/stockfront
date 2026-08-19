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
  /** Sanitized roleList; role interpretation belongs to capabilities.ts. */
  roles: readonly string[];
  /**
   * 표시용 사용자 이름(`UserRdo.name`). 값이 없거나 문자열이 아니면 `null`이며,
   * 그때 화면은 이름 줄을 지운다 — 자리표시자를 지어내지 않는다.
   */
  name: string | null;
}>;

type AuthBootstrapListener = () => void;

/**
 * `${VITE_API_HOST}/api/user/token` 응답 본문.
 *
 * 실제 계약은 `{ accessToken, name, roleList, username }`이다. 이 타입은 그중
 * **읽는 것만** 선언한다 — `username`(로그인 아이디)은 화면에 쓰지 않으므로
 * 넣지 않았다. 표시용 이름은 `name`이다.
 */
type UserRdo = {
  accessToken?: unknown;
  roleList?: unknown;
  name?: unknown;
};

const idleState: AuthBootstrapState = Object.freeze({
  status: 'idle',
  accessToken: null,
  error: null,
  roles: [],
  name: null,
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
  roles: readonly string[] = [],
  name: string | null = null
): AuthBootstrapState {
  return Object.freeze({
    status,
    accessToken,
    error,
    roles,
    name,
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

/** Missing/malformed roleList is non-fatal; retain only string entries. */
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

/**
 * 표시용 이름. `readRoleList`와 같은 방어 수준을 쓴다 — 필드가 없거나 문자열이
 * 아니거나 공백뿐이면 `null`이다. 빈 문자열을 그대로 통과시키면 화면에 이름
 * 줄만 남고 내용이 없는 상태가 된다.
 */
function readName(body: unknown): string | null {
  const rawName =
    body && typeof body === 'object' && 'name' in body
      ? (body as UserRdo).name
      : undefined;

  if (typeof rawName !== 'string') {
    return null;
  }

  const trimmed = rawName.trim();

  return trimmed.length > 0 ? trimmed : null;
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

export async function requestAccessTokenBootstrap() {
  const parsedBody = await fetchTokenBootstrapBody();

  return readAccessToken(parsedBody);
}

type TokenBootstrapResult = Readonly<{
  accessToken: string;
  roles: readonly string[];
  name: string | null;
}>;

async function requestTokenBootstrap(): Promise<TokenBootstrapResult> {
  const parsedBody = await fetchTokenBootstrapBody();

  return {
    accessToken: readAccessToken(parsedBody),
    roles: readRoleList(parsedBody),
    name: readName(parsedBody),
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
    .then(({ accessToken, roles, name }) =>
      publishState(createState('authenticated', accessToken, null, roles, name))
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
