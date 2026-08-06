/**
 * Batch Operations-only formatting/derivation helpers (README §7-6/§7-7).
 *
 * `src/lib/formatters.ts` is out of this phase's file ownership (see the
 * phase brief's "DO NOT touch ... src/lib/**" list), and it has no Korean
 * duration formatter ("3분 10초") — `formatDurationSeconds` there returns
 * English "3m 10s". Rather than edit a file another phase owns, this page
 * keeps its own small formatter.
 */

/**
 * `src/lib/formatters.ts`로 옮겼다 — `src/lib/mappers/batch.ts`(목록/상세 행의
 * 소요)도 같은 포맷을 써야 하는데 `lib`가 `pages`를 import할 수 없기 때문.
 * 이 화면 안의 기존 호출부(`batch-summary-tiles.tsx`)가 계속 이 모듈에서
 * 가져다 쓸 수 있게 re-export만 남긴다.
 */
import { isMarketSnapshotJobType } from '@/lib/batch-type';

export { formatDurationKo } from '@/lib/formatters';

export function isRunningStatus(rawStatus: string): boolean {
  return rawStatus.trim().toUpperCase() === 'RUNNING';
}

export function isRetryableStatus(rawStatus: string): boolean {
  const normalized = rawStatus.trim().toUpperCase();
  return normalized === 'FAILED' || normalized === 'PARTIAL';
}

/**
 * "스냅샷" 라벨 3분기 — 히스토리 목록의 job-id subline과 상세 패널의 스냅샷
 * `DlItem`이 공유한다(design v2 2115행 `r.pageLabel`). `pageId`가 있으면
 * 항상 `pageId N · vN`. 없을 때는 세 가지를 구분해야 한다: NEWS_COLLECTION
 * 작업은애초에 스냅샷을 만들지 않는 job type이므로 "스냅샷 대상 아님"(이
 * 값이 나올 일이 없는 게 정상), MARKET_SNAPSHOT 작업인데 없으면 그 작업이
 * 아직/끝내 스냅샷을 만들지 못한 것이므로 "스냅샷 없음"(비정상/미완료를
 * 암시). 알려지지 않은 타입은 스냅샷 생성 계약이 있다고 추측하지
 * 않고 "스냅샷 정보 확인 불가"로 남겨 새 타입을 MARKET_SNAPSHOT처럼
 * 잘못 표시하지 않는다.
 */
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

/**
 * 사용자 영향 (§7-6 상세 패널). The real `BatchJobDetailResponse` DTO has no
 * `impact`/missing-section field (that only exists in the design-reference
 * `fixtures.js`, itself marked `[PROPOSED]`) — so this derives impact
 * statements strictly from fields the DTO actually returns: `rawStatus`,
 * `pageId`, `businessDate`, and the job's own reported `detail` text (which
 * `mapBatchDetailToRun` already resolves from `logSummary` ??
 * `errorMessage` ?? `partialMessage`). It never names specific markets,
 * indices, or article counts the backend didn't report — see
 * `src/components/ui/pipeline-stages.tsx` for the same "don't invent a
 * fact we don't have" rule applied to pipeline stages.
 */
export function deriveUserImpact(run: {
  jobType: string;
  rawStatus: string;
  pageId: number | null;
  businessDate: string;
  detail: string;
}): string[] {
  // The available impact copy is specifically about a generated market
  // snapshot. NEWS_COLLECTION and future job types must not inherit it.
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
