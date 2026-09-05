import type { FilterErrors } from '@/components/domain/use-filter-draft';
import type { MarketTypeResponse } from '@/lib/api/types';
import { getRelativeIso, getTodayIso, isValidIsoDate } from '@/lib/kst-date';

export type ArchiveFilterDraft = {
  from: string;
  to: string;
  status: string;
  market: MarketTypeResponse | '';
  themes: string[];
  q: string;
};

export const ARCHIVE_SEARCH_STATUSES = ['READY', 'PARTIAL'];

// 라벨은 결과 테이블의 `StatusBadge`와 같은 한국어만 노출한다 — `READY`/
// `PARTIAL`은 API·URL 계약으로만 남고 화면 문구에는 더 이상 등장하지 않는다.
const STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: '전체 상태' },
  { value: 'READY', label: '준비 완료' },
  { value: 'PARTIAL', label: '부분 생성' },
];

export function getStatusOptions() {
  return STATUS_OPTIONS;
}

export function getStatusSummaryLabel(status: string): string {
  return (
    STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    '전체 상태'
  );
}

// 시장 코드도 상태와 같은 이유로 라벨에서 뺀다 — 드롭다운과 칩이 각자
// `KR`/`US`를 따로 붙여 그리던 것을 이 한 곳으로 합친다.
const MARKET_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: '전체 시장' },
  { value: 'KR', label: '한국' },
  { value: 'US', label: '미국' },
];

export function getMarketOptions() {
  return MARKET_OPTIONS;
}

export function getMarketSummaryLabel(value: string): string {
  return (
    MARKET_OPTIONS.find((option) => option.value === value)?.label ??
    '전체 시장'
  );
}

export function getDefaultArchiveFilters(): ArchiveFilterDraft {
  return {
    from: getRelativeIso(14),
    to: getTodayIso(),
    status: '',
    market: '',
    themes: [],
    q: '',
  };
}

/** Validates format, future dates, then start-after-end ordering. */
export function validateArchiveFilters(
  draft: ArchiveFilterDraft
): FilterErrors<ArchiveFilterDraft> {
  const errors: FilterErrors<ArchiveFilterDraft> = {};
  const today = getTodayIso();

  (['from', 'to'] as const).forEach((key) => {
    const value = draft[key];

    if (!isValidIsoDate(value)) {
      // `<input type="date">`는 브라우저 로캘로 렌더돼(`08/23/2026` 등)
      // `YYYY-MM-DD` 형식을 사용자에게 보여준 적도, 타이핑으로 받은 적도
      // 없다 — 그 형식을 지시하는 메시지는 화면에 없는 입력 방법을
      // 안내하는 셈이라 날짜 선택 자체를 요청하는 문구로 바꾼다.
      errors[key] = '기준일을 선택해 주세요.';
      return;
    }

    if (value > today) {
      errors[key] =
        `미래 날짜는 선택할 수 없습니다. 오늘(${today})까지 조회할 수 있습니다.`;
    }
  });

  if (!errors.from && !errors.to && draft.from > draft.to) {
    errors.from = '시작일이 종료일보다 늦습니다. 두 날짜를 바꿔 입력해 주세요.';
  }

  const normalizedQuery = (draft.q ?? '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ');
  if (normalizedQuery.length > 0) {
    if (normalizedQuery.length < 2) {
      errors.q = '검색어는 2자 이상 입력해 주세요.';
    } else if (normalizedQuery.length > 100) {
      errors.q = '검색어는 100자 이하로 입력해 주세요.';
    } else if (normalizedQuery.split(' ').length > 10) {
      errors.q = '검색어는 최대 10개 단어까지 입력해 주세요.';
    }
  }

  return errors;
}
