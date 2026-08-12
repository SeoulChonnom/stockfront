import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { EmptyState, InlineAlert } from '@/components/state';
import { SkeletonText } from '@/components/state/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { BatchRunRow } from '@/lib/query-hooks';
import { cn } from '@/lib/utils';

import {
  BatchDetailContent,
  type RetryAiMutationState,
} from './batch-detail-content';
import { useRetryAnnounce } from './use-retry-announce';

export type BatchDetailPanelProps = {
  run: BatchRunRow | null;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  hasSelection: boolean;
  selectedJobId: number | null;
  onRetry: () => void;
  onAnnounce: (message: string) => void;
  onBackToList: () => void;
  canRetryAi: boolean;
  isCurrentRetryJob: (jobId: number) => boolean;
  retryAiMutation: RetryAiMutationState;
  /** Hidden below the master-detail breakpoint unless `view=detail` is active. */
  hiddenOnNarrowView: boolean;
};

export function BatchDetailPanel({
  run,
  isLoading,
  isError,
  isFetching,
  hasSelection,
  selectedJobId,
  onRetry,
  onAnnounce,
  onBackToList,
  canRetryAi,
  isCurrentRetryJob,
  retryAiMutation,
  hiddenOnNarrowView,
}: BatchDetailPanelProps) {
  const retry = useRetryAnnounce(isFetching, isError, onAnnounce);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const wasHiddenRef = useRef(hiddenOnNarrowView);
  const shouldFocusDetailRef = useRef(false);

  useEffect(() => {
    const wasHidden = wasHiddenRef.current;
    wasHiddenRef.current = hiddenOnNarrowView;

    if (wasHidden && !hiddenOnNarrowView) {
      shouldFocusDetailRef.current = true;
    }

    if (
      !shouldFocusDetailRef.current ||
      hiddenOnNarrowView ||
      isLoading ||
      !run ||
      selectedJobId === null ||
      run.id !== selectedJobId
    ) {
      return;
    }

    detailHeadingRef.current?.focus({ preventScroll: true });
    shouldFocusDetailRef.current = false;
  }, [hiddenOnNarrowView, isLoading, run, selectedJobId]);

  return (
    <Card
      className={cn('min-w-0', hiddenOnNarrowView && 'max-[1180px]:hidden')}
    >
      {/* Detail content uses 16px vertical and 18px horizontal padding so
          headings and description lists align with the panel header. */}
      <CardContent
        className='flex min-w-0 flex-col gap-4 px-[18px] py-4'
        aria-busy={isLoading}
      >
        <div className='flex items-center gap-2 min-[1181px]:hidden'>
          <Button
            onClick={onBackToList}
            size='sm'
            type='button'
            variant='ghost'
          >
            <ArrowLeft aria-hidden='true' size={14} />
            목록
          </Button>
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
                상세 다시 시도
              </Button>
            }
            title='이 작업의 상세를 불러오지 못했습니다'
            tone='danger'
          >
            목록은 정상입니다. 다른 작업을 선택하거나 다시 시도해 주세요.
          </InlineAlert>
        ) : isLoading ? (
          <div role='status'>
            <span className='sr-only'>
              선택한 작업의 상세를 불러오는 중입니다. 목록과 필터는 유지됩니다.
            </span>
            <SkeletonText lines={6} />
          </div>
        ) : !hasSelection || !run ? (
          <EmptyState
            description='목록에서 작업을 선택하면 상세가 여기에 표시됩니다.'
            kind='no-data'
            title='선택된 작업이 없습니다'
          />
        ) : (
          <BatchDetailContent
            canRetryAi={canRetryAi}
            detailHeadingRef={detailHeadingRef}
            isCurrentRetryJob={isCurrentRetryJob}
            onAnnounce={onAnnounce}
            retryAiMutation={retryAiMutation}
            run={run}
          />
        )}
      </CardContent>
    </Card>
  );
}
