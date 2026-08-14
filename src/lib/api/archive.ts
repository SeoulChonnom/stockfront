import { apiRequest } from './client';
import type {
  ArchiveListResponse,
  ArchiveStatusResponse,
  MarketTypeResponse,
} from './types';

export type ArchiveListParams = {
  fromDate?: string;
  toDate?: string;
  status?: ArchiveStatusResponse;
  marketType?: MarketTypeResponse;
  /** Repeated `theme` query keys; the shared client preserves array order. */
  theme?: string[];
  q?: string;
  page?: number;
  size?: number;
};

export function getArchiveList(
  params: ArchiveListParams,
  signal?: AbortSignal
) {
  return apiRequest<ArchiveListResponse>('/stock/api/pages/archive', {
    query: params,
    signal,
  });
}
