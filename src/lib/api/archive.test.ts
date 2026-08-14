import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetAuthBootstrapForTesting } from '../auth-bootstrap';
import { getArchiveList, getArchiveThemes } from './archive';

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });
}

describe('archive API', () => {
  afterEach(() => {
    resetAuthBootstrapForTesting();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('fetches the recursive active theme catalog from the documented endpoint', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        createJsonResponse({
          success: true,
          data: [
            {
              code: 'SECTOR',
              label: '업종',
              description: '기업의 주요 사업 영역',
              children: [],
            },
          ],
        })
      );
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;

    await expect(getArchiveThemes(signal)).resolves.toEqual([
      {
        code: 'SECTOR',
        label: '업종',
        description: '기업의 주요 사업 영역',
        children: [],
      },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/stock/api/pages/archive/themes',
      expect.objectContaining({ signal })
    );
  });

  it('passes archive market, repeated theme, and q filters through the list client', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        createJsonResponse({
          success: true,
          data: {
            items: [],
            pagination: { page: 1, size: 30, totalCount: 0 },
          },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    await getArchiveList({
      marketType: 'KR',
      theme: ['SECTOR', 'MARKET_FLOW_INVESTOR'],
      q: '외국인 매수',
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://localhost:8000/stock/api/pages/archive?marketType=KR&theme=SECTOR&theme=MARKET_FLOW_INVESTOR&q=%EC%99%B8%EA%B5%AD%EC%9D%B8+%EB%A7%A4%EC%88%98'
    );
  });
});
