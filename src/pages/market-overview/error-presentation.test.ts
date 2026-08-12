import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';

import { buildFetchErrorPresentation } from './error-presentation';

const user = { canViewOps: false };
const operator = { canViewOps: true };

describe('buildFetchErrorPresentation', () => {
  it('describes rate limiting as a manual retry instead of promising an auto-retry', () => {
    const presentation = buildFetchErrorPresentation(
      new ApiError('rate limited', 429, null),
      operator
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

  it('gives a regular user a null error code and hides it from an operator only when appropriate', () => {
    const error = new ApiError('rate limited', 429, null);

    expect(buildFetchErrorPresentation(error, user).code).toBeNull();
    expect(buildFetchErrorPresentation(error, operator).code).toBe(
      '429 · RATE_LIMITED'
    );
  });

  it('keeps the 배치 wording out of the regular-user 404 message but not the operator one', () => {
    const error = new ApiError('not found', 404, null);

    const userPresentation = buildFetchErrorPresentation(error, user);
    const operatorPresentation = buildFetchErrorPresentation(error, operator);

    expect(userPresentation.code).toBeNull();
    expect(userPresentation.message).not.toContain('배치');
    expect(operatorPresentation.code).toBe('404 · PAGE_NOT_FOUND');
    expect(operatorPresentation.message).toBe(
      '배치가 실행되지 않았거나 실패한 날짜일 수 있습니다.'
    );
  });

  it('never leaks the raw malformed-response error.message to a regular user', () => {
    const error = new ApiError(
      'Envelope missing markets[] — provider batch pipeline threshold check failed',
      200,
      null
    );

    const userPresentation = buildFetchErrorPresentation(error, user);
    const operatorPresentation = buildFetchErrorPresentation(error, operator);

    expect(userPresentation.code).toBeNull();
    expect(userPresentation.message).not.toContain(error.message);
    expect(userPresentation.message).not.toContain('provider');
    expect(userPresentation.message).not.toContain('배치');
    expect(operatorPresentation.code).toBe('200 · MALFORMED_RESPONSE');
    expect(operatorPresentation.message).toBe(error.message);
  });

  it('never leaks the raw non-ApiError error.message to a regular user', () => {
    const error = new Error('TypeError: Cannot read pipeline log stream');

    const userPresentation = buildFetchErrorPresentation(error, user);
    const operatorPresentation = buildFetchErrorPresentation(error, operator);

    expect(userPresentation.code).toBeNull();
    expect(userPresentation.message).not.toContain(error.message);
    expect(operatorPresentation.code).toBe('오류');
    expect(operatorPresentation.message).toBe(error.message);
  });
});
