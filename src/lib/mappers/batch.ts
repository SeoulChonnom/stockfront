import type {
  BatchJobDetailResponse,
  BatchJobListItemResponse,
  BatchJobListResponse,
} from '../api/types';
import {
  formatDurationKo,
  formatDurationSeconds,
  formatKstDateTime,
} from '../formatters';
import { computeTotalPages } from '../utils';
import type {
  BatchJobsViewWithCounts,
  BatchRunRow,
  BatchSummaryView,
} from '../view-models';
import {
  asFiniteNumber,
  asNullableFiniteNumber,
  asNullableString,
  asOptionalBoolean,
  asOptionalString,
  asString,
  toUpperStatus,
} from './coerce';

/**
 * 배치 작업 상태 허용값.
 *
 * `docs/api_spec_doc.md`(§배치 작업 상태 표)는 batch job status를
 * `PENDING | RUNNING | SUCCESS | PARTIAL | FAILED`로 정의한다. 과거에는
 * `['SUCCESS','PARTIAL','FAILED']`만 허용해서 `toUpperStatus`의 fallback이
 * 실행 중(RUNNING)·대기(PENDING) 작업을 전부 `FAILED`로 떨어뜨렸고,
 * 그 결과 정상 진행 중인 배치가 빨간 '생성 실패' 배지로 표시됐다.
 * 상태를 임의로 축소하지 말 것 — StatusBadge가 6개 상태를 모두 렌더한다.
 */
const batchJobStatuses = [
  'PENDING',
  'RUNNING',
  'SUCCESS',
  'PARTIAL',
  'FAILED',
] as const;

function toRawStatus(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value : 'UNKNOWN';
}

function mapBatchListItemToRun(item: BatchJobListItemResponse): BatchRunRow {
  const jobName = asString(item.jobName, 'batch');
  const status = toUpperStatus(item.status, batchJobStatuses);

  return {
    id: asFiniteNumber(item.jobId, 0),
    jobName,
    jobType: asString(item.jobType, ''),
    currentStep: asNullableString(item.currentStep),
    market: asString(item.marketScope, 'N/A'),
    businessDate: asString(item.businessDate, '-'),
    status,
    // D10: absolute KST datetime ("2026-07-27 06:10 KST"), not the
    // time-only `formatTime` produced ("06:10:00") — the design's history
    // list subline and the detail panel's 시작/종료 both use this format.
    startedAt: formatKstDateTime(item.startedAt) ?? '-',
    finishedAt: formatKstDateTime(item.endedAt) ?? '-',
    // 레퍼런스 `dur()`(1422행)는 소요를 한국어로 그린다 — 목록 행(2113행)
    // 상세(2148행) 모두. 영문 `formatDurationSeconds`를 쓰던 탓에 같은 화면
    // 안에서 요약 타일만 한글이고 테이블은 영문인 상태였다.
    duration: formatDurationKo(asNullableFiniteNumber(item.durationSeconds)),
    counts: `${asFiniteNumber(item.rawNewsCount, 0)} / ${asFiniteNumber(item.processedNewsCount, 0)} / ${asFiniteNumber(item.clusterCount, 0)}`,
    detail:
      asOptionalString(item.partialMessage) ??
      `${jobName} 배치가 ${status} 상태로 기록되었습니다.`,
    pageVersion:
      asNullableFiniteNumber(item.pageVersionNo) === null
        ? '-'
        : `v${asNullableFiniteNumber(item.pageVersionNo)}`,
    // The batch job LIST DTO (`BatchJobListItemResponse`) has no errorCode /
    // errorMessage / logSummary / forceRun / rebuildPageOnly fields — those
    // only exist on the DETAIL response. Kept `null` here for a uniform
    // `BatchRun` shape; `mapBatchDetailToRun` below populates them.
    errorCode: null,
    errorMessage: null,
    logSummary: null,
    forceRun: null,
    rebuildPageOnly: null,
    // §7-6/§7-7: see the `BatchRunRow` doc comment in view-models.ts for why
    // these two ride along with every row.
    pageId: item.pageId ?? null,
    rawStatus: toRawStatus(item.status),
  };
}

function mapBatchSummary(response: BatchJobListResponse): BatchSummaryView {
  const successCount = asFiniteNumber(response.summary.successCount, 0);
  const partialCount = asFiniteNumber(response.summary.partialCount, 0);
  const failedCount = asFiniteNumber(response.summary.failedCount, 0);
  const totalRuns = successCount + partialCount + failedCount;
  const successRate =
    totalRuns === 0
      ? '0.0%'
      : `${((successCount / totalRuns) * 100).toFixed(1)}%`;

  return {
    successRate,
    avgProcessingTime: formatDurationSeconds(
      asNullableFiniteNumber(response.summary.avgDurationSeconds)
    ),
    marketSyncQuality: failedCount === 0 ? 'Stable' : 'Attention',
    successSupporting: `${successCount} success / ${failedCount} failed`,
    durationSupporting: `Average across ${totalRuns} runs`,
    qualitySupporting:
      failedCount === 0
        ? 'No failed jobs in current result set'
        : `${failedCount} failed job(s) detected`,
  };
}

export function mapBatchJobsToView(
  response: BatchJobListResponse
): BatchJobsViewWithCounts {
  return {
    rows: response.items.map(mapBatchListItemToRun),
    page: asFiniteNumber(response.pagination.page, 1),
    size: asFiniteNumber(response.pagination.size, 1),
    totalCount: asFiniteNumber(response.pagination.totalCount, 0),
    totalPages: computeTotalPages(
      asFiniteNumber(response.pagination.totalCount, 0),
      asFiniteNumber(response.pagination.size, 1)
    ),
    summary: mapBatchSummary(response),
    // §7-6 실패 우선 요약 타일은 `mapBatchSummary`가 만드는 사전 포맷팅된
    // 영문 문자열(successRate 등)이 아니라 원본 카운트 자체가 필요하다.
    counts: {
      successCount: response.summary.successCount,
      partialCount: response.summary.partialCount,
      failedCount: response.summary.failedCount,
      avgDurationSeconds:
        typeof response.summary.avgDurationSeconds === 'number'
          ? response.summary.avgDurationSeconds
          : null,
    },
  };
}

/**
 * BUG FIX: this used to read rawNewsCount/processedNewsCount/clusterCount/
 * pageId/pageVersionNo/forceRun/rebuildPageOnly off the TOP LEVEL of the
 * response. Per `docs/api_spec.json` (the real contract —
 * `docs/api_spec_doc.md` is the old, no-longer-accurate single-batch model),
 * all seven moved into a nullable `snapshot` sub-object
 * (`BatchJobSnapshotDetail`) — reading them flat always produced 0/0/0,
 * '스냅샷 없음', and force=false against the real API, regardless of the
 * actual job. `snapshot` is `null` for a NEWS_COLLECTION job (it never
 * produces one); the coerce helpers below fall back safely on that
 * `undefined`, and the DETAIL PANEL (not this mapper) is responsible for not
 * rendering the resulting counts/실행 옵션 rows for that jobType — see
 * `batch-detail-panel.tsx`'s 3-way snapshot label branch.
 */
export function mapBatchDetailToRun(
  response: BatchJobDetailResponse
): BatchRunRow {
  const jobName = asString(response.jobName, 'batch');
  const snapshot = response.snapshot;

  return {
    id: asFiniteNumber(response.jobId, 0),
    jobName,
    jobType: asString(response.jobType, ''),
    currentStep: asNullableString(response.currentStep),
    market: 'N/A',
    businessDate: asString(response.businessDate, '-'),
    status: toUpperStatus(response.status, batchJobStatuses),
    // D10: see the matching comment in `mapBatchListItemToRun` above.
    startedAt: formatKstDateTime(response.startedAt) ?? '-',
    finishedAt: formatKstDateTime(response.endedAt) ?? '-',
    // 목록 행과 동일 — 위 `mapBatchListItemToRun`의 주석 참고.
    duration: formatDurationKo(
      asNullableFiniteNumber(response.durationSeconds)
    ),
    counts: `${asFiniteNumber(snapshot?.rawNewsCount, 0)} / ${asFiniteNumber(snapshot?.processedNewsCount, 0)} / ${asFiniteNumber(snapshot?.clusterCount, 0)}`,
    detail:
      asOptionalString(response.logSummary) ??
      asOptionalString(response.errorMessage) ??
      asOptionalString(response.partialMessage) ??
      `${jobName} 배치 상세 메시지가 없습니다.`,
    pageVersion:
      asNullableFiniteNumber(snapshot?.pageVersionNo) === null
        ? '-'
        : `v${asNullableFiniteNumber(snapshot?.pageVersionNo)}`,
    errorCode: asNullableString(response.errorCode),
    errorMessage: asNullableString(response.errorMessage),
    logSummary: asNullableString(response.logSummary),
    forceRun: asOptionalBoolean(snapshot?.forceRun),
    rebuildPageOnly: asOptionalBoolean(snapshot?.rebuildPageOnly),
    pageId: snapshot?.pageId ?? null,
    rawStatus: toRawStatus(response.status),
  };
}
