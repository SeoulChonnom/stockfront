import { describe, expect, it } from 'vitest';

import {
  noHeadlineCopy,
  noIndexDataCopy,
  noNarrativeCopy,
  partialBannerCopy,
  serviceTagline,
} from './audience-copy';

const user = { canViewOps: false };
const operator = { canViewOps: true };

const OPS_TERMS = [
  '운영 콘솔',
  '배치',
  '재실행',
  '재수집',
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
    const userFacing = [
      noHeadlineCopy(user),
      noNarrativeCopy(user),
      noIndexDataCopy(user),
      partialBannerCopy(user).title,
      partialBannerCopy(user).body,
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
});
