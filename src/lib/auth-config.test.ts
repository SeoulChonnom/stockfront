import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAuthConfig } from './auth-config';

const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';

function stubUserAgent(userAgent: string) {
  vi.stubGlobal('navigator', { ...navigator, userAgent });
}

describe('getAuthConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('normalizes trailing slashes into a shared host for login and token URLs', () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000/');
    vi.stubEnv('VITE_APP_ENV', 'production');
    stubUserAgent(DESKTOP_USER_AGENT);
    window.history.replaceState(null, '', '/market/latest');

    expect(getAuthConfig()).toEqual({
      host: 'http://localhost:8000',
      loginUrl:
        'http://localhost:8000/main/login?redirect=%2Fmarket%2Flatest',
      tokenUrl: 'http://localhost:8000/api/users/token',
      isDevelopmentBypassEnabled: false,
    });
  });

  it('routes to the mobile login page on a mobile user agent', () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    stubUserAgent(MOBILE_USER_AGENT);
    window.history.replaceState(null, '', '/ops/batches?page=2');

    expect(getAuthConfig().loginUrl).toBe(
      'http://localhost:8000/mobile/login?redirect=%2Fops%2Fbatches%3Fpage%3D2'
    );
  });

  it('enables the development bypass only in development', () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_ENV', 'development');

    expect(getAuthConfig().isDevelopmentBypassEnabled).toBe(true);
  });

  it('treats malformed host input deterministically', () => {
    vi.stubEnv('VITE_API_HOST', 'not-a-url');

    expect(() => getAuthConfig()).toThrow(
      'VITE_API_HOST must be a valid absolute URL.'
    );
  });

  it('treats blank host input deterministically', () => {
    vi.stubEnv('VITE_API_HOST', '   ');

    expect(() => getAuthConfig()).toThrow('VITE_API_HOST is not configured.');
  });
});
