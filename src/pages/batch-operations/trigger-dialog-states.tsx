import { Loader2 } from 'lucide-react';
import type { RefObject } from 'react';

import { StatusBadge } from '@/components/state';
import { Button } from '@/components/ui/button';
import type { BatchRunResponse } from '@/lib/api/types';
import { formatKstDateTime } from '@/lib/formatters';

import type { TriggerErrorView } from './trigger-error';

/** README §7-7 "pending": the form is replaced entirely, so duplicate submit is structurally impossible. */
export function TriggerPendingState({
  statusRef,
}: {
  statusRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      className='flex flex-col items-center gap-3 py-6 text-center'
      ref={statusRef}
      role='status'
      tabIndex={-1}
    >
      <Loader2
        aria-hidden='true'
        className='animate-spin text-[color:var(--info)]'
        size={28}
      />
      <p className='m-0 text-[14.5px] font-semibold text-[color:var(--text)]'>
        실행 요청을 보내고 있습니다
      </p>
      <p className='wrap-anywhere m-0 text-[13px] text-[color:var(--text-soft)]'>
        응답이 올 때까지 다시 요청할 수 없습니다. 중복 실행은 발생하지 않습니다.
      </p>
    </div>
  );
}

export function TriggerSuccessState({
  result,
  onOpenDetail,
  onClose,
}: {
  result: BatchRunResponse;
  onOpenDetail: (jobId: number) => void;
  onClose: () => void;
}) {
  const startedAtDisplay =
    formatKstDateTime(result.startedAt) ?? result.startedAt;

  return (
    <div className='flex flex-col gap-4'>
      <div className='rounded-[var(--r-md)] border border-[color:var(--success-line)] bg-[color:var(--success-soft)] p-3'>
        <dl className='m-0 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-2 text-[13.5px]'>
          <dt className='text-[color:var(--text-faint)]'>작업 ID</dt>
          <dd className='mono m-0 font-semibold text-[color:var(--text)]'>
            job {result.jobId}
          </dd>
          <dt className='text-[color:var(--text-faint)]'>상태</dt>
          <dd className='m-0'>
            <StatusBadge status={result.status} />
          </dd>
          <dt className='text-[color:var(--text-faint)]'>기준일</dt>
          <dd className='mono m-0'>{result.businessDate}</dd>
          <dt className='text-[color:var(--text-faint)]'>시작 시각</dt>
          <dd className='mono m-0'>{startedAtDisplay}</dd>
        </dl>
      </div>
      <div className='flex justify-end gap-2'>
        <Button onClick={onClose} type='button' variant='ghost'>
          닫기
        </Button>
        <Button
          onClick={() => onOpenDetail(result.jobId)}
          type='button'
          variant='primary'
        >
          작업 상세 보기
        </Button>
      </div>
    </div>
  );
}

export function TriggerErrorState({
  error,
  onBackToInput,
  onOpenExistingJob,
  onClose,
}: {
  error: TriggerErrorView;
  onBackToInput: () => void;
  onOpenExistingJob: (jobId: number) => void;
  onClose: () => void;
}) {
  return (
    <div className='flex flex-col gap-3' role='alert'>
      <div className='rounded-[var(--r-md)] border border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] p-3'>
        <p className='mono m-0 font-semibold text-[color:var(--danger)]'>
          {error.httpStatus} · {error.code}
        </p>
        <p className='wrap-anywhere m-0 mt-1 text-[13.5px] text-[color:var(--text)]'>
          {error.message}
        </p>
      </div>
      <p className='wrap-anywhere m-0 text-[12.5px] text-[color:var(--text-soft)]'>
        입력값은 그대로 유지됩니다. 원인을 확인한 뒤 다시 시도할 수 있습니다.
      </p>
      <div className='flex flex-wrap justify-end gap-2'>
        <Button onClick={onClose} type='button' variant='ghost'>
          닫기
        </Button>
        {error.existingJobId !== null ? (
          <Button
            onClick={() => onOpenExistingJob(error.existingJobId as number)}
            type='button'
            variant='ghost'
          >
            job {error.existingJobId} 열기
          </Button>
        ) : null}
        <Button onClick={onBackToInput} type='button' variant='primary'>
          입력으로 돌아가기
        </Button>
      </div>
    </div>
  );
}
