/**
 * Batch Operations-only formatting/derivation helpers (README §7-6/§7-7).
 *
 * `src/lib/formatters.ts` is out of this phase's file ownership (see the
 * phase brief's "DO NOT touch ... src/lib/**" list), and it has no Korean
 * duration formatter ("3분 10초") — `formatDurationSeconds` there returns
 * English "3m 10s". Rather than edit a file another phase owns, this page
 * keeps its own small formatter.
 */

export function formatDurationKo(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    return '-';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes <= 0) {
    return `${remainingSeconds}초`;
  }

  return remainingSeconds > 0
    ? `${minutes}분 ${remainingSeconds}초`
    : `${minutes}분`;
}

export function isRunningStatus(rawStatus: string): boolean {
  return rawStatus.trim().toUpperCase() === 'RUNNING';
}

export function isRetryableStatus(rawStatus: string): boolean {
  const normalized = rawStatus.trim().toUpperCase();
  return normalized === 'FAILED' || normalized === 'PARTIAL';
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
  rawStatus: string;
  pageId: number | null;
  businessDate: string;
  detail: string;
}): string[] {
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
