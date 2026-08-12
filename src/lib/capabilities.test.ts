import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { bootstrapAuth, resetAuthBootstrapForTesting } from './auth-bootstrap';
import {
  can,
  getRole,
  resetRoleOverrideForTesting,
  setRoleOverride,
  useCapabilities,
  useRole,
} from './capabilities';

function stubTokenResponse(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        new Response(JSON.stringify(body), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
  );
}

describe('capabilities', () => {
  afterEach(() => {
    resetRoleOverrideForTesting();
    resetAuthBootstrapForTesting();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('defaults to user (least privilege) when there is no override and no bootstrap roleList, in production (see getDefaultRole comment)', () => {
    vi.stubEnv('VITE_APP_ENV', 'production');

    expect(getRole()).toBe('user');
  });

  it('defaults to admin under VITE_APP_ENV=development (dev auth bypass never calls the token endpoint)', () => {
    vi.stubEnv('VITE_APP_ENV', 'development');

    expect(getRole()).toBe('admin');
  });

  it('an explicit override always wins over the environment default', () => {
    vi.stubEnv('VITE_APP_ENV', 'development');
    setRoleOverride('user');

    expect(getRole()).toBe('user');
  });

  it('roleList containing ADMIN resolves to admin, ranking above the default fallback', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_ENV', 'production');
    stubTokenResponse({
      accessToken: 'issued-token',
      roleList: ['USER', 'ADMIN'],
    });

    await bootstrapAuth();

    expect(getRole()).toBe('admin');
  });

  it('roleList without ADMIN resolves to user, even under the development default', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_ENV', 'development');
    stubTokenResponse({ accessToken: 'issued-token', roleList: ['USER'] });

    await bootstrapAuth();

    expect(getRole()).toBe('user');
  });

  it('recognises a lowercase "admin" entry in roleList', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_ENV', 'production');
    stubTokenResponse({
      accessToken: 'issued-token',
      roleList: ['user', 'admin'],
    });

    await bootstrapAuth();

    expect(getRole()).toBe('admin');
  });

  it('falls back to user without throwing when roleList is missing or malformed', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_ENV', 'production');
    stubTokenResponse({ accessToken: 'issued-token', roleList: 'ADMIN' });

    await bootstrapAuth();
    expect(getRole()).toBe('user');
  });

  it('setRoleOverride still wins over a bootstrap-provided roleList', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_ENV', 'production');
    stubTokenResponse({ accessToken: 'issued-token', roleList: ['USER'] });

    await bootstrapAuth();
    setRoleOverride('admin');

    expect(getRole()).toBe('admin');
  });

  it('gates every ops.* capability to admin only', () => {
    expect(can('ops.view', 'user')).toBe(false);
    expect(can('ops.trigger', 'user')).toBe(false);
    expect(can('ops.viewLogs', 'user')).toBe(false);

    expect(can('ops.view', 'admin')).toBe(true);
    expect(can('ops.trigger', 'admin')).toBe(true);
    expect(can('ops.viewLogs', 'admin')).toBe(true);
  });

  it('useRole() re-renders when the override changes', () => {
    vi.stubEnv('VITE_APP_ENV', 'production');
    const { result } = renderHook(() => useRole());

    expect(result.current).toBe('user');

    act(() => {
      setRoleOverride('admin');
    });

    expect(result.current).toBe('admin');
  });

  it('useRole() re-renders when the auth-bootstrap state changes (no override)', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_ENV', 'production');
    stubTokenResponse({
      accessToken: 'issued-token',
      roleList: ['USER', 'ADMIN'],
    });

    const { result } = renderHook(() => useRole());

    expect(result.current).toBe('user');

    await act(async () => {
      await bootstrapAuth();
    });

    await waitFor(() => {
      expect(result.current).toBe('admin');
    });
  });

  it('useCapabilities() exposes role + a bound can() that reacts to role changes', () => {
    vi.stubEnv('VITE_APP_ENV', 'production');
    const { result } = renderHook(() => useCapabilities());

    expect(result.current.role).toBe('user');
    expect(result.current.can('ops.view')).toBe(false);

    act(() => {
      setRoleOverride('admin');
    });

    expect(result.current.role).toBe('admin');
    expect(result.current.can('ops.view')).toBe(true);
  });
});
