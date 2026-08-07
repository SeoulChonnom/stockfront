import { ArrowLeft } from 'lucide-react';
import { type ReactNode, type RefObject, useEffect, useRef } from 'react';
import { EmptyState, InlineAlert, StatusBadge } from '@/components/state';
import { SkeletonText } from '@/components/state/skeleton';
import { BatchTypeBadge } from '@/components/ui/batch-type-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogBox } from '@/components/ui/log-box';
import { PipelineStages } from '@/components/ui/pipeline-stages';
import { ApiError } from '@/lib/api/client';
import type { AiRetryRunResponse } from '@/lib/api/types';
import { createNavigateHandler } from '@/lib/app-state';
import { isMarketSnapshotJobType } from '@/lib/batch-type';
import type { BatchRunRow, RetryAiMutationVariables } from '@/lib/query-hooks';
import { buildUrl, withBasePath } from '@/lib/router';
import { cn, isRecord } from '@/lib/utils';

import {
  deriveUserImpact,
  getSnapshotLabel,
  isRetryableStatus,
  isRunningStatus,
} from './format-batch';
import { useRetryAnnounce } from './use-retry-announce';

/**
 * README §7-6 point 6: 상세 패널. Loading/error are independent of the list
 * (§7-6 "상세 loading/error도 독립"), so this component never reads list
 * query state — it only needs `run`/`isLoading`/`isError`, driven by its
 * own `useBatchJobDetail(selectedJobId)` in the parent.
 */

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
  onReRun: (businessDate: string) => void;
  canRetryAi: boolean;
  retryAiMutation: RetryAiMutationState;
  /** Hidden below the master-detail breakpoint unless `view=detail` is active (README §7-6 drill-in). */
  hiddenOnNarrowView: boolean;
};

type RetryAiMutationState = {
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

function Dl({ children }: { children: ReactNode }) {
  return (
    // B5: design gap is 10px row / 14px column, not 8px / 16px.
    // A1 (cycle 2): design text is 12.5px, not 13.5px — no explicit
    // leading, inherits the content root's 1.6 (→ 20px, matching design).
    <dl className='m-0 grid min-w-0 grid-cols-1 gap-x-[14px] gap-y-[10px] text-[12.5px] sm:grid-cols-2'>
      {children}
    </dl>
  );
}

function DlItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className='min-w-0'>
      {/* design's `dt` for this dl carries no size/weight/case override —
          it inherits the dl's 12.5px and just gets the muted color +
          2px margin-bottom (reference: `<dt style="color:var(--fg3);
          margin-bottom:2px">`), unlike other dl instances in the app that
          do use the uppercase/tracked label treatment. */}
      <dt className='m-0 mb-0.5 text-[color:var(--text-faint)]'>{label}</dt>
      <dd className='mono wrap-anywhere m-0 text-[color:var(--text)]'>
        {value}
      </dd>
    </div>
  );
}

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
  onReRun,
  canRetryAi,
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
      {/* design's detail panel content padding is 16px vertical / 18px
          horizontal (`<div style="padding:16px 18px">` around the detail
          body in the reference), not the shared `CardContent` default's
          uniform 16px — the 2px-per-side horizontal shortfall was pushing
          every measured child (heading, dl) 2px left and 4px narrower. */}
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
            onReRun={onReRun}
            onAnnounce={onAnnounce}
            retryAiMutation={retryAiMutation}
            run={run}
          />
        )}
      </CardContent>
    </Card>
  );
}

function BatchDetailContent({
  canRetryAi,
  detailHeadingRef,
  onAnnounce,
  run,
  retryAiMutation,
  onReRun,
}: {
  canRetryAi: boolean;
  detailHeadingRef: RefObject<HTMLHeadingElement | null>;
  onAnnounce: (message: string) => void;
  run: BatchRunRow;
  retryAiMutation: RetryAiMutationState;
  onReRun: (businessDate: string) => void;
}) {
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
  // NEWS_COLLECTION 작업은 `snapshot`이 애초에 null이라(스펙상 그 잡타입은
  // 스냅샷을 만들지 않는다) `mapBatchDetailToRun`이 원문/정제/이슈·실행
  // 옵션을 0/0/0·force=false로 채운다 — 실제 값이 아니라 coerce 헬퍼의
  // "값이 없을 때의" fallback이므로, 이 잡타입에서는 두 행 자체를
  // 렌더하지 않는다(plan step 7 — 값을 숨기지 않고 그리면 없는 데이터를
  // 있는 것처럼 보여주는 셈이다).
  const hasSnapshot = isMarketSnapshotJobType(run.jobType);
  const isRetryForRun = retryAiMutation.variables?.jobId === run.id;
  const isRetryPendingForRun = isRetryForRun && retryAiMutation.isPending;
  const aiRetryError =
    isRetryForRun && retryAiMutation.isError
      ? toAiRetryErrorView(retryAiMutation.error)
      : null;
  const aiRetrySuccess = isRetryForRun && retryAiMutation.isSuccess;
  const currentRunIdRef = useRef(run.id);

  useEffect(() => {
    currentRunIdRef.current = run.id;
  }, [run.id]);

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
          if (currentRunIdRef.current === sourceJobId) {
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
      <div className='-mx-[18px] -mt-4 flex flex-wrap items-center gap-x-[10px] gap-y-2 border-b border-[color:var(--line)] px-[18px] py-[14px]'>
        {/* parity cycle A3: per-block card-heading size (see
            archive-search-filters.tsx's comment) — the ops detail heading
            measures 14.5px in the design, not the README §6 17px scale.
            It also isn't mono — design's `#ops-detail-h` (`{{ dJobId }}`)
            has no font-family override and inherits the page's sans stack;
            only the numeric IDs elsewhere in this panel are mono. */}
        <h2
          className='m-0 text-[14.5px] font-semibold text-[color:var(--text)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus)]'
          ref={detailHeadingRef}
          tabIndex={-1}
        >
          job {run.id}
        </h2>
        {/* 참조(893-896행) 헤더 순서: jobId · 타입 · 상태 · 기준일. */}
        <BatchTypeBadge jobType={run.jobType} />
        <StatusBadge status={run.rawStatus} />
        <span className='mono text-[12.5px] text-[color:var(--text-soft)]'>
          {run.businessDate}
        </span>
      </div>

      <Dl>
        <DlItem label='시작' value={run.startedAt} />
        <DlItem
          label='종료'
          value={running && run.finishedAt === '-' ? '진행 중' : run.finishedAt}
        />
        <DlItem label='소요' value={run.duration} />
        {/* O4 (parity cycle 3): match batch-history-list.tsx's slash label
            — this call site still had the old middle-dot copy. */}
        {hasSnapshot ? (
          <DlItem label='원문/정제/이슈' value={run.counts} />
        ) : null}
        <DlItem label='스냅샷' value={getSnapshotLabel(run)} />
        {hasSnapshot ? (
          <DlItem
            label='실행 옵션'
            value={`force=${run.forceRun ?? false} · rebuildPageOnly=${run.rebuildPageOnly ?? false}`}
          />
        ) : null}
      </Dl>

      <PipelineStages
        currentStep={run.currentStep}
        errorCode={run.errorCode}
        jobStatus={run.rawStatus}
        jobType={run.jobType}
      />

      {impacts.length > 0 ? (
        <div className='min-w-0'>
          <h3 className='m-0 mb-1.5 text-[15px] font-semibold text-[color:var(--text)]'>
            사용자 영향
          </h3>
          <ul className='wrap-anywhere m-0 flex list-disc flex-col gap-1 pl-5 text-[13.5px] text-[color:var(--text-soft)]'>
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
            <p className='wrap-anywhere m-0 mt-1 text-[13.5px] text-[color:var(--text)]'>
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
        {/* O3 (parity cycle 3): design keeps the heading and 복사/전체보기
            buttons on one wrapping row — pass the heading into `LogBox` so
            it renders inside that row instead of stacked above it. */}
        {run.logSummary ? (
          <LogBox
            content={run.logSummary}
            heading={
              <h3 className='m-0 text-[15px] font-semibold text-[color:var(--text)]'>
                실행 로그
              </h3>
            }
          />
        ) : (
          <>
            <h3 className='m-0 mb-1.5 text-[15px] font-semibold text-[color:var(--text)]'>
              실행 로그
            </h3>
            <p className='m-0 text-[12.5px] text-[color:var(--text-faint)]'>
              실행 로그가 없습니다.
            </p>
          </>
        )}
      </div>

      <div className='flex flex-wrap items-center gap-2 pt-1'>
        {snapshotHref ? (
          <a
            className='inline-flex min-h-10 items-center rounded-[var(--r-md)] border border-[color:var(--line-strong)] px-3.5 text-[13.5px] font-semibold text-[color:var(--text)] hover:-translate-y-px'
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
        <span className='mono text-[12px] font-semibold text-[color:var(--text-faint)]'>
          {retryable ? '재실행 가능' : '재실행 불필요'}
        </span>
      </div>
    </div>
  );
}
