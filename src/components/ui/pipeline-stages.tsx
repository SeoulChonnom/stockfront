import { cn } from '@/lib/utils';
import type { BatchStepRunView } from '@/lib/view-models';

/** Renders the backend's ordered step execution history as-is: no inference, no dedup. */

type PipelineStageTone = 'success' | 'running' | 'failed' | 'unknown';

const TONE_DOT_CLASSES: Readonly<Record<PipelineStageTone, string>> = {
  success:
    '[--tone:var(--success)] [--tone-soft:var(--success-soft)] bg-[color:var(--tone)] shadow-[0_0_0_2px_var(--tone-soft)]',
  running:
    '[--tone:var(--info)] [--tone-soft:var(--info-soft)] bg-[color:var(--tone)] shadow-[0_0_0_2px_var(--tone-soft)]',
  failed:
    '[--tone:var(--danger)] [--tone-soft:var(--danger-soft)] bg-[color:var(--tone)] shadow-[0_0_0_2px_var(--tone-soft)]',
  unknown:
    '[--tone:var(--neutral)] [--tone-soft:var(--neutral-soft)] bg-[color:var(--tone)] shadow-[0_0_0_2px_var(--tone-soft)]',
};

const STEP_STATUS_LABELS: Readonly<Record<string, string>> = {
  SUCCEEDED: '성공',
  RUNNING: '실행 중',
  FAILED: '실패',
};

const STEP_STATUS_TONES: Readonly<Record<string, PipelineStageTone>> = {
  SUCCEEDED: 'success',
  RUNNING: 'running',
  FAILED: 'failed',
};

export type PipelineStagesProps = {
  steps: readonly BatchStepRunView[];
  className?: string;
};

export function PipelineStages({ steps, className }: PipelineStagesProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className='mb-2 flex items-center gap-2'>
        <h3 className='m-0 text-[15px] font-semibold text-fg'>
          파이프라인 단계
        </h3>
      </div>
      {steps.length === 0 ? (
        <p className='m-0 text-body-sm text-faint'>
          스텝 실행 이력이 없습니다.
        </p>
      ) : (
        <ol className='m-0 flex list-none flex-col gap-2 p-0'>
          {steps.map((step, index) => {
            const normalized = step.status.trim().toUpperCase();
            const tone = STEP_STATUS_TONES[normalized] ?? 'unknown';
            const statusText = STEP_STATUS_LABELS[normalized] ?? step.status;

            return (
              <li
                className='flex min-w-0 items-center gap-2 rounded-[var(--r-sm)] px-2 py-1.5'
                // biome-ignore lint/suspicious/noArrayIndexKey: repeated stepCode retries are valid; API exposes no stepRunId/seq
                key={`${step.stepCode}-${index}`}
              >
                <span
                  aria-hidden='true'
                  className={cn(
                    'size-[9px] shrink-0 rounded-full',
                    TONE_DOT_CLASSES[tone]
                  )}
                />
                <span className='min-w-0 flex-1 text-body font-medium text-fg'>
                  {step.label}
                </span>
                <span className='mono shrink-0 text-right text-body-sm font-semibold text-fg-soft'>
                  {statusText}
                  <span className='mono block text-label font-normal text-faint'>
                    {step.duration}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
