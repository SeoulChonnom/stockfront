import { apiRequest } from './client';
import type { DailyPageResponse, NavigationResponse } from './types';

export function getLatestDailyPage(signal?: AbortSignal) {
  return apiRequest<DailyPageResponse>('/stock/api/pages/daily/latest', {
    signal,
  });
}

export function getDailyPageByBusinessDate(
  businessDate: string,
  signal?: AbortSignal
) {
  return apiRequest<DailyPageResponse>('/stock/api/pages/daily', {
    query: { businessDate },
    signal,
  });
}

export function getDailyPageByPageId(pageId: number, signal?: AbortSignal) {
  return apiRequest<DailyPageResponse>(`/stock/api/pages/${pageId}`, {
    signal,
  });
}

/** `GET /stock/api/pages/navigation` (B-5). Only for screens with no loaded daily page to read `navigation` off of — see `useAdjacentNavigation`. */
export function getNavigation(businessDate: string, signal?: AbortSignal) {
  return apiRequest<NavigationResponse>('/stock/api/pages/navigation', {
    query: { businessDate },
    signal,
  });
}
