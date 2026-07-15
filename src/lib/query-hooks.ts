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
import {
  mapArchiveListToView,
  mapBatchDetailToRun,
  mapBatchJobsToView,
  mapClusterDetailToView,
  mapDailyPageToSnapshot,
} from './mappers';

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
  return typeof pageId === 'number' && Number.isSafeInteger(pageId) && pageId > 0;
}

export function useArchiveMarketPage(
  identity: ArchiveMarketPageIdentity,
  enabled = true
) {
  return useQuery({
    queryKey: [
      'daily-page',
      'archive',
      identity.businessDate,
      identity.pageId,
    ],
    queryFn: ({ signal }) =>
      hasPageId(identity.pageId)
        ? getDailyPageByPageId(identity.pageId, signal)
        : getDailyPageByBusinessDate(identity.businessDate, signal),
    select: mapDailyPageToSnapshot,
    enabled:
      enabled && (hasPageId(identity.pageId) || identity.businessDate.length > 0),
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

export function useBatchJobs(params: BatchJobsParams) {
  return useQuery({
    queryKey: ['batch-jobs', params],
    queryFn: ({ signal }) => getBatchJobs(params, signal),
    select: mapBatchJobsToView,
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
  });
}

export function useStartBatchRunMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => startBatchRun({}),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['batch-jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['batch-job-detail'] }),
      ]);
    },
  });
}
