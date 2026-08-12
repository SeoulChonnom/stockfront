import type { MouseEvent } from 'react';

import {
  buildScrollKey,
  saveScrollPosition,
} from '@/components/shell/scroll-restoration';
import { StatusBadge } from '@/components/state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableScrollWrapper,
} from '@/components/ui/table';

import { buildUrl, navigate, withBasePath } from '../../lib/router';
import type { ArchiveRecord } from '../../lib/view-models';

export type ArchiveRowFilters = {
  from: string;
  to: string;
  status: string;
  page: number;
};

/** Row links carry applied filters so Archive Detail can restore the search. */
function getArchiveDetailHref(
  record: ArchiveRecord,
  filters: ArchiveRowFilters
) {
  return buildUrl(`/market/archive/${record.businessDate}`, {
    pageId: record.pageId,
    from: filters.from,
    to: filters.to,
    status: filters.status || undefined,
    page: filters.page,
  });
}

/** Saves this page's scroll before opening a row; Back restores it. */
function createRowOpenHandler(href: string, scrollSearch: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    saveScrollPosition(buildScrollKey('/market/archive/search', scrollSearch));
    navigate(href);
  };
}

/**
 * `record.detail` is the raw per-page `partialMessage` from the backend
 * (see `src/lib/mappers/archive.ts`) — the same unfiltered pipeline text
 * `partial-banner.tsx` gates behind `canViewOps` on the Latest/Archive
 * Detail pages (it can read like "뉴스 수집 단계에서 provider 타임아웃이
 * 발생했습니다."). This subline must follow the same rule: never render it
 * to a regular user.
 */
function ReasonSubline({
  record,
  canViewOps,
}: {
  record: ArchiveRecord;
  canViewOps: boolean;
}) {
  if (!canViewOps || !record.detail || record.status === 'READY') {
    return null;
  }

  return (
    <div className='wrap-anywhere mt-1 text-[12px] text-faint'>
      {record.detail}
    </div>
  );
}

function GeneratedAtSubline({ record }: { record: ArchiveRecord }) {
  return (
    <div className='mono mt-1 text-caption text-faint min-[1181px]:hidden'>
      생성 {record.generatedAt}
    </div>
  );
}

export function ArchiveResultsTable({
  rows,
  filters,
  scrollSearch,
  canViewOps,
}: {
  rows: ArchiveRecord[];
  filters: ArchiveRowFilters;
  scrollSearch: string;
  canViewOps: boolean;
}) {
  return (
    <TableScrollWrapper>
      {/* The panel has no padding, so cells own their horizontal insets:
          18px at row edges and 12px between columns. */}
      <Table aria-labelledby='archive-results-heading' minWidth={520}>
        <TableHeader>
          <TableRow>
            <TableHead className='h-auto py-[9px] pr-3 pl-[18px]'>
              기준일
            </TableHead>
            <TableHead className='h-auto' padding='compact'>
              글로벌 헤드라인
            </TableHead>
            <TableHead className='h-auto' padding='compact'>
              상태
            </TableHead>
            {/* Keep 생성 시각 left-aligned with the column content. */}
            <TableHead className='hidden h-auto py-[9px] pr-[18px] pl-3 text-left min-[1181px]:table-cell'>
              생성 시각
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((record) => {
            const href = getArchiveDetailHref(record, filters);
            const onOpen = createRowOpenHandler(href, scrollSearch);

            return (
              <TableRow
                key={record.pageId}
                tone={record.status === 'FAILED' ? 'danger' : undefined}
              >
                {/* This dense table uses 12px vertical cell padding. */}
                <TableCell className='py-3 pr-3 pl-[18px] align-top'>
                  <a
                    className='mono text-body font-semibold text-fg underline-offset-2 hover:text-[color:var(--primary)] hover:underline'
                    href={withBasePath(href)}
                    onClick={onOpen}
                  >
                    {/* Render the business date in monospaced ISO format. */}
                    {record.businessDate}
                  </a>
                  <div className='mono mt-0 text-label text-faint'>
                    pageId {record.pageId}
                  </div>
                </TableCell>
                <TableCell className='py-3 px-3 align-top'>
                  <a
                    className='wrap-anywhere text-pretty font-normal text-fg underline-offset-2 hover:text-[color:var(--primary)] hover:underline'
                    href={withBasePath(href)}
                    onClick={onOpen}
                  >
                    {record.headline}
                  </a>
                  <ReasonSubline canViewOps={canViewOps} record={record} />
                  <GeneratedAtSubline record={record} />
                </TableCell>
                <TableCell className='py-3 px-3 align-top'>
                  {/* Use the compact row-level badge size. */}
                  <StatusBadge size='sm' status={record.status} />
                </TableCell>
                <TableCell className='mono hidden py-3 pr-[18px] pl-3 text-left text-[12px] whitespace-nowrap text-fg-soft min-[1181px]:table-cell'>
                  {record.generatedAt}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableScrollWrapper>
  );
}
