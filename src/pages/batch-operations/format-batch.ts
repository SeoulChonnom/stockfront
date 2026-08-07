import { isMarketSnapshotJobType } from '@/lib/batch-type';

export { formatDurationKo } from '@/lib/formatters';

export function isRunningStatus(rawStatus: string): boolean {
  return rawStatus.trim().toUpperCase() === 'RUNNING';
}

export function isRetryableStatus(rawStatus: string): boolean {
  const normalized = rawStatus.trim().toUpperCase();
  return normalized === 'FAILED' || normalized === 'PARTIAL';
}

/** Distinguishes absent snapshots from unsupported job types; unknown types stay explicit. */
export function getSnapshotLabel(run: {
  jobType: string;
  pageId: number | null;
  pageVersion: string;
}): string {
  if (run.pageId !== null) {
    return `pageId ${run.pageId} · ${run.pageVersion}`;
  }

  if (run.jobType === 'NEWS_COLLECTION') {
    return '스냅샷 대상 아님';
  }

  return isMarketSnapshotJobType(run.jobType)
    ? '스냅샷 없음'
    : '스냅샷 정보 확인 불가';
}

/** Derives impact only from fields reported by the detail DTO; never invents counts or markets. */
export function deriveUserImpact(run: {
  jobType: string;
  rawStatus: string;
  pageId: number | null;
  businessDate: string;
  detail: string;
}): string[] {
  // Impact copy is only valid for generated market snapshots.
  if (!isMarketSnapshotJobType(run.jobType)) {
    return [];
  }

  const status = run.rawStatus.trim().toUpperCase();

  if (status === 'FAILED') {
    const impacts = [`${run.businessDate} 시장 스냅샷이 생성되지 않았습니다.`];

    if (run.pageId === null) {
      impacts.push(`${run.businessDate} 아카이브 항목이 생성되지 않았습니다.`);
      impacts.push('해당 날짜의 클러스터 상세로 진입할 수 없습니다.');
    }

    return impacts;
  }

  if (status === 'PARTIAL') {
    const impacts = [
      `${run.businessDate} 스냅샷이 일부 데이터가 누락된 상태로 생성됐습니다.`,
    ];

    if (run.detail) {
      impacts.push(run.detail);
    }

    return impacts;
  }

  return [];
}

function getKstDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? '01';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Today's KST calendar date as `YYYY-MM-DD`, used as the Trigger dialog's default `businessDate`. */
export function getTodayKstDateString(now: Date = new Date()): string {
  return getKstDateParts(now);
}
