import type { ArchiveListResponse } from '../api/types';
import { formatKstDateTime } from '../formatters';
import { computeTotalPages } from '../utils';
import type { ArchiveListView } from '../view-models';
import {
  asFiniteNumber,
  asOptionalString,
  asString,
  toUpperStatus,
} from './coerce';

export function mapArchiveListToView(
  response: ArchiveListResponse
): ArchiveListView {
  return {
    rows: response.items.map((item) => ({
      pageId: asFiniteNumber(item.pageId, 0),
      businessDate: asString(item.businessDate, '-'),
      // D4: `headlineSummary` null falls straight to the "not generated"
      // copy — no longer backfilled with `pageTitle`, which made a FAILED
      // (AI-summary-failed) row look like a normal successful one.
      headline:
        asOptionalString(item.headlineSummary) ??
        '헤드라인이 생성되지 않았습니다',
      status: toUpperStatus(item.status, ['READY', 'PARTIAL', 'FAILED']),
      // D3: absolute KST datetime, not the time-only-with-seconds
      // `formatTime` produced ("06:08:10").
      generatedAt: formatKstDateTime(item.generatedAt) ?? '-',
      detail: asOptionalString(item.partialMessage) ?? null,
    })),
    page: asFiniteNumber(response.pagination.page, 1),
    size: asFiniteNumber(response.pagination.size, 1),
    totalCount: asFiniteNumber(response.pagination.totalCount, 0),
    totalPages: computeTotalPages(
      asFiniteNumber(response.pagination.totalCount, 0),
      asFiniteNumber(response.pagination.size, 1)
    ),
  };
}
