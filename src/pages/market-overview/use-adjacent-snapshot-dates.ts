import { useArchiveList } from '@/lib/query-hooks';

/**
 * 실제 존재하는 직전·직후 스냅샷 날짜.
 *
 * 인접 영업일 전용 엔드포인트가 없어(docs/backend-dependencies.md D-05)
 * 기준일 ±90일 범위를 아카이브 목록으로 한 번 조회해 계산한다. 백엔드가
 * adjacentDates를 제공하면 이 훅을 제거한다.
 *
 * `enabled=false`(예: Latest 라우트)에서는 실제 조회를 하지 않는다 — 훅
 * 자체는 항상 호출돼야 하므로(React Hooks 규칙) 조건은 인자로 받아 쿼리의
 * `enabled` 옵션으로 전달한다. 조회가 실패하거나 아직 로딩 중이면 날짜를
 * 추측하지 않고 둘 다 `null`을 돌려준다 — 잘못된 날짜로 보내는 것보다
 * 버튼을 일시적으로 비활성화하는 편이 낫다.
 */

const WINDOW_DAYS = 90;
const WINDOW_SIZE = 200;

export type AdjacentDates = {
  previous: string | null;
  next: string | null;
  isLoading: boolean;
};

function shiftIsoDate(isoDate: string, days: number): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  parsed.setUTCDate(parsed.getUTCDate() + days);

  return parsed.toISOString().slice(0, 10);
}

export function useAdjacentSnapshotDates(
  businessDate: string,
  enabled = true
): AdjacentDates {
  const { data, isLoading } = useArchiveList(
    {
      fromDate: shiftIsoDate(businessDate, -WINDOW_DAYS),
      toDate: shiftIsoDate(businessDate, WINDOW_DAYS),
      page: 1,
      size: WINDOW_SIZE,
    },
    enabled
  );

  if (isLoading || !data) {
    return { previous: null, next: null, isLoading };
  }

  const dates = data.rows
    .map((row) => row.businessDate)
    .filter((date) => date !== businessDate)
    .sort();

  const earlier = dates.filter((date) => date < businessDate);
  const later = dates.filter((date) => date > businessDate);

  return {
    previous: earlier.length > 0 ? earlier[earlier.length - 1] : null,
    next: later.length > 0 ? later[0] : null,
    isLoading: false,
  };
}
