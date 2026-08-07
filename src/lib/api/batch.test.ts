import { afterEach, describe, expect, it, vi } from 'vitest';
import { retryAiSummary } from './batch';
import type { AiRetryRunResponse } from './types';

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('retryAiSummary', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('posts to the job retry-ai endpoint with one idempotency key and returns the typed response', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        createJsonResponse({
          success: true,
          data: {
            jobId: 1043,
            jobName: 'market_snapshot_ai_retry',
            businessDate: '2026-07-26',
            status: 'RUNNING',
            runMode: 'AI_SUMMARY_RETRY',
            sourceJobId: 1042,
            sourcePageId: 501,
            idempotencyKey: 'retry-key-1',
            startedAt: '2026-08-07T08:24:31Z',
          },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const response = await retryAiSummary(
      1042,
      '11111111-1111-4111-8111-111111111111'
    );
    const typedResponse: AiRetryRunResponse = response;

    expect(typedResponse).toMatchObject({
      jobId: 1043,
      runMode: 'AI_SUMMARY_RETRY',
      sourceJobId: 1042,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      'http://localhost:8000/stock/api/batch/jobs/1042/retry-ai'
    );
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeUndefined();
    const requestHeaders = init?.headers;
    expect(requestHeaders).toBeInstanceOf(Headers);
    if (!(requestHeaders instanceof Headers)) {
      throw new Error('expected API headers to be a Headers instance');
    }
    expect(requestHeaders.get('Idempotency-Key')).toBe(
      '11111111-1111-4111-8111-111111111111'
    );
  });
});
