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

  it('defaults to operator when there is no override and no bootstrap role, even in production (see getDefaultRole comment)', () => {
    vi.stubEnv('VITE_APP_ENV', 'production');

    expect(getRole()).toBe('operator');
  });

  it('defaults to operator under VITE_APP_ENV=development', () => {
    vi.stubEnv('VITE_APP_ENV', 'development');

    expect(getRole()).toBe('operator');
  });

  it('an explicit override always wins over the environment default', () => {
    vi.stubEnv('VITE_APP_ENV', 'development');
    setRoleOverride('viewer');

    expect(getRole()).toBe('viewer');
  });

  it('uses the role parsed by auth-bootstrap once bootstrap completes, ranking above the default fallback', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_ENV', 'production');
    stubTokenResponse({ accessToken: 'issued-token', role: 'VIEWER' });

    await bootstrapAuth();

    expect(getRole()).toBe('viewer');
  });

  it('setRoleOverride still wins over a bootstrap-provided role', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_ENV', 'production');
    stubTokenResponse({ accessToken: 'issued-token', role: 'VIEWER' });

    await bootstrapAuth();
    setRoleOverride('operator');

    expect(getRole()).toBe('operator');
  });

  it('gates every ops.* capability to operator only (README §10)', () => {
    expect(can('ops.view', 'viewer')).toBe(false);
    expect(can('ops.trigger', 'viewer')).toBe(false);
    expect(can('ops.viewLogs', 'viewer')).toBe(false);
    expect(can('ops.advancedTriggerOptions', 'viewer')).toBe(false);

    expect(can('ops.view', 'operator')).toBe(true);
    expect(can('ops.trigger', 'operator')).toBe(true);
    expect(can('ops.viewLogs', 'operator')).toBe(true);
    expect(can('ops.advancedTriggerOptions', 'operator')).toBe(true);
  });

  it('useRole() re-renders when the override changes', () => {
    vi.stubEnv('VITE_APP_ENV', 'production');
    const { result } = renderHook(() => useRole());

    expect(result.current).toBe('operator');

    act(() => {
      setRoleOverride('viewer');
    });

    expect(result.current).toBe('viewer');
  });

  it('useRole() re-renders when the auth-bootstrap state changes (no override)', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_ENV', 'production');
    stubTokenResponse({ accessToken: 'issued-token', role: 'VIEWER' });

    const { result } = renderHook(() => useRole());

    expect(result.current).toBe('operator');

    await act(async () => {
      await bootstrapAuth();
    });

    await waitFor(() => {
      expect(result.current).toBe('viewer');
    });
  });

  it('useCapabilities() exposes role + a bound can() that reacts to role changes', () => {
    vi.stubEnv('VITE_APP_ENV', 'production');
    const { result } = renderHook(() => useCapabilities());

    expect(result.current.role).toBe('operator');
    expect(result.current.can('ops.view')).toBe(true);

    act(() => {
      setRoleOverride('viewer');
    });

    expect(result.current.role).toBe('viewer');
    expect(result.current.can('ops.view')).toBe(false);
  });
});
