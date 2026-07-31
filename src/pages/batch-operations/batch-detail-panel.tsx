import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState, InlineAlert, StatusBadge } from '@/components/state';
import { SkeletonText } from '@/components/state/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogBox } from '@/components/ui/log-box';
import { PipelineStages } from '@/components/ui/pipeline-stages';
import { createNavigateHandler } from '@/lib/app-state';
import type { BatchRunRow } from '@/lib/query-hooks';
import { buildUrl, withBasePath } from '@/lib/router';
import { cn } from '@/lib/utils';

import {
  deriveUserImpact,
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
  onRetry: () => void;
  onAnnounce: (message: string) => void;
  onBackToList: () => void;
  onReRun: (businessDate: string) => void;
  /** Hidden below the master-detail breakpoint unless `view=detail` is active (README §7-6 drill-in). */
  hiddenOnNarrowView: boolean;
};

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
      <dt className='m-0 text-[11px] font-semibold tracking-[0.07em] text-[color:var(--text-faint)] uppercase'>
        {label}
      </dt>
      <dd className='mono wrap-anywhere m-0 mt-0.5 text-[color:var(--text)]'>
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
  onRetry,
  onAnnounce,
  onBackToList,
  onReRun,
  hiddenOnNarrowView,
}: BatchDetailPanelProps) {
  const retry = useRetryAnnounce(isFetching, isError, onAnnounce);

  return (
    <Card
      className={cn('min-w-0', hiddenOnNarrowView && 'max-[1180px]:hidden')}
    >
      <CardContent
        className='flex min-w-0 flex-col gap-4 p-4'
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
          <BatchDetailContent onReRun={onReRun} run={run} />
        )}
      </CardContent>
    </Card>
  );
}

function BatchDetailContent({
  run,
  onReRun,
}: {
  run: BatchRunRow;
  onReRun: (businessDate: string) => void;
}) {
  const running = isRunningStatus(run.rawStatus);
  const retryable = isRetryableStatus(run.rawStatus);
  const impacts = deriveUserImpact({
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

  return (
    <div className='flex min-w-0 flex-col gap-4'>
      <div className='flex flex-wrap items-center gap-2'>
        {/* parity cycle A3: per-block card-heading size (see
            archive-search-filters.tsx's comment) — the ops detail heading
            measures 14.5px in the design, not the README §6 17px scale. */}
        <h2 className='mono m-0 text-[14.5px] font-semibold text-[color:var(--text)]'>
          job {run.id}
        </h2>
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
        <DlItem label='원문/정제/이슈' value={run.counts} />
        <DlItem
          label='스냅샷'
          value={
            run.pageId !== null
              ? `pageId ${run.pageId} · ${run.pageVersion}`
              : '스냅샷 없음'
          }
        />
        <DlItem
          label='실행 옵션'
          value={`force=${run.forceRun ?? false} · rebuildPageOnly=${run.rebuildPageOnly ?? false}`}
        />
      </Dl>

      <PipelineStages errorCode={run.errorCode} jobStatus={run.rawStatus} />

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
        <span className='mono text-[12px] font-semibold text-[color:var(--text-faint)]'>
          {retryable ? '재실행 가능' : '재실행 불필요'}
        </span>
      </div>
    </div>
  );
}
