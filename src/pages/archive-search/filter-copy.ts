import type { FilterErrors } from '@/components/ui/use-filter-draft';

/**
 * Archive Search filter copy + validation — README §7-4.
 *
 * Kept local to `archive-search/` (not `src/lib/**`, out of scope for this
 * phase) even though `getTodayIso`/`getRelativeIso` duplicate the private
 * helpers in `src/lib/app-state.ts` (`parseListFilters`'s defaults). They
 * aren't exported from there, and this phase's file ownership excludes
 * `app-state.ts` — duplicating ~4 lines of date math here is cheaper and
 * safer than widening that file's public surface from an unrelated phase.
 * Both copies use the same `toISOString().slice(0, 10)` (UTC date, not
 * host-local) convention so a "초기화" round-trip through the URL produces
 * the exact same `from`/`to` that `parseListFilters` itself would default
 * to.
 */

export type ArchiveFilterDraft = {
  from: string;
  to: string;
  status: string;
};

export const ARCHIVE_SEARCH_STATUSES = ['READY', 'PARTIAL', 'FAILED'];

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

export function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getRelativeIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function getDefaultArchiveFilters(): ArchiveFilterDraft {
  return {
    from: getRelativeIso(14),
    to: getTodayIso(),
    status: '',
  };
}

/**
 * README §7-4 validation, in the exact three categories the handoff spec
 * calls out: date format, future date, and start-after-end ordering. Applied
 * to both `from` and `to` individually first (format, then future-date);
 * the range check only runs once both fields are individually valid, and is
 * attached to `from` (the field a user would naturally fix first, and the
 * one `useFilterDraft.focusFirstInvalid` will therefore focus).
 */
export function validateArchiveFilters(
  draft: ArchiveFilterDraft
): FilterErrors<ArchiveFilterDraft> {
  const errors: FilterErrors<ArchiveFilterDraft> = {};
  const today = getTodayIso();

  (['from', 'to'] as const).forEach((key) => {
    const value = draft[key];

    if (!DATE_FORMAT_REGEX.test(value)) {
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
