import { describe, expect, it } from 'vitest';

import {
  emptyMarketsReasonCopy,
  errorCodeCopy,
  marketNotFoundCopy,
  noHeadlineCopy,
  noIndexDataCopy,
  noNarrativeCopy,
  partialBannerCopy,
  rawErrorMessageCopy,
  serviceTagline,
  unknownErrorMessageCopy,
} from './audience-copy';

const user = { canViewOps: false };
const operator = { canViewOps: true };

const OPS_TERMS = [
  '운영 콘솔',
  '배치',
  '재실행',
  '재수집',
  '수집',
  'provider',
  '임계값',
  '로그',
  '파이프라인',
];

describe('audience-copy', () => {
  it('drops the operations console wording for regular users', () => {
    expect(serviceTagline(user)).toBe('AI 시장 브리프');
    expect(serviceTagline(operator)).toContain('운영 콘솔');
  });

  it('never leaks operator vocabulary into regular-user copy', () => {
    // A raw backend message deliberately stuffed with every forbidden term,
    // to prove the user-facing error copy discards it entirely rather than
    // just failing to happen to contain these particular words today.
    const rawMessageWithOpsTerms =
      '운영 콘솔 배치 재실행 재수집 provider 임계값 로그 파이프라인 오류';

    const userFacing = [
      noHeadlineCopy(user, { hasMarketSections: true }),
      noHeadlineCopy(user, { hasMarketSections: false }),
      noNarrativeCopy(user),
      noIndexDataCopy(user),
      partialBannerCopy(user).title,
      partialBannerCopy(user).body,
      marketNotFoundCopy(user),
      emptyMarketsReasonCopy(user, 'failed'),
      emptyMarketsReasonCopy(user, 'ready'),
      rawErrorMessageCopy(user, rawMessageWithOpsTerms),
      unknownErrorMessageCopy(user, rawMessageWithOpsTerms),
    ].join(' ');

    for (const term of OPS_TERMS) {
      expect(userFacing).not.toContain(term);
    }
  });

  it('tells regular users the brief is reference-only when data is missing', () => {
    expect(partialBannerCopy(user).body).toContain('참고용');
  });

  it('keeps the batch recovery route in operator copy', () => {
    expect(partialBannerCopy(operator).body).toContain('배치');
  });

  it('drops the 배치 mention from the regular-user snapshot-not-found message but keeps it for operators', () => {
    expect(marketNotFoundCopy(user)).not.toContain('배치');
    expect(marketNotFoundCopy(operator)).toContain('배치');
  });

  it('drops 배치/수집 vocabulary from the empty-markets reason for regular users but keeps it for operators, for both the FAILED and non-FAILED branches', () => {
    expect(emptyMarketsReasonCopy(user, 'failed')).not.toContain('배치');
    expect(emptyMarketsReasonCopy(user, 'failed')).not.toContain('수집');
    expect(emptyMarketsReasonCopy(operator, 'failed')).toContain('배치');
    expect(emptyMarketsReasonCopy(operator, 'failed')).toContain('수집');

    expect(emptyMarketsReasonCopy(user, 'ready')).not.toContain('배치');
    expect(emptyMarketsReasonCopy(user, 'ready')).not.toContain('수집');
    expect(emptyMarketsReasonCopy(operator, 'ready')).toContain('배치');
    expect(emptyMarketsReasonCopy(operator, 'ready')).toContain('수집');
  });

  it('passes the raw error message through to operators but replaces it for regular users', () => {
    const rawMessage = 'provider batch pipeline threshold 500 stack trace';

    expect(rawErrorMessageCopy(operator, rawMessage)).toBe(rawMessage);
    expect(rawErrorMessageCopy(user, rawMessage)).not.toBe(rawMessage);
    expect(rawErrorMessageCopy(user, rawMessage)).not.toContain(rawMessage);

    expect(unknownErrorMessageCopy(operator, rawMessage)).toBe(rawMessage);
    expect(unknownErrorMessageCopy(user, rawMessage)).not.toBe(rawMessage);
    expect(unknownErrorMessageCopy(user, rawMessage)).not.toContain(rawMessage);
    // An empty operator message still falls back to a Korean explanation
    // instead of rendering blank.
    expect(unknownErrorMessageCopy(operator, '')).toBe(
      '알 수 없는 오류가 발생했습니다.'
    );
  });

  it('never points at market data that is not on the page', () => {
    // FAILED 스냅샷(`markets: []`)에서 "아래 …확인할 수 있습니다"라고
    // 안내하면 사용자는 없는 데이터를 찾으러 내려간다.
    for (const audience of [user, operator]) {
      const withoutSections = noHeadlineCopy(audience, {
        hasMarketSections: false,
      });
      expect(withoutSections).not.toContain('아래');
      expect(withoutSections).not.toContain('확인');
    }

    // 헤드라인만 빠진 경우에는 반대로 남은 데이터를 안내해야 한다.
    expect(noHeadlineCopy(user, { hasMarketSections: true })).toContain('아래');
  });

  it("gives a regular user's error presentation a null code and keeps the operator's code intact", () => {
    expect(errorCodeCopy(user, '429 · RATE_LIMITED')).toBeNull();
    expect(errorCodeCopy(operator, '429 · RATE_LIMITED')).toBe(
      '429 · RATE_LIMITED'
    );
  });
});
