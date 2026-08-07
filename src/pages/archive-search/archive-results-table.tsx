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

function ReasonSubline({ record }: { record: ArchiveRecord }) {
  if (!record.detail || record.status === 'READY') {
    return null;
  }

  return (
    <div className='wrap-anywhere mt-1 text-[12px] text-[color:var(--text-faint)]'>
      {record.detail}
    </div>
  );
}

function GeneratedAtSubline({ record }: { record: ArchiveRecord }) {
  return (
    <div className='mono mt-1 text-[11.5px] text-[color:var(--text-faint)] min-[1181px]:hidden'>
      생성 {record.generatedAt}
    </div>
  );
}

export function ArchiveResultsTable({
  rows,
  filters,
  scrollSearch,
}: {
  rows: ArchiveRecord[];
  filters: ArchiveRowFilters;
  scrollSearch: string;
}) {
  return (
    <TableScrollWrapper>
      {/* B6: the panel around this table now carries 0 padding, so each
          cell owns its own horizontal inset (18px at the row edges, 12px
          between columns — matches the design's per-cell padding). */}
      <Table aria-labelledby='archive-results-heading' minWidth={520}>
        <TableHeader>
          <TableRow>
            <TableHead className='h-auto py-[9px] pr-3 pl-[18px]'>
              기준일
            </TableHead>
            <TableHead className='h-auto py-[9px] px-3'>
              글로벌 헤드라인
            </TableHead>
            <TableHead className='h-auto py-[9px] px-3'>상태</TableHead>
            {/* D3: design left-aligns 생성 시각, the app right-aligned it. */}
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
                {/* D1: row pitch — design's body cell vertical padding is
                    12px, not the shared `TableCell` default (18px). */}
                <TableCell className='py-3 pr-3 pl-[18px] align-top'>
                  <a
                    className='mono text-[13.5px] font-semibold text-[color:var(--text)] underline-offset-2 hover:text-[color:var(--primary)] hover:underline'
                    href={withBasePath(href)}
                    onClick={onOpen}
                  >
                    {/* D1: ISO date, mono — not the ko-KR dotted format. */}
                    {record.businessDate}
                  </a>
                  <div className='mono mt-0 text-[11px] text-[color:var(--text-faint)]'>
                    pageId {record.pageId}
                  </div>
                </TableCell>
                <TableCell className='py-3 px-3 align-top'>
                  <a
                    className='wrap-anywhere text-pretty font-normal text-[color:var(--text)] underline-offset-2 hover:text-[color:var(--primary)] hover:underline'
                    href={withBasePath(href)}
                    onClick={onOpen}
                  >
                    {record.headline}
                  </a>
                  <ReasonSubline record={record} />
                  <GeneratedAtSubline record={record} />
                </TableCell>
                <TableCell className='py-3 px-3 align-top'>
                  {/* Use the compact row-level badge size. */}
                  <StatusBadge size='sm' status={record.status} />
                </TableCell>
                <TableCell className='mono hidden py-3 pr-[18px] pl-3 text-left text-[12px] whitespace-nowrap text-[color:var(--text-soft)] min-[1181px]:table-cell'>
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
