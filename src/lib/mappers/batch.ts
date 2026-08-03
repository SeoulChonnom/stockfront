import type {
  BatchJobDetailResponse,
  BatchJobListItemResponse,
  BatchJobListResponse,
} from '../api/types';
import { formatDurationSeconds, formatKstDateTime } from '../formatters';
import { computeTotalPages } from '../utils';
import type { BatchJobsView, BatchRun, BatchSummaryView } from '../view-models';
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

function mapBatchListItemToRun(item: BatchJobListItemResponse): BatchRun {
  const jobName = asString(item.jobName, 'batch');
  const status = toUpperStatus(item.status, batchJobStatuses);

  return {
    id: asFiniteNumber(item.jobId, 0),
    jobName,
    market: asString(item.marketScope, 'N/A'),
    businessDate: asString(item.businessDate, '-'),
    status,
    // D10: absolute KST datetime ("2026-07-27 06:10 KST"), not the
    // time-only `formatTime` produced ("06:10:00") — the design's history
    // list subline and the detail panel's 시작/종료 both use this format.
    startedAt: formatKstDateTime(item.startedAt) ?? '-',
    finishedAt: formatKstDateTime(item.endedAt) ?? '-',
    duration: formatDurationSeconds(
      asNullableFiniteNumber(item.durationSeconds)
    ),
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
): BatchJobsView {
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
  };
}

export function mapBatchDetailToRun(
  response: BatchJobDetailResponse
): BatchRun {
  const jobName = asString(response.jobName, 'batch');

  return {
    id: asFiniteNumber(response.jobId, 0),
    jobName,
    market: 'N/A',
    businessDate: asString(response.businessDate, '-'),
    status: toUpperStatus(response.status, batchJobStatuses),
    // D10: see the matching comment in `mapBatchListItemToRun` above.
    startedAt: formatKstDateTime(response.startedAt) ?? '-',
    finishedAt: formatKstDateTime(response.endedAt) ?? '-',
    duration: formatDurationSeconds(
      asNullableFiniteNumber(response.durationSeconds)
    ),
    counts: `${asFiniteNumber(response.rawNewsCount, 0)} / ${asFiniteNumber(response.processedNewsCount, 0)} / ${asFiniteNumber(response.clusterCount, 0)}`,
    detail:
      asOptionalString(response.logSummary) ??
      asOptionalString(response.errorMessage) ??
      asOptionalString(response.partialMessage) ??
      `${jobName} 배치 상세 메시지가 없습니다.`,
    pageVersion:
      asNullableFiniteNumber(response.pageVersionNo) === null
        ? '-'
        : `v${asNullableFiniteNumber(response.pageVersionNo)}`,
    errorCode: asNullableString(response.errorCode),
    errorMessage: asNullableString(response.errorMessage),
    logSummary: asNullableString(response.logSummary),
    forceRun: asOptionalBoolean(response.forceRun),
    rebuildPageOnly: asOptionalBoolean(response.rebuildPageOnly),
  };
}
