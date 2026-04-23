import { describe, expect, it, vi, afterEach } from 'vitest';

import { ApiError, apiRequest } from './client';

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });
}

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('unwraps the data payload from the API envelope', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_DEV_BEARER_TOKEN', 'dev-token');
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        createJsonResponse({
          success: true,
          data: { id: 1, title: 'ok' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiRequest<{ id: number; title: string }>('/stock/api/pages/daily/latest')
    ).resolves.toEqual({
      id: 1,
      title: 'ok',
    });
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.headers).toBeInstanceOf(Headers);
    expect((init?.headers as Headers | undefined)?.get('Authorization')).toBe(
      'Bearer dev-token'
    );
  });

  it('prefers an explicit API bearer token when one is configured', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_API_BEARER_TOKEN', 'issued-token');
    vi.stubEnv('VITE_DEV_BEARER_TOKEN', 'dev-token');
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        createJsonResponse({
          success: true,
          data: { id: 1, title: 'ok' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/stock/api/pages/daily/latest');

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect((init?.headers as Headers | undefined)?.get('Authorization')).toBe(
      'Bearer issued-token'
    );
  });

  it('throws ApiError on non-ok responses', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_DEV_BEARER_TOKEN', 'dev-token');
    vi.stubGlobal(
      'fetch',
      vi
        .fn<
          (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
        >()
        .mockResolvedValue(
          createJsonResponse(
            {
              detail: 'boom',
            },
            { status: 500 }
          )
        )
    );

    await expect(
      apiRequest('/stock/api/pages/daily/latest')
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('uses a more specific message for 401 responses', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_DEV_BEARER_TOKEN', 'dev-token');
    vi.stubGlobal(
      'fetch',
      vi
        .fn<
          (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
        >()
        .mockResolvedValue(
          createJsonResponse(
            {
              detail: 'missing auth',
            },
            { status: 401 }
          )
        )
    );

    await expect(
      apiRequest('/stock/api/pages/daily/latest')
    ).rejects.toMatchObject({
      message:
        'Unauthorized (401). Check the Bearer token used by the frontend.',
      status: 401,
    });
  });

  it('uses a network/CORS specific message when fetch fails', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_DEV_BEARER_TOKEN', 'dev-token');
    vi.stubGlobal(
      'fetch',
      vi
        .fn<
          (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
        >()
        .mockRejectedValue(new TypeError('Failed to fetch'))
    );

    await expect(
      apiRequest('/stock/api/pages/daily/latest')
    ).rejects.toMatchObject({
      message:
        'Network request failed. Check that the backend is running, VITE_API_HOST is correct, and CORS allows the frontend origin.',
      status: 0,
      body: null,
    });
  });
});
