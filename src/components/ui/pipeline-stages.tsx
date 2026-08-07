import { type BatchStage, getBatchTypeInfo } from '@/lib/batch-type';
import { cn } from '@/lib/utils';

/** Uses currentStep/errorCode signals without inventing stage timing or unknown type lists. */

type PipelineStageTone =
  | 'success'
  | 'running'
  | 'failed'
  | 'skipped'
  | 'pending'
  | 'unknown';

const STAGE_STATUS_LABELS: Readonly<Record<PipelineStageTone, string>> = {
  success: '성공',
  running: '실행 중',
  failed: '실패',
  skipped: '건너뜀',
  pending: '대기',
  unknown: '확인 불가',
};

const TONE_DOT_CLASSES: Readonly<Record<PipelineStageTone, string>> = {
  success:
    '[--tone:var(--success)] [--tone-soft:var(--success-soft)] bg-[color:var(--tone)] shadow-[0_0_0_2px_var(--tone-soft)]',
  running:
    '[--tone:var(--info)] [--tone-soft:var(--info-soft)] bg-[color:var(--tone)] shadow-[0_0_0_2px_var(--tone-soft)]',
  failed:
    '[--tone:var(--danger)] [--tone-soft:var(--danger-soft)] bg-[color:var(--tone)] shadow-[0_0_0_2px_var(--tone-soft)]',
  skipped:
    '[--tone:var(--neutral)] [--tone-soft:var(--neutral-soft)] bg-[color:var(--tone)] shadow-[0_0_0_2px_var(--tone-soft)]',
  pending:
    '[--tone:var(--neutral)] [--tone-soft:var(--neutral-soft)] bg-[color:var(--tone)] shadow-[0_0_0_2px_var(--tone-soft)]',
  unknown:
    '[--tone:var(--neutral)] [--tone-soft:var(--neutral-soft)] bg-[color:var(--tone)] shadow-[0_0_0_2px_var(--tone-soft)]',
};

const NOTE_CLASSES: Readonly<Record<PipelineStageTone, string>> = {
  success: 'text-[color:var(--success)]',
  running: 'text-[color:var(--info)]',
  failed: 'text-[color:var(--danger)]',
  skipped: 'text-[color:var(--neutral)]',
  pending: 'text-faint',
  unknown: 'text-faint',
};

// Match error keywords to labels, then verify the label exists in this job type's stages.
const STAGE_KEYWORD_TABLE: ReadonlyArray<readonly [RegExp, string]> = [
  [/NEWS/, '뉴스 수집'],
  [/INDEX|PRICE|MARKET_DATA|QUOTE/, '지수 수집'],
  [/DEDUP|DUPLICATE/, '중복 제거'],
  [/CLUSTER/, '클러스터 구성'],
  [/SUMMARY|AI|LLM|GPT/, 'AI 요약 생성'],
  [/SNAPSHOT|PAGE/, '페이지 스냅샷'],
];

function inferFailedStageIndex(
  stages: readonly BatchStage[],
  errorCode: string | null | undefined
): number | null {
  if (!errorCode) {
    return null;
  }

  const upper = errorCode.toUpperCase();
  const match = STAGE_KEYWORD_TABLE.find(([pattern]) => pattern.test(upper));

  if (!match) {
    return null;
  }

  const index = stages.findIndex((stage) => stage.label === match[1]);
  return index === -1 ? null : index;
}

/** Match either the documented stage key or label; unknown values remain unconfirmed. */
function findCurrentStageIndex(
  stages: readonly BatchStage[],
  currentStep: string | null | undefined
): number | null {
  if (!currentStep) {
    return null;
  }

  const needle = currentStep.trim().toLowerCase();

  if (!needle) {
    return null;
  }

  const index = stages.findIndex(
    (stage) =>
      stage.key.toLowerCase() === needle || stage.label.toLowerCase() === needle
  );
  return index === -1 ? null : index;
}

type StageDescriptor = {
  name: string;
  tone: PipelineStageTone;
  note?: string;
};

const UNKNOWN_STAGE_NOTE =
  '어느 단계에서 실패했는지 백엔드가 제공하지 않습니다';
const SKIPPED_NOTE = '이전 단계 실패로 건너뜀';
const CURRENT_STEP_UNKNOWN_NOTE =
  '현재 단계를 확인할 수 없습니다 (currentStep 값이 알려진 단계와 일치하지 않음)';

function deriveFailedStages(
  stages: readonly BatchStage[],
  errorCode: string | null | undefined
): StageDescriptor[] {
  const failedIndex = inferFailedStageIndex(stages, errorCode);

  if (failedIndex === null) {
    return stages.map((stage, index) => ({
      name: stage.label,
      tone: index === 0 ? 'success' : 'unknown',
      note: index === 1 ? UNKNOWN_STAGE_NOTE : undefined,
    }));
  }

  return stages.map((stage, index) => {
    if (index < failedIndex) {
      return { name: stage.label, tone: 'success' };
    }
    if (index === failedIndex) {
      return { name: stage.label, tone: 'failed' };
    }
    return { name: stage.label, tone: 'skipped', note: SKIPPED_NOTE };
  });
}

function deriveRunningStages(
  stages: readonly BatchStage[],
  currentStep: string | null | undefined
): StageDescriptor[] {
  const runningIndex = findCurrentStageIndex(stages, currentStep);

  if (runningIndex === null) {
    // Without a known currentStep, do not guess a running stage.
    return stages.map((stage, index) => ({
      name: stage.label,
      tone: index === 0 ? 'success' : 'unknown',
      note: index === 1 ? CURRENT_STEP_UNKNOWN_NOTE : undefined,
    }));
  }

  return stages.map((stage, index) => {
    if (index < runningIndex) {
      return { name: stage.label, tone: 'success' };
    }
    if (index === runningIndex) {
      return { name: stage.label, tone: 'running' };
    }
    return { name: stage.label, tone: 'pending' };
  });
}

function deriveStages(
  jobStatus: string,
  errorCode: string | null | undefined,
  stages: readonly BatchStage[],
  currentStep: string | null | undefined
): StageDescriptor[] {
  const normalized = jobStatus.trim().toUpperCase();

  if (normalized === 'FAILED') {
    return deriveFailedStages(stages, errorCode);
  }

  if (normalized === 'RUNNING' || normalized === 'PENDING') {
    return deriveRunningStages(stages, currentStep);
  }

  return stages.map((stage) => ({ name: stage.label, tone: 'success' }));
}

export type PipelineStagesProps = {
  jobStatus: string;
  jobType: string;
  currentStep?: string | null;
  errorCode?: string | null;
  className?: string;
};

export function PipelineStages({
  jobStatus,
  jobType,
  currentStep,
  errorCode,
  className,
}: PipelineStagesProps) {
  const typeStages = getBatchTypeInfo(jobType).stages;

  if (!typeStages) {
    return null;
  }

  const stages = deriveStages(jobStatus, errorCode, typeStages, currentStep);

  return (
    <div className={cn('min-w-0', className)}>
      <div className='mb-2 flex items-center gap-2'>
        <h3 className='m-0 text-[15px] font-semibold text-fg'>
          파이프라인 단계
        </h3>
        <span className='inline-flex items-center rounded-[var(--r-sm)] border border-[color:var(--neutral-line)] bg-[color:var(--neutral-soft)] px-1.5 py-0.5 text-[11px] font-semibold text-[color:var(--neutral)]'>
          PROPOSED · BACKEND
        </span>
      </div>
      <ol className='m-0 flex list-none flex-col gap-2 p-0'>
        {stages.map((stage) => (
          <li
            className='flex min-w-0 items-center gap-2 rounded-[var(--r-sm)] px-2 py-1.5'
            key={stage.name}
          >
            <span
              aria-hidden='true'
              className={cn(
                'size-[9px] shrink-0 rounded-full',
                TONE_DOT_CLASSES[stage.tone]
              )}
            />
            <span className='min-w-0 flex-1 text-[13.5px] font-medium text-fg'>
              {stage.name}
              {stage.note ? (
                <span
                  className={cn(
                    'wrap-anywhere ml-2 text-[12px] font-normal',
                    NOTE_CLASSES[stage.tone]
                  )}
                >
                  {stage.note}
                </span>
              ) : null}
            </span>
            <span className='mono shrink-0 text-right text-[12.5px] font-semibold text-fg-soft'>
              {STAGE_STATUS_LABELS[stage.tone]}
              {/* 소요 시간: 여전히 없다(파일 상단 주석 참고). 이 항상-"-"
                  컬럼은 디자인의 단계 행 모양(상태어 + 그 아래 소요 시간
                  줄)과 레이아웃 패리티를 맞추려고 의도적으로 유지한다 —
                  `docs/design_v2/v2-decisions.md` §10. */}
              <span className='mono block text-[11px] font-normal text-faint'>
                -
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
