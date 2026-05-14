import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type ArchiveListParams, getArchiveList } from './api/archive';
import {
  type BatchJobsParams,
  getBatchJobDetail,
  getBatchJobs,
  startBatchRun,
} from './api/batch';
import { getClusterDetail } from './api/news';
import { getDailyPageByBusinessDate, getLatestDailyPage } from './api/pages';
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

export function useArchiveMarketPage(businessDate: string, enabled = true) {
  return useQuery({
    queryKey: ['daily-page', businessDate],
    queryFn: ({ signal }) => getDailyPageByBusinessDate(businessDate, signal),
    select: mapDailyPageToSnapshot,
    enabled: enabled && businessDate.length > 0,
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
