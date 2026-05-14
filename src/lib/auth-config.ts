function readEnvString(name: string) {
  const value = (import.meta.env as Record<string, unknown>)[name];

  return typeof value === 'string' ? value : undefined;
}

export function isDevelopmentBypassEnabled() {
  return readEnvString('VITE_APP_ENV') === 'development';
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
    loginUrl: `${host}/login`,
    tokenUrl: `${host}/api/user/token`,
    isDevelopmentBypassEnabled: isDevelopmentBypassEnabled(),
  };
}
