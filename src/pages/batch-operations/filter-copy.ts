import type { FilterErrors } from '@/components/ui/use-filter-draft';
import { getRelativeIso, getTodayIso, isValidIsoDate } from '@/lib/kst-date';

export type BatchFilterDraft = {
  from: string;
  to: string;
  status: string;
  type: string;
};

export const BATCH_STATUSES = ['SUCCESS', 'PARTIAL', 'FAILED', 'RUNNING'];

/** API enum is canonical; legacy fixture names are not sent to the backend. */
export const BATCH_TYPES = ['NEWS_COLLECTION', 'MARKET_SNAPSHOT'];

const STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: '전체 상태' },
  { value: 'SUCCESS', label: 'SUCCESS · 성공' },
  { value: 'PARTIAL', label: 'PARTIAL · 부분 생성' },
  { value: 'FAILED', label: 'FAILED · 생성 실패' },
  { value: 'RUNNING', label: 'RUNNING · 실행 중' },
];

const TYPE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: '전체 타입' },
  { value: 'NEWS_COLLECTION', label: '검색 결과 저장' },
  { value: 'MARKET_SNAPSHOT', label: '스냅샷 생성' },
];

export function getBatchStatusOptions() {
  return STATUS_OPTIONS;
}

export function getBatchTypeOptions() {
  return TYPE_OPTIONS;
}

export function getBatchStatusSummaryLabel(status: string): string {
  return (
    STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    '전체 상태'
  );
}

export function getBatchTypeSummaryLabel(type: string): string {
  return (
    TYPE_OPTIONS.find((option) => option.value === type)?.label ?? '전체 타입'
  );
}

export function getDefaultBatchFilters(): BatchFilterDraft {
  return {
    from: getRelativeIso(14),
    to: getTodayIso(),
    status: '',
    type: '',
  };
}

export function validateBatchFilters(
  draft: BatchFilterDraft
): FilterErrors<BatchFilterDraft> {
  const errors: FilterErrors<BatchFilterDraft> = {};
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
