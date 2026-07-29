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
import { cn } from '@/lib/utils';

import { BatchFilterBar } from './batch-filter-bar';
import type { BatchFilters } from './batch-url';
import { useRetryAnnounce } from './use-retry-announce';

/**
 * README §7-6 point 5: master list panel. List loading/error are
 * independent of the detail panel (§7-6 "목록 loading/error는 상세와
 * 독립") — this component never reads detail query state, and its own
 * error rendering only replaces the table body area, not the filter bar or
 * the page around it.
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
  onApplyFilters: (next: { from: string; to: string; status: string }) => void;
  onResetFilters: () => void;
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
  onApplyFilters,
  onResetFilters,
  onClearStatusFilter,
  onPageChange,
  onAnnounce,
  hiddenOnNarrowView,
}: BatchHistoryListProps) {
  const retry = useRetryAnnounce(isFetching, isError, onAnnounce);
  const totalPages = Math.max(1, Math.ceil(totalCount / 20));

  return (
    <Card
      className={cn('min-w-0', hiddenOnNarrowView && 'max-[1180px]:hidden')}
    >
      <CardContent className='flex min-w-0 flex-col gap-4 p-4'>
        <BatchFilterBar
          applied={applied}
          onApply={onApplyFilters}
          onReset={onResetFilters}
        />

        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='flex min-w-0 flex-wrap items-baseline gap-2'>
            <h2 className='m-0 text-[17px] font-semibold text-[color:var(--text)]'>
              실행 이력
            </h2>
            <span className='mono text-[12.5px] font-semibold text-[color:var(--text-soft)]'>
              {totalCount === 0
                ? '0 / 0'
                : `${(applied.page - 1) * 20 + 1}–${Math.min(applied.page * 20, totalCount)} / ${totalCount}`}
            </span>
            {applied.status ? (
              <span className='mono inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--neutral-line)] bg-[color:var(--neutral-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-[color:var(--neutral)]'>
                {STATUS_FILTER_LABEL[applied.status] ?? applied.status}
              </span>
            ) : null}
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
        ) : (
          <TableScrollWrapper>
            <Table aria-busy={isLoading} minWidth={480}>
              <TableHeader>
                <TableRow>
                  <TableHead>작업 · 기준일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>소요</TableHead>
                  <TableHead className='hidden min-[1181px]:table-cell'>
                    원문 · 정제 · 이슈
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonRows />
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
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
            onAnnounce={onAnnounce}
            onPageChange={onPageChange}
            page={applied.page}
            pageSize={20}
            totalCount={totalCount}
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
      <TableCell>
        <button
          aria-label={`job ${row.id} 상세 선택`}
          className='mono block min-w-0 rounded-[var(--r-sm)] text-left text-[14px] font-semibold text-[color:var(--text)] outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus)]'
          onClick={onSelect}
          type='button'
        >
          {row.businessDate}
        </button>
        <div className='mono mt-0.5 text-[12px] text-[color:var(--text-faint)]'>
          job {row.id} · pageId {row.pageId ?? '-'} · {row.pageVersion}
        </div>
        <div className='mt-1 min-[1181px]:hidden text-[12px] text-[color:var(--text-faint)]'>
          원문/정제/이슈 {row.counts}
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge status={row.rawStatus} />
        {row.rawStatus.trim().toUpperCase() === 'PARTIAL' && row.detail ? (
          <div className='wrap-anywhere mt-1 text-[12px] text-[color:var(--text-faint)]'>
            {row.detail}
          </div>
        ) : null}
      </TableCell>
      <TableCell>
        <div className='mono text-[13px] text-[color:var(--text)]'>
          {row.duration}
        </div>
        <div className='mono mt-0.5 text-[12px] text-[color:var(--text-faint)]'>
          시작 {row.startedAt}
        </div>
      </TableCell>
      <TableCell className='mono hidden min-[1181px]:table-cell'>
        {row.counts}
      </TableCell>
    </TableRow>
  );
}
