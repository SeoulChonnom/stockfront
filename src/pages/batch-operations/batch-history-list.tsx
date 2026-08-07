import { useEffect, useRef } from 'react';

import { InlineAlert } from '@/components/state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { formatRelativeFreshness } from '@/lib/formatters';
import type { BatchRunRow } from '@/lib/query-hooks';
import { cn, computeTotalPages } from '@/lib/utils';
import { BatchHistoryEmpty } from './batch-history-empty';
import { BatchHistorySkeleton } from './batch-history-skeleton';
import { BatchHistoryTable } from './batch-history-table';
import type { BatchFilters } from './batch-url';
import {
  getBatchStatusSummaryLabel,
  getBatchTypeSummaryLabel,
} from './filter-copy';
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
            <h2 className='m-0 text-card-heading font-semibold text-fg'>
              실행 이력
            </h2>
            <span className='mono text-body-sm font-semibold text-fg-soft'>
              {totalCount === 0
                ? '0 / 0'
                : `${(applied.page - 1) * pageSize + 1}–${Math.min(applied.page * pageSize, totalCount)} / ${totalCount}`}
            </span>
            <span className='mono text-caption text-faint'>
              · {getBatchStatusSummaryLabel(applied.status)} ·{' '}
              {getBatchTypeSummaryLabel(applied.type)}
            </span>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='mono text-caption text-faint'>
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
          <BatchHistoryTable
            isLoading={isLoading}
            onSelectRow={(jobId) => {
              onAnnounce(`job ${jobId} 상세를 표시합니다.`);
              onSelectRow(jobId);
            }}
            rows={rows}
            selectedJobId={selectedJobId}
            selectedRowButtonRef={selectedRowButtonRef}
          >
            {isLoading ? (
              <BatchHistorySkeleton />
            ) : rows.length === 0 ? (
              <BatchHistoryEmpty onClearFilters={clearFilters} />
            ) : null}
          </BatchHistoryTable>
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
