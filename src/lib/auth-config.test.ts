import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAuthConfig } from './auth-config';

describe('getAuthConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('normalizes trailing slashes into a shared host for login and token URLs', () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000/');
    vi.stubEnv('VITE_APP_ENV', 'production');

    expect(getAuthConfig()).toEqual({
      host: 'http://localhost:8000',
      loginUrl: 'http://localhost:8000/login',
      tokenUrl: 'http://localhost:8000/api/user/token',
      isDevelopmentBypassEnabled: false,
    });
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
