import type { RefObject } from 'react';
import { AsyncButton } from '@/components/domain/async-button';
import { BatchTypeBadge } from '@/components/domain/batch-type-badge';
import {
  DescriptionList,
  DescriptionListItem,
} from '@/components/domain/description-list';
import { LogBox } from '@/components/domain/log-box';
import { PipelineStages } from '@/components/domain/pipeline-stages';
import { InlineAlert, StatusBadge } from '@/components/state';
import { TONE_SURFACE } from '@/components/state/tone-surface';
import type { AiRetryRunResponse, SnapshotRunResponse } from '@/lib/api/types';
import { createNavigateHandler } from '@/lib/app-state';
import { isMarketSnapshotJobType } from '@/lib/batch-type';
import type {
  BatchRunRow,
  RetryAiMutationVariables,
  SnapshotRetryMutationVariables,
} from '@/lib/query-hooks';
import { buildUrl, withBasePath } from '@/lib/router';

import {
  deriveUserImpact,
  getSnapshotLabel,
  isRunningStatus,
  isSnapshotRetryableStatus,
} from '@/pages/batch-operations/format-batch';
import {
  type RetryErrorView,
  toAiRetryErrorView,
  toSnapshotRetryErrorView,
} from '@/pages/batch-operations/retry-error';

export type RetryAiMutationState = {
  data: AiRetryRunResponse | undefined;
  error: unknown;
  isError: boolean;
  isPending: boolean;
  isSuccess: boolean;
  variables: RetryAiMutationVariables | undefined;
  mutate: (
    variables: RetryAiMutationVariables,
    options?: { onSuccess?: (data: AiRetryRunResponse) => void }
  ) => void;
};

export type SnapshotRetryMutationState = {
  data: SnapshotRunResponse | undefined;
  error: unknown;
  isError: boolean;
  isPending: boolean;
  isSuccess: boolean;
  variables: SnapshotRetryMutationVariables | undefined;
  mutate: (
    variables: SnapshotRetryMutationVariables,
    options?: { onSuccess?: (data: SnapshotRunResponse) => void }
  ) => void;
};

export type BatchDetailContentProps = {
  /** `ops.trigger`; gates both retry actions. UX only — the backend still authorizes. */
  canTrigger: boolean;
  detailHeadingRef: RefObject<HTMLHeadingElement | null>;
  isCurrentRetryJob: (jobId: number) => boolean;
  onAnnounce: (message: string) => void;
  retryAiMutation: RetryAiMutationState;
  snapshotRetryMutation: SnapshotRetryMutationState;
  run: BatchRunRow;
};

function RetryErrorAlert({
  error,
  title,
}: {
  error: RetryErrorView;
  title: string;
}) {
  return (
    <InlineAlert title={title} tone='danger'>
      <span className='mono block text-label'>
        {error.status > 0 ? `${error.status} · ${error.code}` : error.code}
      </span>
      <span>{error.message}</span>
    </InlineAlert>
  );
}

function RetryAcceptedAlert({
  jobId,
  status,
  title,
}: {
  jobId: number;
  status: string;
  title: string;
}) {
  return (
    <InlineAlert title={title} tone='success'>
      job {jobId} · 상태 {status}
    </InlineAlert>
  );
}

export function BatchDetailContent({
  canTrigger,
  detailHeadingRef,
  isCurrentRetryJob,
  onAnnounce,
  run,
  retryAiMutation,
  snapshotRetryMutation,
}: BatchDetailContentProps) {
  const running = isRunningStatus(run.rawStatus);
  const impacts = deriveUserImpact({
    jobType: run.jobType,
    rawStatus: run.rawStatus,
    pageId: run.pageId,
    businessDate: run.businessDate,
    detail: run.detail,
  });
  const hasError = Boolean(run.errorCode || run.errorMessage);
  const snapshotHref =
    run.pageId !== null
      ? buildUrl(`/market/archive/${run.businessDate}`, { pageId: run.pageId })
      : null;
  // NEWS_COLLECTION has no snapshot; do not render fallback counts/options as real data.
  const hasSnapshot = isMarketSnapshotJobType(run.jobType);
  const isRetryForRun = retryAiMutation.variables?.jobId === run.id;
  const isRetryPendingForRun = isRetryForRun && retryAiMutation.isPending;
  const aiRetryError =
    isRetryForRun && retryAiMutation.isError
      ? toAiRetryErrorView(retryAiMutation.error)
      : null;
  const aiRetrySuccess = isRetryForRun && retryAiMutation.isSuccess;
  // A snapshot rerun is keyed by business date, so its result belongs to every
  // job of that date — not just the job whose button started it.
  const isSnapshotRetryForRun =
    snapshotRetryMutation.variables?.businessDate === run.businessDate;
  const isSnapshotRetryPendingForRun =
    isSnapshotRetryForRun && snapshotRetryMutation.isPending;
  const canRetrySnapshot =
    canTrigger && hasSnapshot && isSnapshotRetryableStatus(run.rawStatus);
  const snapshotRetryError =
    isSnapshotRetryForRun && snapshotRetryMutation.isError
      ? toSnapshotRetryErrorView(snapshotRetryMutation.error, run.businessDate)
      : null;
  const snapshotRetrySuccess =
    isSnapshotRetryForRun && snapshotRetryMutation.isSuccess;

  function handleRetrySnapshot() {
    if (!canRetrySnapshot || isSnapshotRetryPendingForRun) {
      return;
    }

    const sourceJobId = run.id;
    onAnnounce('스냅샷 생성 재시도를 요청하고 있습니다.');
    snapshotRetryMutation.mutate(
      { businessDate: run.businessDate },
      {
        onSuccess: () => {
          if (isCurrentRetryJob(sourceJobId)) {
            onAnnounce('스냅샷 생성 재시도가 접수되었습니다.');
          }
        },
      }
    );
  }

  function handleRetryAi() {
    if (!canTrigger || run.rawStatus !== 'PARTIAL' || isRetryPendingForRun) {
      return;
    }

    const sourceJobId = run.id;
    onAnnounce('AI 요약 재시도를 요청하고 있습니다.');
    retryAiMutation.mutate(
      { jobId: sourceJobId },
      {
        onSuccess: () => {
          if (isCurrentRetryJob(sourceJobId)) {
            onAnnounce('AI 요약 재시도가 접수되었습니다.');
          }
        },
      }
    );
  }

  return (
    <div className='flex min-w-0 flex-col gap-4'>
      {/* This header owns 14px/18px padding and a full-width bottom border,
          separate from the detail body's padding. Negative margins extend
          the divider to the card edges. */}
      {/* Use an 8px row gap and 10px column gap between wrapped metadata. */}
      <div className='-mx-[18px] -mt-4 flex flex-wrap items-center gap-x-[10px] gap-y-2 border-b border-line px-[18px] py-[14px]'>
        <h2
          className='m-0 text-h2 font-semibold text-fg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
          ref={detailHeadingRef}
          tabIndex={-1}
        >
          job {run.id}
        </h2>
        {/* Header order: jobId · type · status · business date. */}
        <BatchTypeBadge jobType={run.jobType} />
        <StatusBadge status={run.rawStatus} />
        <span className='tnum text-body-sm text-fg-soft'>
          {run.businessDate}
        </span>
      </div>

      <DescriptionList>
        <DescriptionListItem label='시작' value={run.startedAt} />
        <DescriptionListItem
          label='종료'
          value={running && run.finishedAt === '-' ? '진행 중' : run.finishedAt}
        />
        <DescriptionListItem label='소요' value={run.duration} />
        {/* Keep the counts label consistent with the history list. */}
        {hasSnapshot ? (
          <DescriptionListItem label='원문/정제/이슈' value={run.counts} />
        ) : null}
        <DescriptionListItem label='스냅샷' value={getSnapshotLabel(run)} />
        {hasSnapshot ? (
          <DescriptionListItem
            label='실행 옵션'
            value={`force=${run.forceRun ?? false} · rebuildPageOnly=${run.rebuildPageOnly ?? false}`}
          />
        ) : null}
      </DescriptionList>

      <PipelineStages steps={run.steps} />

      {impacts.length > 0 ? (
        <div className='min-w-0'>
          <h3 className='m-0 mb-1.5 text-card-heading font-semibold text-fg'>
            사용자 영향
          </h3>
          <ul className='measure-summary wrap-anywhere m-0 flex list-disc flex-col gap-1 pl-5 text-body text-fg-soft'>
            {impacts.map((impact) => (
              <li key={impact}>{impact}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasError ? (
        <div className={`min-w-0 rounded-md border p-3 ${TONE_SURFACE.danger}`}>
          {run.errorCode ? (
            <p className='mono m-0 font-semibold text-danger'>
              {run.errorCode}
            </p>
          ) : null}
          {run.errorMessage ? (
            <p className='measure-summary wrap-anywhere m-0 mt-1 text-body text-fg'>
              {run.errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      {snapshotRetryError ? (
        <RetryErrorAlert
          error={snapshotRetryError}
          title='스냅샷 생성 재시도 실패'
        />
      ) : null}

      {snapshotRetrySuccess && snapshotRetryMutation.data ? (
        <RetryAcceptedAlert
          jobId={snapshotRetryMutation.data.jobId}
          status={snapshotRetryMutation.data.status}
          title='스냅샷 생성 재시도가 접수되었습니다.'
        />
      ) : null}

      {aiRetryError ? (
        <RetryErrorAlert error={aiRetryError} title='AI 요약 재시도 실패' />
      ) : null}

      {aiRetrySuccess && retryAiMutation.data ? (
        <RetryAcceptedAlert
          jobId={retryAiMutation.data.jobId}
          status={retryAiMutation.data.status}
          title='AI 요약 재시도가 접수되었습니다.'
        />
      ) : null}

      <div className='min-w-0'>
        {/* Keep the log heading and actions in one wrapping row. */}
        {run.logSummary ? (
          <LogBox
            content={run.logSummary}
            heading={
              <h3 className='m-0 text-card-heading font-semibold text-fg'>
                실행 로그
              </h3>
            }
          />
        ) : (
          <>
            <h3 className='m-0 mb-1.5 text-card-heading font-semibold text-fg'>
              실행 로그
            </h3>
            <p className='m-0 text-body-sm text-faint'>실행 로그가 없습니다.</p>
          </>
        )}
      </div>

      <div className='flex flex-wrap items-center gap-2 pt-1'>
        {snapshotHref ? (
          <a
            className='inline-flex min-h-10 items-center rounded-md border border-line-strong px-3.5 text-body font-semibold text-fg transition-[scale,background-color] duration-(--dur-fast) ease-(--ease) hover:bg-surface-2 active:scale-[0.98]'
            href={withBasePath(snapshotHref)}
            onClick={createNavigateHandler(snapshotHref)}
          >
            {run.businessDate} 스냅샷 열기
          </a>
        ) : null}
        {canTrigger && run.rawStatus === 'PARTIAL' ? (
          <AsyncButton
            loading={isRetryPendingForRun}
            onClick={handleRetryAi}
            size='sm'
            type='button'
            variant='secondary'
          >
            AI 요약만 재시도
          </AsyncButton>
        ) : null}
        {/* The heavier full rerun sits last: for a PARTIAL run the cheaper
            AI-only retry is usually the right first move. */}
        {canRetrySnapshot ? (
          <AsyncButton
            loading={isSnapshotRetryPendingForRun}
            onClick={handleRetrySnapshot}
            size='sm'
            type='button'
            variant='outline'
          >
            스냅샷 생성 재시도
          </AsyncButton>
        ) : null}
      </div>
    </div>
  );
}
