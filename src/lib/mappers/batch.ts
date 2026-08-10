import type {
  BatchJobDetailResponse,
  BatchJobListItemResponse,
  BatchJobListResponse,
  BatchJobStepRunResponse,
} from '../api/types';
import { getBatchStepLabel } from '../batch-type';
import {
  formatDurationKo,
  formatDurationMs,
  formatDurationSeconds,
  formatKstDateTime,
} from '../formatters';
import { computeTotalPages } from '../utils';
import type {
  BatchJobsViewWithCounts,
  BatchRunRow,
  BatchStepRunView,
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

/** Keep the full backend set so RUNNING/PENDING never fall back to FAILED. */
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

/** 정렬/중복 제거 없이 API 응답 순서를 그대로 유지한다(재시도도 별도 행으로 보존). */
function mapBatchStepRuns(
  steps: readonly BatchJobStepRunResponse[]
): BatchStepRunView[] {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.map((step) => {
    const stepCode = asString(step.stepCode, 'UNKNOWN_STEP');
    const status = asString(step.status, 'UNKNOWN').trim().toUpperCase();

    return {
      stepCode,
      label: getBatchStepLabel(stepCode),
      status,
      duration:
        status === 'SUCCEEDED'
          ? formatDurationMs(asNullableFiniteNumber(step.durationMs))
          : '-',
    };
  });
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
    startedAt: formatKstDateTime(item.startedAt) ?? '-',
    finishedAt: formatKstDateTime(item.endedAt) ?? '-',
    duration: formatDurationKo(asNullableFiniteNumber(item.durationSeconds)),
    counts: `${asFiniteNumber(item.rawNewsCount, 0)} / ${asFiniteNumber(item.processedNewsCount, 0)} / ${asFiniteNumber(item.clusterCount, 0)}`,
    detail:
      asOptionalString(item.partialMessage) ??
      `${jobName} 배치가 ${status} 상태로 기록되었습니다.`,
    pageVersion:
      asNullableFiniteNumber(item.pageVersionNo) === null
        ? '-'
        : `v${asNullableFiniteNumber(item.pageVersionNo)}`,
    errorCode: null,
    errorMessage: null,
    logSummary: null,
    forceRun: null,
    rebuildPageOnly: null,
    pageId: item.pageId ?? null,
    rawStatus: toRawStatus(item.status),
    steps: [],
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

/** Detail snapshot fields are nested and nullable for NEWS_COLLECTION jobs. */
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
    startedAt: formatKstDateTime(response.startedAt) ?? '-',
    finishedAt: formatKstDateTime(response.endedAt) ?? '-',
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
    steps: mapBatchStepRuns(response.steps),
  };
}
