import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetAuthBootstrapForTesting } from '../auth-bootstrap';
import { getDailyPageByPageId } from './pages';

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });
}

describe('page API', () => {
  afterEach(() => {
    resetAuthBootstrapForTesting();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('fetches archive page detail by documented pageId path', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        createJsonResponse({
          success: true,
          data: {
            pageId: 42,
            businessDate: '2026-03-31',
            versionNo: 2,
            pageTitle: 'Archive',
            status: 'READY',
            globalHeadline: 'headline',
            generatedAt: '2026-03-31T06:12:00Z',
            partialMessage: null,
            markets: [],
            metadata: {
              rawNewsCount: 0,
              processedNewsCount: 0,
              clusterCount: 0,
              lastUpdatedAt: '2026-03-31T06:12:00Z',
            },
          },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getDailyPageByPageId(42)).resolves.toMatchObject({
      pageId: 42,
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://localhost:8000/stock/api/pages/42'
    );
  });
});
