import type { RefObject } from 'react';
import { InlineAlert, StatusBadge } from '@/components/state';
import { BatchTypeBadge } from '@/components/ui/batch-type-badge';
import { Button } from '@/components/ui/button';
import {
  DescriptionList,
  DescriptionListItem,
} from '@/components/ui/description-list';
import { LogBox } from '@/components/ui/log-box';
import { PipelineStages } from '@/components/ui/pipeline-stages';
import { ApiError } from '@/lib/api/client';
import type { AiRetryRunResponse } from '@/lib/api/types';
import { createNavigateHandler } from '@/lib/app-state';
import { isMarketSnapshotJobType } from '@/lib/batch-type';
import type { BatchRunRow, RetryAiMutationVariables } from '@/lib/query-hooks';
import { buildUrl, withBasePath } from '@/lib/router';
import { isRecord } from '@/lib/utils';

import {
  deriveUserImpact,
  getSnapshotLabel,
  isRetryableStatus,
  isRunningStatus,
} from './format-batch';

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

export type BatchDetailContentProps = {
  canRetryAi: boolean;
  detailHeadingRef: RefObject<HTMLHeadingElement | null>;
  isCurrentRetryJob: (jobId: number) => boolean;
  onAnnounce: (message: string) => void;
  onReRun: (businessDate: string) => void;
  retryAiMutation: RetryAiMutationState;
  run: BatchRunRow;
};

type AiRetryErrorView = {
  code: string;
  message: string;
  status: number;
};

function toAiRetryErrorView(error: unknown): AiRetryErrorView {
  if (!(error instanceof ApiError)) {
    return {
      code: 'NETWORK_ERROR',
      message: '네트워크에 연결할 수 없습니다.',
      status: 0,
    };
  }

  const body = isRecord(error.body) ? error.body : null;
  const bodyError = body && isRecord(body.error) ? body.error : null;
  const code =
    (bodyError && typeof bodyError.code === 'string'
      ? bodyError.code
      : body && typeof body.code === 'string'
        ? body.code
        : undefined) ??
    (error.status === 409 ? 'AI_RETRY_IN_PROGRESS' : 'AI_RETRY_ERROR');
  const backendMessage =
    bodyError && typeof bodyError.message === 'string'
      ? bodyError.message
      : body && typeof body.message === 'string'
        ? body.message
        : null;

  return {
    code,
    message:
      backendMessage ??
      (error.status === 409
        ? 'AI 요약 재시도가 이미 진행 중입니다.'
        : error.status === 403
          ? 'AI 요약 재시도 권한이 없습니다.'
          : error.status === 0
            ? '네트워크에 연결할 수 없습니다.'
            : 'AI 요약 재시도 요청을 처리하지 못했습니다.'),
    status: error.status,
  };
}

export function BatchDetailContent({
  canRetryAi,
  detailHeadingRef,
  isCurrentRetryJob,
  onAnnounce,
  run,
  retryAiMutation,
  onReRun,
}: BatchDetailContentProps) {
  const running = isRunningStatus(run.rawStatus);
  const retryable = isRetryableStatus(run.rawStatus);
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

  function handleRetryAi() {
    if (!canRetryAi || run.rawStatus !== 'PARTIAL' || isRetryPendingForRun) {
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
      {/* 참조 889행: 이 헤더 바는 본문(16px/18px, `CardContent`의 앰비언트
          padding)과 별개로 자기 몫의 `padding:14px 18px` +
          `border-bottom:1px solid var(--line)`을 갖는다(목록 패널 헤더와
          같은 패턴, `batch-history-list.tsx` 참고). `CardContent`가
          모든 자식에 균일한 18px/16px padding을 주는 구조라, 음수 마진으로
          카드 가장자리까지 뺀 뒤 이 행만 자기 padding·구분선을 다시
          그린다 — divider가 부모 padding에 막혀 18px씩 짧아지지 않게
          하려면 가로 방향도 카드 가장자리까지 닿아야 한다. */}
      {/* 참조 889행 `gap:8px 10px`(row 8px / column 10px) — 균일한 8px이
          아니다. 이 행의 4개 아이템(제목·타입 배지·상태 배지·날짜) 사이
          가로 간격이 정확히 2px씩 밀려나던 원인이 이 근사치였다. */}
      <div className='-mx-[18px] -mt-4 flex flex-wrap items-center gap-x-[10px] gap-y-2 border-b border-line px-[18px] py-[14px]'>
        {/* Keep this dense card heading at 14.5px in the page sans stack. */}
        <h2
          className='m-0 text-card-heading font-semibold text-fg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus)]'
          ref={detailHeadingRef}
          tabIndex={-1}
        >
          job {run.id}
        </h2>
        {/* 참조(893-896행) 헤더 순서: jobId · 타입 · 상태 · 기준일. */}
        <BatchTypeBadge jobType={run.jobType} />
        <StatusBadge status={run.rawStatus} />
        <span className='mono text-body-sm text-fg-soft'>
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

      <PipelineStages
        currentStep={run.currentStep}
        errorCode={run.errorCode}
        jobStatus={run.rawStatus}
        jobType={run.jobType}
      />

      {impacts.length > 0 ? (
        <div className='min-w-0'>
          <h3 className='m-0 mb-1.5 text-[15px] font-semibold text-fg'>
            사용자 영향
          </h3>
          <ul className='wrap-anywhere m-0 flex list-disc flex-col gap-1 pl-5 text-body text-fg-soft'>
            {impacts.map((impact) => (
              <li key={impact}>{impact}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasError ? (
        <div className='min-w-0 rounded-[var(--r-md)] border border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] p-3 shadow-[inset_3px_0_0_var(--danger)]'>
          {run.errorCode ? (
            <p className='mono m-0 font-semibold text-[color:var(--danger)]'>
              {run.errorCode}
            </p>
          ) : null}
          {run.errorMessage ? (
            <p className='wrap-anywhere m-0 mt-1 text-body text-fg'>
              {run.errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      {aiRetryError ? (
        <InlineAlert title='AI 요약 재시도 실패' tone='danger'>
          <span className='mono block text-[12px]'>
            {aiRetryError.status > 0
              ? `${aiRetryError.status} · ${aiRetryError.code}`
              : aiRetryError.code}
          </span>
          <span>{aiRetryError.message}</span>
        </InlineAlert>
      ) : null}

      {aiRetrySuccess && retryAiMutation.data ? (
        <InlineAlert title='AI 요약 재시도가 접수되었습니다.' tone='success'>
          job {retryAiMutation.data.jobId} · 상태 {retryAiMutation.data.status}
        </InlineAlert>
      ) : null}

      <div className='min-w-0'>
        {/* Keep the log heading and actions in one wrapping row. */}
        {run.logSummary ? (
          <LogBox
            content={run.logSummary}
            heading={
              <h3 className='m-0 text-[15px] font-semibold text-fg'>
                실행 로그
              </h3>
            }
          />
        ) : (
          <>
            <h3 className='m-0 mb-1.5 text-[15px] font-semibold text-fg'>
              실행 로그
            </h3>
            <p className='m-0 text-body-sm text-faint'>실행 로그가 없습니다.</p>
          </>
        )}
      </div>

      <div className='flex flex-wrap items-center gap-2 pt-1'>
        {snapshotHref ? (
          <a
            className='inline-flex min-h-10 items-center rounded-[var(--r-md)] border border-[color:var(--line-strong)] px-3.5 text-body font-semibold text-fg hover:-translate-y-px'
            href={withBasePath(snapshotHref)}
            onClick={createNavigateHandler(snapshotHref)}
          >
            {run.businessDate} 스냅샷 열기
          </a>
        ) : null}
        <Button
          onClick={() => onReRun(run.businessDate)}
          size='sm'
          type='button'
          variant='ghost'
        >
          같은 기준일 재실행
        </Button>
        {canRetryAi && run.rawStatus === 'PARTIAL' ? (
          <Button
            disabled={isRetryPendingForRun}
            loading={isRetryPendingForRun}
            onClick={handleRetryAi}
            size='sm'
            type='button'
            variant='secondary'
          >
            AI 요약만 재시도
          </Button>
        ) : null}
        <span className='mono text-[12px] font-semibold text-faint'>
          {retryable ? '재실행 가능' : '재실행 불필요'}
        </span>
      </div>
    </div>
  );
}
