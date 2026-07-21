import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootstrapAuth, resetAuthBootstrapForTesting } from '../auth-bootstrap';
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
    resetAuthBootstrapForTesting();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('unwraps the data payload from the API envelope and injects the runtime token from a normalized host', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000/');
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockImplementation((input) => {
        if (input === 'http://localhost:8000/api/users/token') {
          return Promise.resolve(
            createJsonResponse({ accessToken: 'issued-token' })
          );
        }

        return Promise.resolve(
          createJsonResponse({
            success: true,
            data: { id: 1, title: 'ok' },
          })
        );
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(bootstrapAuth()).resolves.toMatchObject({
      status: 'authenticated',
      accessToken: 'issued-token',
    });

    await expect(
      apiRequest<{ id: number; title: string }>('/stock/api/pages/daily/latest')
    ).resolves.toEqual({
      id: 1,
      title: 'ok',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://localhost:8000/api/users/token'
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://localhost:8000/stock/api/pages/daily/latest'
    );
    const [, apiInit] = fetchMock.mock.calls[1] ?? [];
    expect(apiInit?.headers).toBeInstanceOf(Headers);
    expect(
      (apiInit?.headers as Headers | undefined)?.get('Authorization')
    ).toBe('Bearer issued-token');
  });

  it('does not fall back to env or implicit dev tokens when runtime bootstrap has no token', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_API_BEARER_TOKEN', 'issued-token');
    vi.stubEnv('VITE_DEV_BEARER_TOKEN', 'dev-token');
    vi.stubEnv('VITE_APP_ENV', 'development');
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockImplementation((input) => {
        if (input === 'http://localhost:8000/api/users/token') {
          return Promise.resolve(createJsonResponse({ accessToken: '   ' }));
        }

        return Promise.resolve(
          createJsonResponse({
            success: true,
            data: { id: 1, title: 'ok' },
          })
        );
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(bootstrapAuth()).resolves.toMatchObject({
      status: 'bypassed',
      accessToken: null,
    });

    await apiRequest('/stock/api/pages/daily/latest');

    const [, init] = fetchMock.mock.calls[1] ?? [];
    expect((init?.headers as Headers | undefined)?.has('Authorization')).toBe(
      false
    );
  });

  it('preserves caller-supplied authorization headers', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockImplementation((input) => {
        if (input === 'http://localhost:8000/api/users/token') {
          return Promise.resolve(
            createJsonResponse({ accessToken: 'issued-token' })
          );
        }

        return Promise.resolve(
          createJsonResponse({
            success: true,
            data: { id: 1, title: 'ok' },
          })
        );
      });
    vi.stubGlobal('fetch', fetchMock);

    await bootstrapAuth();

    await apiRequest('/stock/api/pages/daily/latest', {
      headers: {
        Authorization: 'Bearer custom-token',
      },
    });

    const [, init] = fetchMock.mock.calls[1] ?? [];
    expect((init?.headers as Headers | undefined)?.get('Authorization')).toBe(
      'Bearer custom-token'
    );
  });

  it('throws ApiError on non-ok responses', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
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

  it('formats FastAPI 422 detail arrays into readable field messages', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubGlobal(
      'fetch',
      vi
        .fn<
          (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
        >()
        .mockResolvedValue(
          createJsonResponse(
            {
              detail: [
                {
                  loc: ['query', 'business_date'],
                  msg: 'Input should be a valid date',
                },
                {
                  loc: ['body', 'force'],
                  msg: 'Input should be a valid boolean',
                },
              ],
            },
            { status: 422 }
          )
        )
    );

    await expect(
      apiRequest('/stock/api/pages/daily/latest')
    ).rejects.toMatchObject({
      message:
        'API request failed with status 422. business_date: Input should be a valid date; force: Input should be a valid boolean',
      status: 422,
    });
  });

  it('uses a more specific message for 401 responses', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
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
