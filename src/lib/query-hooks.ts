import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type ArchiveListParams, getArchiveList } from './api/archive';
import {
  type BatchJobsParams,
  getBatchJobDetail,
  getBatchJobs,
  startBatchRun,
} from './api/batch';
import { getClusterDetail } from './api/news';
import {
  getDailyPageByBusinessDate,
  getDailyPageByPageId,
  getLatestDailyPage,
} from './api/pages';
import type {
  BatchJobDetailResponse,
  BatchJobListResponse,
  BatchRunRequest,
} from './api/types';
import {
  mapArchiveListToView,
  mapBatchDetailToRun,
  mapBatchJobsToView,
  mapClusterDetailToView,
  mapDailyPageToSnapshot,
} from './mappers';
import type { BatchJobsView, BatchRun } from './view-models';

export function useLatestMarketPage(enabled = true) {
  return useQuery({
    queryKey: ['daily-page', 'latest'],
    queryFn: ({ signal }) => getLatestDailyPage(signal),
    select: mapDailyPageToSnapshot,
    enabled,
  });
}

export type ArchiveMarketPageIdentity = {
  businessDate: string;
  pageId: number | null;
};

function hasPageId(pageId: number | null): pageId is number {
  return (
    typeof pageId === 'number' && Number.isSafeInteger(pageId) && pageId > 0
  );
}

export function useArchiveMarketPage(
  identity: ArchiveMarketPageIdentity,
  enabled = true
) {
  return useQuery({
    queryKey: ['daily-page', 'archive', identity.businessDate, identity.pageId],
    queryFn: ({ signal }) =>
      hasPageId(identity.pageId)
        ? getDailyPageByPageId(identity.pageId, signal)
        : getDailyPageByBusinessDate(identity.businessDate, signal),
    select: mapDailyPageToSnapshot,
    enabled:
      enabled &&
      (hasPageId(identity.pageId) || identity.businessDate.length > 0),
  });
}

export function useArchiveList(params: ArchiveListParams) {
  return useQuery({
    queryKey: ['archive-list', params],
    queryFn: ({ signal }) => getArchiveList(params, signal),
    select: mapArchiveListToView,
  });
}

export function useClusterDetail(clusterId: string) {
  return useQuery({
    queryKey: ['cluster-detail', clusterId],
    queryFn: ({ signal }) => getClusterDetail(clusterId, signal),
    select: mapClusterDetailToView,
  });
}

/**
 * Phase 6 (Batch Operations, README §7-6/§7-7) needs a few raw DTO fields
 * that `mapBatchJobsToView`/`mapBatchDetailToRun` (`src/lib/mappers.ts`) do
 * not carry into `BatchRun`/`BatchJobsView`:
 *
 * - `pageId` — the LIST/DETAIL mapper only keeps a combined `pageVersion`
 *   string (`v3`/`-`), never the numeric `pageId` itself, but the 상세
 *   패널's "스냅샷 `pageId N · vN`" field and "스냅샷 열기" action both need
 *   the bare id.
 * - the RAW `status` string — `mapBatchListItemToRun`/`mapBatchDetailToRun`
 *   run every status through `toUpperStatus(value, ['SUCCESS','PARTIAL',
 *   'FAILED'])` (`mappers.ts`), which silently maps anything NOT in that
 *   allow-list (notably `RUNNING`, which real batch jobs do report — see
 *   `docs/design_v2/handoff_v2/fixtures.js` `jobStatusFor`) to `'FAILED'`.
 *   Rendering an in-flight job as a red "생성 실패" badge would be a real
 *   regression, not a cosmetic one, so this file keeps the verbatim string
 *   alongside the mapped one and Phase 6's UI reads `rawStatus` for display/
 *   pipeline-stage purposes instead of the collapsed `status`.
 * - `response.summary.{successCount,partialCount,failedCount,
 *   avgDurationSeconds}` — already read by `mapBatchSummary`, but only to
 *   produce opaque pre-formatted English strings (`successRate`,
 *   `qualitySupporting`, …). §7-6's failure-first summary tiles need the
 *   raw counts themselves, which the current `BatchSummaryView` shape has
 *   no field for.
 *
 * This phase's file ownership (see the phase brief) excludes
 * `src/lib/mappers.ts`/`src/lib/view-models.ts` — both are owned by the
 * data-layer phase and already "just rebuilt" for the other v2 screens — so
 * rather than editing them, this file layers small, additive enrichment on
 * top of their output using fields the DTOs already expose. Nothing here
 * changes the API/DTO contract or the existing `mapBatchJobsToView`/
 * `mapBatchDetailToRun` behavior; every consumer that only wants the
 * original `BatchRun`/`BatchJobsView` shape still gets it unchanged (this is
 * a superset).
 */

export type BatchRunRow = BatchRun & {
  pageId: number | null;
  rawStatus: string;
};

type BatchSummaryCounts = {
  successCount: number;
  partialCount: number;
  failedCount: number;
  avgDurationSeconds: number | null;
};

type BatchJobsViewWithCounts = Omit<BatchJobsView, 'rows'> & {
  rows: BatchRunRow[];
  counts: BatchSummaryCounts;
};

function toRawStatus(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value : 'UNKNOWN';
}

function enrichBatchJobsView(
  response: BatchJobListResponse
): BatchJobsViewWithCounts {
  const view = mapBatchJobsToView(response);

  return {
    ...view,
    rows: view.rows.map((run, index) => ({
      ...run,
      pageId: response.items[index]?.pageId ?? null,
      rawStatus: toRawStatus(response.items[index]?.status),
    })),
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

function enrichBatchDetail(response: BatchJobDetailResponse): BatchRunRow {
  return {
    ...mapBatchDetailToRun(response),
    pageId: response.pageId,
    rawStatus: toRawStatus(response.status),
  };
}

export function useBatchJobs(params: BatchJobsParams) {
  return useQuery({
    queryKey: ['batch-jobs', params],
    queryFn: ({ signal }) => getBatchJobs(params, signal),
    select: enrichBatchJobsView,
  });
}

export function useBatchJobDetail(jobId: number | null) {
  return useQuery({
    queryKey: ['batch-job-detail', jobId],
    queryFn: ({ signal }) => {
      if (jobId === null) {
        throw new Error('jobId is required');
      }

      return getBatchJobDetail(jobId, signal);
    },
    select: enrichBatchDetail,
    enabled: jobId !== null,
  });
}

/**
 * README §7-7 Manual Trigger: the caller now supplies `businessDate`/`force`/
 * `rebuildPageOnly` as the mutation variable instead of the hook hardcoding
 * `startBatchRun({})` and discarding whatever the dialog collected.
 */
export function useStartBatchRunMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BatchRunRequest) => startBatchRun(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['batch-jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['batch-job-detail'] }),
      ]);
    },
  });
}
