import { describe, expect, it, vi, afterEach } from 'vitest';

import { ApiError, apiRequest } from './client';

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('unwraps the data payload from the API envelope', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 1, title: 'ok' },
        }),
      }),
    );

    await expect(apiRequest<{ id: number; title: string }>('/stock/api/pages/daily/latest')).resolves.toEqual({
      id: 1,
      title: 'ok',
    });
  });

  it('throws ApiError on non-ok responses', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
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
});
