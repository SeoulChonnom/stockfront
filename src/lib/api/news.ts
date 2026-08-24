import { apiRequest } from '@/lib/api/client';
import type { ClusterDetailResponse } from '@/lib/api/types';

export function getClusterDetail(clusterId: string, signal?: AbortSignal) {
  return apiRequest<ClusterDetailResponse>(
    `/stock/api/news/clusters/${clusterId}`,
    { signal }
  );
}
