import { type Ref, useEffect, useRef } from 'react';

import { EmptyState, InlineAlert, StatusBadge } from '@/components/state';
import { Skeleton } from '@/components/state/skeleton';
import { BatchTypeBadge } from '@/components/ui/batch-type-badge';
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
import { formatRelativeFreshness } from '@/lib/formatters';
import type { BatchRunRow } from '@/lib/query-hooks';
import { cn, computeTotalPages } from '@/lib/utils';

import type { BatchFilters } from './batch-url';
import {
  getBatchStatusSummaryLabel,
  getBatchTypeSummaryLabel,
} from './filter-copy';
import { getSnapshotLabel } from './format-batch';
import { useRetryAnnounce } from './use-retry-announce';

/** List loading/error remain local to the table body; detail query state is independent. */

export type BatchHistoryListProps = {
  applied: BatchFilters;
  rows: BatchRunRow[];
  totalCount: number;
  /** Page size used for both the range label and pagination. */
  pageSize: number;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  dataUpdatedAt: number;
  onRetry: () => void;
  onRefresh: () => void;
  selectedJobId: number | null;
  onSelectRow: (jobId: number) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onAnnounce: (message: string) => void;
  /** Hidden below the master-detail breakpoint when detail view is active. */
  hiddenOnNarrowView: boolean;
};

export function BatchHistoryList({
  applied,
  rows,
  totalCount,
  pageSize,
  isLoading,
  isError,
  isFetching,
  dataUpdatedAt,
  onRetry,
  onRefresh,
  selectedJobId,
  onSelectRow,
  onClearFilters,
  onPageChange,
  onAnnounce,
  hiddenOnNarrowView,
}: BatchHistoryListProps) {
  const hasAppliedFilter = Boolean(applied.status || applied.type);
  const selectedRowButtonRef = useRef<HTMLButtonElement>(null);
  const wasHiddenRef = useRef(hiddenOnNarrowView);

  useEffect(() => {
    const wasHidden = wasHiddenRef.current;
    wasHiddenRef.current = hiddenOnNarrowView;

    if (wasHidden && !hiddenOnNarrowView) {
      selectedRowButtonRef.current?.focus({ preventScroll: true });
    }
  }, [hiddenOnNarrowView]);

  function clearFilters() {
    // The empty-state action is always rendered, but announce only real changes.
    if (hasAppliedFilter) {
      onAnnounce('상태와 타입 조건을 해제했습니다.');
    }

    onClearFilters();
  }

  const retry = useRetryAnnounce(isFetching, isError, onAnnounce);
  const totalPages = computeTotalPages(totalCount, pageSize);
  const updatedAtIso =
    dataUpdatedAt > 0 ? new Date(dataUpdatedAt).toISOString() : null;
  const relativeUpdatedAt = updatedAtIso
    ? formatRelativeFreshness(updatedAtIso)
    : null;

  return (
    <Card
      className={cn(
        'min-w-0 overflow-hidden',
        hiddenOnNarrowView && 'max-[1180px]:hidden'
      )}
    >
      <CardContent className='flex min-w-0 flex-col gap-0 p-0'>
        <div className='flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3.5 sm:px-[18px]'>
          <div className='flex min-w-0 flex-wrap items-baseline gap-2'>
            <h2 className='m-0 text-[14.5px] font-semibold text-fg'>
              실행 이력
            </h2>
            <span className='mono text-[12.5px] font-semibold text-fg-soft'>
              {totalCount === 0
                ? '0 / 0'
                : `${(applied.page - 1) * pageSize + 1}–${Math.min(applied.page * pageSize, totalCount)} / ${totalCount}`}
            </span>
            <span className='mono text-[11.5px] text-faint'>
              · {getBatchStatusSummaryLabel(applied.status)} ·{' '}
              {getBatchTypeSummaryLabel(applied.type)}
            </span>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='mono text-[11.5px] text-faint'>
              <time dateTime={updatedAtIso ?? undefined}>
                {`마지막 갱신 ${relativeUpdatedAt ?? '-'}`}
              </time>
            </span>
            <Button
              aria-label='실행 이력 새로고침'
              loading={isFetching}
              onClick={() => retry(onRefresh)}
              size='sm'
              type='button'
              variant='ghost'
            >
              새로고침
            </Button>
            {hasAppliedFilter ? (
              <Button
                onClick={clearFilters}
                size='sm'
                type='button'
                variant='ghost'
              >
                필터 해제
              </Button>
            ) : null}
          </div>
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
            <Table aria-busy={isLoading} minWidth={520}>
              <TableHeader>
                <TableRow>
                  <TableHead className='h-auto py-[9px] pl-4 sm:pl-[18px]'>
                    작업 · 기준일
                  </TableHead>
                  <TableHead className='hidden h-auto py-[9px] px-3 min-[641px]:table-cell'>
                    타입
                  </TableHead>
                  <TableHead className='h-auto py-[9px] px-3'>상태</TableHead>
                  <TableHead className='h-auto py-[9px] px-3 text-right'>
                    소요
                  </TableHead>
                  <TableHead className='hidden h-auto py-[9px] pr-4 text-right whitespace-nowrap min-[1181px]:table-cell sm:pr-[18px]'>
                    원문/정제/이슈
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonRows />
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell className='p-4 sm:p-[18px]' colSpan={5}>
                      <EmptyState
                        actions={
                          <Button
                            onClick={clearFilters}
                            size='sm'
                            type='button'
                            variant='secondary'
                          >
                            필터 해제
                          </Button>
                        }
                        description='선택한 기간·상태·타입 조건에 해당하는 작업이 없습니다. 상태와 타입 조건을 해제하면 같은 기간의 전체 이력을 볼 수 있습니다.'
                        kind='search-results'
                        title='표시할 실행 이력이 없습니다'
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <BatchHistoryRow
                      buttonRef={
                        row.id === selectedJobId
                          ? selectedRowButtonRef
                          : undefined
                      }
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

/** Keep row placeholders inside this table; a nested `<table>` would be invalid HTML. */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed 5-row aria-hidden placeholder, never reordered
        <TableRow aria-hidden='true' key={`skeleton-${index}`}>
          <TableCell>
            <Skeleton className='h-4 w-28' />
          </TableCell>
          <TableCell className='hidden min-[641px]:table-cell'>
            <Skeleton className='h-4 w-16' />
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
  buttonRef,
  row,
  isSelected,
  onSelect,
}: {
  buttonRef?: Ref<HTMLButtonElement>;
  row: BatchRunRow;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isFailed = row.rawStatus.trim().toUpperCase() === 'FAILED';

  return (
    // Keep the row hit area while preventing the inner keyboard button from firing twice.
    <TableRow
      aria-selected={isSelected}
      className='cursor-pointer'
      onClick={onSelect}
      selected={isSelected}
      tone={isFailed ? 'danger' : undefined}
    >
      <TableCell className='py-2.5 pl-4 align-top sm:pl-[18px]'>
        <button
          aria-label={`job ${row.id} 상세 선택`}
          className='mono block min-w-0 rounded-[var(--r-sm)] text-left text-[13.5px] font-semibold text-fg outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus)]'
          ref={buttonRef}
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
          type='button'
        >
          {row.businessDate}
        </button>
        <div className='mono text-[11px] text-faint'>
          job {row.id} · {getSnapshotLabel(row)}
        </div>
        <BatchTypeBadge
          className='mt-1 px-[7px] py-0.5 text-[11px] min-[641px]:hidden'
          jobType={row.jobType}
        />
        <div className='mono min-[1181px]:hidden text-[11px] text-faint'>
          원문/정제/이슈 {row.counts}
        </div>
      </TableCell>
      <TableCell className='hidden py-2.5 px-3 align-top min-[641px]:table-cell'>
        <BatchTypeBadge className='py-0.5' jobType={row.jobType} />
      </TableCell>
      <TableCell className='py-2.5 px-3 align-top'>
        <StatusBadge size='sm' status={row.rawStatus} />
        {row.rawStatus.trim().toUpperCase() === 'PARTIAL' && row.detail ? (
          <div className='wrap-anywhere mt-1 text-[11.5px] text-faint'>
            {row.detail}
          </div>
        ) : null}
      </TableCell>
      <TableCell className='py-2.5 px-3 text-right align-top'>
        <div className='mono text-[13px] text-fg'>{row.duration}</div>
        <div className='mono text-[11px] whitespace-nowrap text-faint'>
          {row.startedAt}
        </div>
      </TableCell>
      <TableCell className='mono hidden py-2.5 pr-4 text-right align-top whitespace-nowrap min-[1181px]:table-cell sm:pr-[18px]'>
        {row.counts}
      </TableCell>
    </TableRow>
  );
}
