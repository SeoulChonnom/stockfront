import { describe, expect, it, vi, afterEach } from 'vitest';

import { ApiError, apiRequest } from './client';

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('unwraps the data payload from the API envelope', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_DEV_BEARER_TOKEN', 'dev-token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: 1, title: 'ok' },
      }),
    });
    vi.stubGlobal(
      'fetch',
      fetchMock,
    );

    await expect(apiRequest<{ id: number; title: string }>('/stock/api/pages/daily/latest')).resolves.toEqual({
      id: 1,
      title: 'ok',
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).toBeInstanceOf(Headers);
    expect((init?.headers as Headers).get('Authorization')).toBe(
      'Bearer dev-token',
    );
  });

  it('prefers an explicit API bearer token when one is configured', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_API_BEARER_TOKEN', 'issued-token');
    vi.stubEnv('VITE_DEV_BEARER_TOKEN', 'dev-token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: 1, title: 'ok' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/stock/api/pages/daily/latest');

    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Headers).get('Authorization')).toBe(
      'Bearer issued-token',
    );
  });

  it('throws ApiError on non-ok responses', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_DEV_BEARER_TOKEN', 'dev-token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          detail: 'boom',
        }),
      }),
    );

    await expect(apiRequest('/stock/api/pages/daily/latest')).rejects.toBeInstanceOf(ApiError);
  });

  it('uses a more specific message for 401 responses', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_DEV_BEARER_TOKEN', 'dev-token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          detail: 'missing auth',
        }),
      }),
    );

    await expect(apiRequest('/stock/api/pages/daily/latest')).rejects.toMatchObject({
      message: 'Unauthorized (401). Check the Bearer token used by the frontend.',
      status: 401,
    });
  });

  it('uses a network/CORS specific message when fetch fails', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_DEV_BEARER_TOKEN', 'dev-token');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiRequest('/stock/api/pages/daily/latest')).rejects.toMatchObject({
      message:
        'Network request failed. Check that the backend is running, VITE_API_HOST is correct, and CORS allows the frontend origin.',
      status: 0,
      body: null,
    });
  });
});
