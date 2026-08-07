import type { FilterErrors } from '@/components/ui/use-filter-draft';
import { getRelativeIso, getTodayIso, isValidIsoDate } from '@/lib/kst-date';

export type ArchiveFilterDraft = {
  from: string;
  to: string;
  status: string;
};

export const ARCHIVE_SEARCH_STATUSES = ['READY', 'PARTIAL', 'FAILED'];

const STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: '전체 상태' },
  { value: 'READY', label: 'READY · 준비 완료' },
  { value: 'PARTIAL', label: 'PARTIAL · 부분 생성' },
  { value: 'FAILED', label: 'FAILED · 생성 실패' },
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

export function getDefaultArchiveFilters(): ArchiveFilterDraft {
  return {
    from: getRelativeIso(14),
    to: getTodayIso(),
    status: '',
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
      errors[key] =
        '날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해 주세요.';
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

  return errors;
}
