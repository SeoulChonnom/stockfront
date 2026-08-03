import { EmptyState, InlineAlert, StatusBadge } from '@/components/state';
import { Skeleton } from '@/components/state/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableScrollWrapper,
} from '@/components/ui/table';
import type { BatchRunRow } from '@/lib/query-hooks';
import { cn, computeTotalPages } from '@/lib/utils';

import type { BatchFilters } from './batch-url';
import { useRetryAnnounce } from './use-retry-announce';

/**
 * README §7-6 point 5: master list panel. List loading/error are
 * independent of the detail panel (§7-6 "목록 loading/error는 상세와
 * 독립") — this component never reads detail query state, and its own
 * error rendering only replaces the table body area, not the header or
 * the page around it.
 *
 * E1: the 시작일/종료일/상태 filter FORM (`BatchFilterBar`) is deliberately
 * not rendered here — neither the design prototype nor README §7-6 has one;
 * §7-6.5 specifies exactly the header this component renders (실행 이력 +
 * mono range + applied status filter + 필터 해제). The `from`/`to` URL
 * params still work (still parsed by `parseListFilters` upstream), they
 * just have no dedicated UI control on this screen anymore — only `status`
 * is settable from this page (the attention banner's quick filters, and
 * 필터 해제 below).
 */

export type BatchHistoryListProps = {
  applied: BatchFilters;
  rows: BatchRunRow[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
  selectedJobId: number | null;
  onSelectRow: (jobId: number) => void;
  onClearStatusFilter: () => void;
  onPageChange: (page: number) => void;
  onAnnounce: (message: string) => void;
  /** Hidden below the master-detail breakpoint while `view=detail` is active (README §7-6 drill-in). */
  hiddenOnNarrowView: boolean;
};

const STATUS_FILTER_LABEL: Readonly<Record<string, string>> = {
  SUCCESS: 'SUCCESS · 성공',
  PARTIAL: 'PARTIAL · 부분 생성',
  FAILED: 'FAILED · 생성 실패',
};

export function BatchHistoryList({
  applied,
  rows,
  totalCount,
  isLoading,
  isError,
  isFetching,
  onRetry,
  selectedJobId,
  onSelectRow,
  onClearStatusFilter,
  onPageChange,
  onAnnounce,
  hiddenOnNarrowView,
}: BatchHistoryListProps) {
  const retry = useRetryAnnounce(isFetching, isError, onAnnounce);
  const totalPages = computeTotalPages(totalCount, 20);

  return (
    // B6: this panel carries 0 padding — the header row, body, and
    // pagination each own theirs (matching 관련 기사/검색 결과).
    <Card
      className={cn(
        'min-w-0 overflow-hidden',
        hiddenOnNarrowView && 'max-[1180px]:hidden'
      )}
    >
      <CardContent className='flex min-w-0 flex-col gap-0 p-0'>
        <div className='flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--line)] px-4 py-3.5 sm:px-[18px]'>
          <div className='flex min-w-0 flex-wrap items-baseline gap-2'>
            {/* parity cycle A3: per-block card-heading size (see
                archive-search-filters.tsx's comment) — "실행 이력" measures
                14.5px in the design, not the README §6 17px scale. */}
            <h2 className='m-0 text-[14.5px] font-semibold text-[color:var(--text)]'>
              실행 이력
            </h2>
            <span className='mono text-[12.5px] font-semibold text-[color:var(--text-soft)]'>
              {totalCount === 0
                ? '0 / 0'
                : `${(applied.page - 1) * 20 + 1}–${Math.min(applied.page * 20, totalCount)} / ${totalCount}`}
            </span>
            {/* E3: design always shows the applied status filter as plain
                muted mono text ("· 전체 상태" when none is set), not a
                conditional badge chip. */}
            <span className='mono text-[11.5px] text-[color:var(--text-faint)]'>
              ·{' '}
              {applied.status
                ? (STATUS_FILTER_LABEL[applied.status] ?? applied.status)
                : '전체 상태'}
            </span>
          </div>
          {applied.status ? (
            <Button
              onClick={onClearStatusFilter}
              size='sm'
              type='button'
              variant='ghost'
            >
              필터 해제
            </Button>
          ) : null}
        </div>

        {isError ? (
          <div className='p-4 sm:p-[18px]'>
            <InlineAlert
              actions={
                <Button
                  onClick={() => retry(onRetry)}
                  size='sm'
                  type='button'
                  variant='ghost'
                >
                  목록 다시 시도
                </Button>
              }
              tone='danger'
            >
              배치 목록을 불러오지 못했습니다. 필터와 이전 선택은 그대로
              유지됩니다.
            </InlineAlert>
          </div>
        ) : (
          <TableScrollWrapper>
            <Table aria-busy={isLoading} minWidth={480}>
              <TableHeader>
                <TableRow>
                  <TableHead className='h-auto py-2 pl-4 sm:pl-[18px]'>
                    작업 · 기준일
                  </TableHead>
                  <TableHead className='h-auto py-2 px-3'>상태</TableHead>
                  <TableHead className='h-auto py-2 px-3 text-right'>
                    소요
                  </TableHead>
                  {/* E4: design text is "원문/정제/이슈" (slashes), and the
                      column must not wrap the header or the values. */}
                  <TableHead className='hidden h-auto py-2 pr-4 text-right whitespace-nowrap min-[1181px]:table-cell sm:pr-[18px]'>
                    원문/정제/이슈
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonRows />
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell className='p-4 sm:p-[18px]' colSpan={4}>
                      <EmptyState
                        description='조건에 맞는 배치 실행 이력이 없습니다. 필터를 조정한 뒤 다시 시도해 주세요.'
                        kind='search-results'
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <BatchHistoryRow
                      isSelected={row.id === selectedJobId}
                      key={row.id}
                      onSelect={() => {
                        onAnnounce(`job ${row.id} 상세를 표시합니다.`);
                        onSelectRow(row.id);
                      }}
                      row={row}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </TableScrollWrapper>
        )}

        {!isError && !isLoading && rows.length > 0 ? (
          <Pagination
            className='px-4 py-3 sm:px-[18px]'
            onAnnounce={onAnnounce}
            onPageChange={onPageChange}
            page={applied.page}
            showPageIndicator={false}
            totalPages={totalPages}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton *rows* for this specific 4-column layout — deliberately not the
 * shared `SkeletonTableRows` component, which renders its own `<table>`
 * wrapper (correct when it replaces a whole table, but invalid nested here
 * inside this component's own `<tbody>`). Using the `Skeleton` atom
 * directly keeps the real header row visible while loading (README §8:
 * "skeleton은 실제 레이아웃 골격을 유지한다").
 */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed 5-row aria-hidden placeholder, never reordered
        <TableRow aria-hidden='true' key={`skeleton-${index}`}>
          <TableCell>
            <Skeleton className='h-4 w-28' />
          </TableCell>
          <TableCell>
            <Skeleton className='h-4 w-20' />
          </TableCell>
          <TableCell>
            <Skeleton className='h-4 w-16' />
          </TableCell>
          <TableCell className='hidden min-[1181px]:table-cell'>
            <Skeleton className='h-4 w-24' />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function BatchHistoryRow({
  row,
  isSelected,
  onSelect,
}: {
  row: BatchRunRow;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isFailed = row.rawStatus.trim().toUpperCase() === 'FAILED';

  return (
    <TableRow
      aria-selected={isSelected}
      selected={isSelected}
      tone={isFailed ? 'danger' : undefined}
    >
      {/* E5: row pitch — design's body cell vertical padding is 10px, not
          the shared `TableCell` default (18px). */}
      <TableCell className='py-2.5 pl-4 sm:pl-[18px]'>
        <button
          aria-label={`job ${row.id} 상세 선택`}
          // X1 (parity cycle 8): design's row button is 13.5px
          // (`font-size:13.5px` inline on `<button onClick="{{ r.onSelect }}">`
          // in the prototype), not 14px — this 0.5px difference alone
          // (13.5*1.6=21.6 vs 14*1.6=22.4 line-height) drove ~0.8px of extra
          // height on every "normal" history row (15 of 20 measured rows).
          className='mono block min-w-0 rounded-[var(--r-sm)] text-left text-[13.5px] font-semibold text-[color:var(--text)] outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus)]'
          onClick={onSelect}
          type='button'
        >
          {row.businessDate}
        </button>
        {/* M3 (parity cycle 4): design's jobId/counts sublines here carry
            no margin-top at all (`display:block`, stacked purely by
            line-height) at 11px — the app's `mt-0.5`/`mt-1` plus 12px were
            adding ~6-7px of extra row height, only visible once the third
            (원문/정제/이슈) line renders at ≤1180px alongside it.
            W1 (parity cycle 7): when there is no snapshot, `pageId` is
            `null` — printing `pageId -` reads as though a page id exists
            and is literally "-". The design (`r.pageLabel`, line ~1999 of
            the prototype) and the detail panel's `스냅샷` field
            (`batch-detail-panel.tsx`) both collapse the whole
            "pageId N · vN" clause to `스냅샷 없음` in that case — do the
            same here instead of leaking the missing-value placeholder.
            Confirmed directly against the reference (`#/ops/batches`):
            the design's own equivalent `<span>` for a normal row ALSO
            wraps to two lines at this column's width (measured 35.19px,
            same as the app) — only the no-snapshot row is short enough to
            stay on one line (measured ~60px row height on both sides
            after this fix). Do not add `whitespace-nowrap` here: that was
            tried and it force-shrinks every normal row 15px below the
            design's own wrapped height — an overcorrection past the
            reference, not a fix. */}
        <div className='mono text-[11px] text-[color:var(--text-faint)]'>
          job {row.id} ·{' '}
          {row.pageId !== null
            ? `pageId ${row.pageId} · ${row.pageVersion}`
            : '스냅샷 없음'}
        </div>
        <div className='min-[1181px]:hidden text-[11px] text-[color:var(--text-faint)]'>
          원문/정제/이슈 {row.counts}
        </div>
      </TableCell>
      <TableCell className='py-2.5 px-3'>
        {/* X1 (parity cycle 8): the design's per-row ops badge is the same
            11.5px/3px-8px pill already used for the archive-results table
            (N2, parity cycle 3) — `size='sm'`, not the page-level default
            (12px/py-1/px-[9px]). The default badge's extra ~2.8px, plus the
            partial-detail subline below also running 0.5px oversize, made
            every PARTIAL row (the tallest cell in that row) ~4.4px taller
            than the design. */}
        <StatusBadge size='sm' status={row.rawStatus} />
        {row.rawStatus.trim().toUpperCase() === 'PARTIAL' && row.detail ? (
          <div className='wrap-anywhere mt-1 text-[11.5px] text-[color:var(--text-faint)]'>
            {row.detail}
          </div>
        ) : null}
      </TableCell>
      <TableCell className='py-2.5 px-3 text-right'>
        <div className='mono text-[13px] text-[color:var(--text)]'>
          {row.duration}
        </div>
        {/* D10: design's subline is the bare KST datetime, no "시작 " prefix.
            O2 (parity cycle 3): same whitespace-nowrap treatment as the
            원문/정제/이슈 column — the design fits the full KST timestamp on
            one line, the app was wrapping it across two.
            X1 (parity cycle 8): the design's subline span is 11px with no
            margin-top (`display:block;font-size:11px`, stacked purely by
            line-height) — the app's 12px + `mt-0.5` (2px) made this cell the
            tallest one in the "스냅샷 없음" rows, adding ~2.8px there. */}
        <div className='mono text-[11px] whitespace-nowrap text-[color:var(--text-faint)]'>
          {row.startedAt}
        </div>
      </TableCell>
      <TableCell className='mono hidden py-2.5 pr-4 text-right whitespace-nowrap min-[1181px]:table-cell sm:pr-[18px]'>
        {row.counts}
      </TableCell>
    </TableRow>
  );
}
