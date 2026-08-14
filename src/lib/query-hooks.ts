import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type ArchiveListParams,
  getArchiveList,
  getArchiveThemes,
} from './api/archive';
import {
  type BatchJobsParams,
  getBatchJobDetail,
  getBatchJobs,
  retryAiSummary,
} from './api/batch';
import { getClusterDetail } from './api/news';
import {
  getDailyPageByBusinessDate,
  getDailyPageByPageId,
  getLatestDailyPage,
  getPageNavigation,
} from './api/pages';
import {
  mapArchiveListToView,
  mapBatchDetailToRun,
  mapBatchJobsToView,
  mapClusterDetailToView,
  mapDailyPageToSnapshot,
  mapNavigationToView,
} from './mappers';

const BATCH_POLL_INTERVAL_MS = 5000;

function isBatchJobInProgress(status: unknown): boolean {
  if (typeof status !== 'string') {
    return false;
  }

  const normalizedStatus = status.toUpperCase();
  return normalizedStatus === 'PENDING' || normalizedStatus === 'RUNNING';
}

function shouldPollBatchJobs(
  data: Awaited<ReturnType<typeof getBatchJobs>> | undefined
): boolean {
  return data?.items.some((item) => isBatchJobInProgress(item.status)) ?? false;
}

function shouldPollBatchJobDetail(
  data: Awaited<ReturnType<typeof getBatchJobDetail>> | undefined
): boolean {
  return isBatchJobInProgress(data?.status);
}

export type { BatchRunRow } from './view-models';

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

export function useArchiveList(params: ArchiveListParams, enabled = true) {
  return useQuery({
    queryKey: buildArchiveListQueryKey(params),
    queryFn: ({ signal }) => getArchiveList(params, signal),
    select: mapArchiveListToView,
    enabled,
  });
}

/**
 * Theme selections are an unordered set for cache identity. The request
 * itself still receives the caller's order so URL/API serialization remains
 * deterministic for the applied route state.
 */
function canonicalizeArchiveThemes(
  themes: readonly string[] | undefined
): string[] {
  return [
    ...new Set(
      (themes ?? [])
        .filter((theme): theme is string => typeof theme === 'string')
        .map((theme) => theme.trim())
        .filter((theme) => theme.length > 0)
    ),
  ].sort();
}

function buildArchiveListQueryKey(params: ArchiveListParams) {
  const rest = { ...params };
  delete rest.theme;
  const themes = canonicalizeArchiveThemes(params.theme);

  return themes.length > 0
    ? (['archive-list', { ...rest, theme: themes }] as const)
    : (['archive-list', rest] as const);
}

export function useArchiveThemes(enabled = true) {
  return useQuery({
    queryKey: ['archive-themes'],
    queryFn: ({ signal }) => getArchiveThemes(signal),
    enabled,
  });
}

/**
 * `GET /pages/navigation` (B-5). Query key is `businessDate` ONLY (A-6 "FE
 * 구현 규칙") and intentionally does not share the `archive-list` cache — it
 * is a different lookup with a different invalidation lifecycle. Only call
 * this for screens with no loaded daily page to read `navigation` off of;
 * a loaded page's own `navigation` field must be used instead (A-6 "어느
 * 경로를 쓸 것인가").
 */
export function usePageNavigation(businessDate: string, enabled = true) {
  return useQuery({
    queryKey: ['navigation', businessDate],
    queryFn: ({ signal }) => getPageNavigation(businessDate, signal),
    select: mapNavigationToView,
    enabled: enabled && businessDate.length > 0,
  });
}

export function useClusterDetail(clusterId: string) {
  return useQuery({
    queryKey: ['cluster-detail', clusterId],
    queryFn: ({ signal }) => getClusterDetail(clusterId, signal),
    select: mapClusterDetailToView,
  });
}

export function useBatchJobs(params: BatchJobsParams) {
  return useQuery({
    queryKey: ['batch-jobs', params],
    queryFn: ({ signal }) => getBatchJobs(params, signal),
    select: mapBatchJobsToView,
    refetchInterval: (query) =>
      shouldPollBatchJobs(query.state.data) ? BATCH_POLL_INTERVAL_MS : false,
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
    select: mapBatchDetailToRun,
    enabled: jobId !== null,
    refetchInterval: (query) =>
      shouldPollBatchJobDetail(query.state.data)
        ? BATCH_POLL_INTERVAL_MS
        : false,
  });
}

export type RetryAiMutationVariables = {
  jobId: number;
};

export function useRetryAiMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId }: RetryAiMutationVariables) =>
      retryAiSummary(jobId, crypto.randomUUID()),
    retry: false,
    onSuccess: async (_result, { jobId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['batch-jobs'] }),
        queryClient.invalidateQueries({
          queryKey: ['batch-job-detail', jobId],
        }),
      ]);
    },
  });
}
