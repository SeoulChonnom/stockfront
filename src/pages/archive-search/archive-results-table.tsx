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

/**
 * README §7-4: opening a row must carry `?pageId=&from=&to=&status=&page=`
 * so Archive Detail can offer "검색 결과로 돌아가기" and Back restores this
 * exact search. Built from `filters` (the page's already-applied state)
 * rather than the raw incoming `URLSearchParams` so the target query is
 * always well-formed even if the incoming URL had stray/legacy params.
 */
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

/**
 * Local equivalent of `app-state.ts`'s `createNavigateHandler` — duplicated
 * (not imported+wrapped) because this one extra step, saving the search
 * page's own scroll position immediately before navigating away, must run
 * for every row-open click and `createNavigateHandler` has no hook for
 * that. §9 "Archive 행 열기" Back contract: 원래 스크롤 복원.
 */
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

/**
 * ≤1180px collapse target for the 생성 시각 column (§7-4/§11). The shared
 * `TableCollapsibleCell`/`TablePriorityCell` helpers (`components/ui/table`)
 * only parameterize md/lg/xl (768/1024/1280) — none lands on the 1180
 * breakpoint this screen needs, and widening that shared enum is outside
 * this phase's file ownership. Using Tailwind's arbitrary-breakpoint variant
 * (already an established pattern in this repo, e.g. `app-shell.tsx`'s
 * `min-[1025px]:`) keeps the exact pixel value without touching the shared
 * component; the value is never dropped either way (`display:none` only
 * hides the desktop cell once this same value has already been surfaced as
 * the subline below).
 */
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
                  {/* N2 (parity cycle 3): row-level badge is one notch
                      smaller than the page-level badge in the design. */}
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
