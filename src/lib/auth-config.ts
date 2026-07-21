function readEnvString(name: string) {
  const value = (import.meta.env as Record<string, unknown>)[name];

  return typeof value === 'string' ? value : undefined;
}

export function isDevelopmentBypassEnabled() {
  return readEnvString('VITE_APP_ENV') === 'development';
}

function isMobileUserAgent() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

function buildLoginUrl(host: string) {
  const devicePrefix = isMobileUserAgent() ? '/mobile' : '/main';
  const redirectTarget = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const searchParams = new URLSearchParams();
  searchParams.set('redirect', redirectTarget);

  return `${host}${devicePrefix}/login?${searchParams.toString()}`;
}

function normalizeHost(host: string) {
  const trimmed = host.trim();

  if (trimmed.length === 0) {
    throw new Error('VITE_API_HOST is not configured.');
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('VITE_API_HOST must be a valid absolute URL.');
  }

  if (url.pathname !== '/' || url.search.length > 0 || url.hash.length > 0) {
    throw new Error(
      'VITE_API_HOST must be an origin without path, query, or hash.'
    );
  }

  return url.origin;
}

export function getAuthConfig() {
  const host = normalizeHost(readEnvString('VITE_API_HOST') ?? '');

  return {
    host,
    loginUrl: buildLoginUrl(host),
    tokenUrl: `${host}/api/users/token`,
    isDevelopmentBypassEnabled: isDevelopmentBypassEnabled(),
  };
}
