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
}>;

type AuthBootstrapListener = () => void;

type UserRdo = {
  accessToken?: unknown;
};

const idleState: AuthBootstrapState = Object.freeze({
  status: 'idle',
  accessToken: null,
  error: null,
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
  error: string | null = null
): AuthBootstrapState {
  return Object.freeze({
    status,
    accessToken,
    error,
  });
}

function publishState(nextState: AuthBootstrapState) {
  currentState = nextState;
  listeners.forEach((listener) => listener());
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

export async function requestAccessTokenBootstrap() {
  const { tokenUrl } = getAuthConfig();

  let response: Response;
  try {
    response = await fetch(tokenUrl, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    throw new Error('Token bootstrap request failed before a response was received.');
  }

  let parsedBody: unknown = null;

  try {
    parsedBody = await response.json();
  } catch {
    parsedBody = null;
  }

  if (!response.ok) {
    throw new Error(
      `Token bootstrap failed with status ${response.status}.`
    );
  }

  return readAccessToken(parsedBody);
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

  inFlightBootstrap = requestAccessTokenBootstrap()
    .then((accessToken) =>
      publishState(createState('authenticated', accessToken))
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
