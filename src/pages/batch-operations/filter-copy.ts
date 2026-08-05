import type { FilterErrors } from '@/components/ui/use-filter-draft';
import { getRelativeIso, getTodayIso } from '@/lib/kst-date';

/**
 * Batch Operations 조회 조건 필터 copy + validation — design v2
 * `docs/design_v2/handoff_v2/Market Brief v2.dc.html` 733~769행("조회 조건"
 * 카드 마크업) + 2059~2103행(옵션/라벨/검증/적용/초기화 동작).
 */

export type BatchFilterDraft = {
  from: string;
  to: string;
  status: string;
  type: string;
};

/**
 * 배치 실행 상태 허용값. 프로토타입(2074행 `opsStatusOptions`)의 순서를 그대로
 * 따른다: 전체 → SUCCESS → PARTIAL → FAILED → RUNNING. `PENDING`은 이 화면의
 * 조회 조건 옵션에 없다(프로토타입에도 없음) — 목록 자체에는 나타날 수 있지만
 * 필터링 대상은 아니다.
 */
export const BATCH_STATUSES = ['SUCCESS', 'PARTIAL', 'FAILED', 'RUNNING'];

/**
 * 배치 타입 허용값.
 *
 * **중요한 결정**: design v2 프로토타입의 fixture(`fixtures.js`)는 배치 타입
 * 값으로 `SEARCH_SAVE`/`SNAPSHOT_BUILD`를 쓰지만, 실제 API 계약
 * (`docs/api-spec.json`의 `BatchJobType` enum, `/stock/api/batch/jobs`의
 * `jobType` 쿼리 파라미터)은 `NEWS_COLLECTION`/`MARKET_SNAPSHOT`이다.
 * 이 앱은 **API enum을 정본**으로 삼는다 — URL 쿼리 값과 실제 API 호출 값
 * 모두 `NEWS_COLLECTION`/`MARKET_SNAPSHOT`을 쓰고, 화면에 보이는 라벨
 * 문구("검색 결과 저장"/"스냅샷 생성")만 디자인 프로토타입의 문구를 그대로
 * 가져온다. 즉 fixture 값 자체는 재현하지 않는다.
 */
export const BATCH_TYPES = ['NEWS_COLLECTION', 'MARKET_SNAPSHOT'];

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

/**
 * README §7-4 스타일 검증 규칙을 이 화면에 맞게 반복한다 — 문구는
 * `src/pages/archive-search/filter-copy.ts`의 `validateArchiveFilters`와
 * 정확히 동일하다(그 파일 자체가 `app-state.ts`의 날짜 기본값 로직을
 * 의도적으로 복제하고 있는 것과 같은 이유: 각 화면이 자기 자신의 필터
 * 타입에 대해 독립적으로 동작하게 하기 위함 — `ArchiveFilterDraft`와
 * `BatchFilterDraft`는 서로 다른 타입이라 함수를 그대로 공유할 수 없다).
 * `status`/`type`은 `<select>`로만 입력되어 항상 유효한 옵션 값이므로 별도
 * 검증이 필요 없다.
 */
export function validateBatchFilters(
  draft: BatchFilterDraft
): FilterErrors<BatchFilterDraft> {
  const errors: FilterErrors<BatchFilterDraft> = {};
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
