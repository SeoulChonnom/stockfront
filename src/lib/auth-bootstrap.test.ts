import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  authBootstrapNavigation,
  bootstrapAuth,
  getAccessToken,
  getAuthBootstrapState,
  requestAccessTokenBootstrap,
  resetAuthBootstrapForTesting,
  subscribeToAuthBootstrap,
} from './auth-bootstrap';

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });
}

describe('auth bootstrap', () => {
  afterEach(() => {
    resetAuthBootstrapForTesting();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('requests the token endpoint with POST and credentials included', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(createJsonResponse({ accessToken: 'issued-token' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestAccessTokenBootstrap()).resolves.toBe('issued-token');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/user/token',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      })
    );
  });

  it('authenticates and stores the runtime token in memory', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubGlobal(
      'fetch',
      vi
        .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
        .mockResolvedValue(createJsonResponse({ accessToken: 'issued-token' }))
    );

    await expect(bootstrapAuth()).resolves.toEqual({
      status: 'authenticated',
      accessToken: 'issued-token',
      error: null,
    });
    expect(getAccessToken()).toBe('issued-token');
    expect(getAuthBootstrapState()).toEqual({
      status: 'authenticated',
      accessToken: 'issued-token',
      error: null,
    });
  });

  it('publishes loading then authenticated to subscribers', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubGlobal(
      'fetch',
      vi
        .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
        .mockResolvedValue(createJsonResponse({ accessToken: 'issued-token' }))
    );

    const snapshots = [getAuthBootstrapState().status];
    const unsubscribe = subscribeToAuthBootstrap(() => {
      snapshots.push(getAuthBootstrapState().status);
    });

    await bootstrapAuth();
    unsubscribe();

    expect(snapshots).toEqual(['idle', 'loading', 'authenticated']);
  });

  it('treats blank access tokens as a redirecting failure outside development', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    const assignMock = vi
      .spyOn(authBootstrapNavigation, 'redirectToLogin')
      .mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi
        .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
        .mockResolvedValue(createJsonResponse({ accessToken: '   ' }))
    );

    await expect(bootstrapAuth()).resolves.toEqual({
      status: 'redirecting',
      accessToken: null,
      error: 'Token bootstrap response must include a non-empty accessToken string.',
    });
    expect(assignMock).toHaveBeenCalledWith('http://localhost:8000/login');
    expect(getAccessToken()).toBeNull();
  });

  it('bypasses in development when token bootstrap fails', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_ENV', 'development');
    const assignMock = vi.spyOn(authBootstrapNavigation, 'redirectToLogin');
    vi.stubGlobal(
      'fetch',
      vi
        .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
        .mockResolvedValue(createJsonResponse({ accessToken: '' }))
    );

    await expect(bootstrapAuth()).resolves.toEqual({
      status: 'bypassed',
      accessToken: null,
      error: 'Token bootstrap response must include a non-empty accessToken string.',
    });
    expect(assignMock).not.toHaveBeenCalled();
  });

  it('bypasses in development when host config is invalid before fetch starts', async () => {
    vi.stubEnv('VITE_API_HOST', '');
    vi.stubEnv('VITE_APP_ENV', 'development');
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
    const assignMock = vi.spyOn(authBootstrapNavigation, 'redirectToLogin');
    vi.stubGlobal('fetch', fetchMock);

    await expect(bootstrapAuth()).resolves.toEqual({
      status: 'bypassed',
      accessToken: null,
      error: 'VITE_API_HOST is not configured.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it('fails cleanly in non-development when host config is invalid before fetch starts', async () => {
    vi.stubEnv('VITE_API_HOST', '');
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
    const assignMock = vi.spyOn(authBootstrapNavigation, 'redirectToLogin');
    vi.stubGlobal('fetch', fetchMock);

    await expect(bootstrapAuth()).resolves.toEqual({
      status: 'failed',
      accessToken: null,
      error: 'VITE_API_HOST is not configured.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it('falls back to a failed state when login redirect throws', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.spyOn(authBootstrapNavigation, 'redirectToLogin').mockImplementation(() => {
      throw new Error('navigation blocked');
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
        .mockResolvedValue(createJsonResponse({ accessToken: '' }))
    );

    await expect(bootstrapAuth()).resolves.toEqual({
      status: 'failed',
      accessToken: null,
      error:
        'Token bootstrap response must include a non-empty accessToken string. Redirect to http://localhost:8000/login failed.',
    });
  });

  it('reuses the in-flight bootstrap request for duplicate initial calls', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');

    let resolveResponse: ((value: Response) => void) | undefined;
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            resolveResponse = resolve;
          })
      );
    vi.stubGlobal('fetch', fetchMock);

    const firstBootstrap = bootstrapAuth();
    const secondBootstrap = bootstrapAuth();

    expect(firstBootstrap).toBe(secondBootstrap);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAuthBootstrapState()).toEqual({
      status: 'loading',
      accessToken: null,
      error: null,
    });

    resolveResponse?.(createJsonResponse({ accessToken: 'issued-token' }));

    await expect(firstBootstrap).resolves.toEqual({
      status: 'authenticated',
      accessToken: 'issued-token',
      error: null,
    });

    await expect(bootstrapAuth()).resolves.toEqual({
      status: 'authenticated',
      accessToken: 'issued-token',
      error: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
