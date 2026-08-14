import { apiRequest } from './client';
import type { DailyPageResponse, PageDateNavigationResponse } from './types';

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

/** `GET /stock/api/pages/navigation` (B-5). */
export function getPageNavigation(businessDate: string, signal?: AbortSignal) {
  return apiRequest<PageDateNavigationResponse>('/stock/api/pages/navigation', {
    query: { businessDate },
    signal,
  });
}
