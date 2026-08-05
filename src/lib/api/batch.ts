import { apiRequest } from './client';
import type {
  BatchJobDetailResponse,
  BatchJobListResponse,
  BatchRunRequest,
  BatchRunResponse,
} from './types';

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

export function startBatchRun(
  payload: BatchRunRequest = {},
  signal?: AbortSignal
) {
  return apiRequest<BatchRunResponse>('/stock/api/batch/market-daily', {
    method: 'POST',
    body: payload,
    signal,
  });
}
