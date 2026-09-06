import { apiRequest } from '@/lib/api/client';
import type {
  AiRetryRunResponse,
  BatchJobDetailResponse,
  BatchJobListResponse,
  SnapshotRunRequest,
  SnapshotRunResponse,
} from '@/lib/api/types';

export type BatchJobsParams = {
  fromDate?: string;
  toDate?: string;
  status?: string;
  /** API `BatchJobType` enum value (`NEWS_COLLECTION` | `MARKET_SNAPSHOT`) — see `src/pages/batch-operations/filter-copy.ts`'s `BATCH_TYPES` note. */
  jobType?: string;
  page?: number;
  size?: number;
};

export function getBatchJobs(params: BatchJobsParams, signal?: AbortSignal) {
  return apiRequest<BatchJobListResponse>('/stock/api/batch/jobs', {
    query: params,
    signal,
  });
}

export function getBatchJobDetail(jobId: number, signal?: AbortSignal) {
  return apiRequest<BatchJobDetailResponse>(`/stock/api/batch/jobs/${jobId}`, {
    signal,
  });
}

export function retryAiSummary(
  jobId: number,
  idempotencyKey = crypto.randomUUID()
) {
  return apiRequest<AiRetryRunResponse>(
    `/stock/api/batch/jobs/${jobId}/retry-ai`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
    }
  );
}

export function startSnapshotRun(
  payload: SnapshotRunRequest,
  idempotencyKey = crypto.randomUUID()
) {
  return apiRequest<SnapshotRunResponse>('/stock/api/batch/market-daily', {
    method: 'POST',
    body: payload,
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}
