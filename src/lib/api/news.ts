import { apiRequest } from './client';
import type { ClusterDetailResponse } from './types';

export function getClusterDetail(clusterId: string, signal?: AbortSignal) {
  return apiRequest<ClusterDetailResponse>(
    `/stock/api/news/clusters/${clusterId}`,
    { signal }
  );
}
