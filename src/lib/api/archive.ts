import { apiRequest } from './client';
import type { ArchiveListResponse } from './types';

export type ArchiveListParams = {
  fromDate?: string;
  toDate?: string;
  status?: string;
  page?: number;
  size?: number;
};

export function getArchiveList(
  params: ArchiveListParams,
  signal?: AbortSignal,
) {
  return apiRequest<ArchiveListResponse>('/stock/api/pages/archive', {
    query: params,
    signal,
  });
}
