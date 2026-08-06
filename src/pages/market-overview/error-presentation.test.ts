import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';

import { buildFetchErrorPresentation } from './error-presentation';

describe('buildFetchErrorPresentation', () => {
  it('describes rate limiting as a manual retry instead of promising an auto-retry', () => {
    const presentation = buildFetchErrorPresentation(
      new ApiError('rate limited', 429, null)
    );

    expect(presentation).toMatchObject({
      code: '429 · RATE_LIMITED',
      title: '요청이 너무 많습니다',
      actionLabel: '지금 다시 시도',
      actionKind: 'retry',
      isNotFound: false,
    });
    expect(presentation.message).toBe('잠시 기다린 뒤 다시 시도해 주세요.');
    expect(presentation.message).not.toContain('자동');
  });
});
