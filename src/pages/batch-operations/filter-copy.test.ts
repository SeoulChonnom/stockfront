import { describe, expect, it, vi } from 'vitest';

import {
  BATCH_TYPES,
  getBatchStatusOptions,
  getBatchStatusSummaryLabel,
  getBatchTypeOptions,
  getBatchTypeSummaryLabel,
  getDefaultBatchFilters,
  validateBatchFilters,
} from './filter-copy';

describe('getDefaultBatchFilters', () => {
  it('D6: defaults to the KST calendar date, not the UTC one, in the early-KST-morning boundary window', () => {
    // Same boundary case as `archive-search/filter-copy.test.ts` — both
    // pages duplicate the same KST-default logic on purpose (see that
    // file's header comment and this file's `getDefaultBatchFilters`).
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-26T15:30:00Z'));

    try {
      expect(getDefaultBatchFilters()).toEqual({
        from: '2026-07-13',
        to: '2026-07-27',
        status: '',
        type: '',
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('getBatchStatusOptions', () => {
  it('exposes 전체/SUCCESS/PARTIAL/FAILED/RUNNING in that exact order (design v2 2074행)', () => {
    expect(getBatchStatusOptions().map((option) => option.value)).toEqual([
      '',
      'SUCCESS',
      'PARTIAL',
      'FAILED',
      'RUNNING',
    ]);
    expect(getBatchStatusOptions().map((option) => option.label)).toEqual([
      '전체 상태',
      'SUCCESS · 성공',
      'PARTIAL · 부분 생성',
      'FAILED · 생성 실패',
      'RUNNING · 실행 중',
    ]);
  });
});

describe('getBatchTypeOptions', () => {
  it('uses the API BatchJobType enum values (NEWS_COLLECTION/MARKET_SNAPSHOT), not the design fixture values', () => {
    expect(getBatchTypeOptions().map((option) => option.value)).toEqual([
      '',
      'NEWS_COLLECTION',
      'MARKET_SNAPSHOT',
    ]);
    expect(BATCH_TYPES).toEqual(['NEWS_COLLECTION', 'MARKET_SNAPSHOT']);
  });

  it('labels the API enum values with the design copy (검색 결과 저장/스냅샷 생성)', () => {
    expect(getBatchTypeOptions().map((option) => option.label)).toEqual([
      '전체 타입',
      '검색 결과 저장',
      '스냅샷 생성',
    ]);
  });
});

describe('getBatchStatusSummaryLabel', () => {
  it('falls back to 전체 상태 for an empty/unknown value', () => {
    expect(getBatchStatusSummaryLabel('')).toBe('전체 상태');
    expect(getBatchStatusSummaryLabel('NOT_A_STATUS')).toBe('전체 상태');
  });

  it('returns the matching option label for a known status', () => {
    expect(getBatchStatusSummaryLabel('RUNNING')).toBe('RUNNING · 실행 중');
  });
});

describe('getBatchTypeSummaryLabel', () => {
  it('falls back to 전체 타입 for an empty/unknown value', () => {
    expect(getBatchTypeSummaryLabel('')).toBe('전체 타입');
    expect(getBatchTypeSummaryLabel('SEARCH_SAVE')).toBe('전체 타입');
  });

  it('returns the matching option label for a known type', () => {
    expect(getBatchTypeSummaryLabel('NEWS_COLLECTION')).toBe('검색 결과 저장');
    expect(getBatchTypeSummaryLabel('MARKET_SNAPSHOT')).toBe('스냅샷 생성');
  });
});

describe('validateBatchFilters', () => {
  const today = '2026-07-27';

  it('accepts a valid from<=to range within today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${today}T00:00:00+09:00`));
    try {
      expect(
        validateBatchFilters({
          from: '2026-07-13',
          to: '2026-07-27',
          status: '',
          type: '',
        })
      ).toEqual({});
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects a malformed date with the exact message', () => {
    expect(
      validateBatchFilters({
        from: '2026/07/13',
        to: '2026-07-27',
        status: '',
        type: '',
      })
    ).toEqual({
      from: '날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해 주세요.',
    });
  });

  it('rejects a future `to` date with the exact §7-4 message', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${today}T00:00:00+09:00`));
    try {
      expect(
        validateBatchFilters({
          from: '2026-07-13',
          to: '2099-01-01',
          status: '',
          type: '',
        })
      ).toEqual({
        to: `미래 날짜는 선택할 수 없습니다. 오늘(${today})까지 조회할 수 있습니다.`,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects from > to with the exact swap message, attached to `from`', () => {
    expect(
      validateBatchFilters({
        from: '2026-07-27',
        to: '2026-07-13',
        status: '',
        type: '',
      })
    ).toEqual({
      from: '시작일이 종료일보다 늦습니다. 두 날짜를 바꿔 입력해 주세요.',
    });
  });
});
