import { type BatchStage, getBatchTypeInfo } from '@/lib/batch-type';
import { cn } from '@/lib/utils';

/**
 * PipelineStages — README §7-6 + §14 "파이프라인 단계 상태" backend gap.
 *
 * **2026-08 갱신**: 아래 원래 주석("백엔드는 단계별 status/duration을 반환
 * 하지 않는다 — 우리가 아는 건 job 전체의 status와 errorCode뿐이다")은 이제
 * 절반만 맞다. `docs/api_spec.json`의 `BatchJobListItemResponse`/
 * `BatchJobDetailResponse`가 둘 다 `currentStep`(현재/마지막 단계명, 또는
 * `null`)을 제공한다는 게 확인됐다 — 예전에는 없던 필드다. 그래서 RUNNING/
 * PENDING 상태의 "어느 단계가 실행 중인가"는 더 이상 추측이 아니라
 * `currentStep`을 단계명과 매칭해 직접 읽는다(아래 `findCurrentStageIndex`).
 * 이 프리미스 변경과 예전 "정직한 추측" 블록을 왜 지웠는지는
 * `docs/design_v2/v2-decisions.md` §10에 기록했다 — 여기서 지우지 않고
 * 남겨둔 이유 그대로.
 *
 * 바뀌지 않은 것: **소요 시간(duration)은 여전히 없다.** `currentStep`은
 * 단계 "이름"만 알려줄 뿐 단계별 timing은 스펙 어디에도 없으므로, 이
 * 컴포넌트는 여전히 소요 시간을 지어내지 않는다(§14/§10 결정 그대로 유지).
 * 헤더 옆의 `PROPOSED · BACKEND` 배지도 유지한다 — "이건 백엔드가 준 값 그대로
 * 가 아니라 우리가 단계명을 매칭해 구성한 뷰"라는 사실은 currentStep이
 * 생겨도 바뀌지 않는다.
 *
 * 단계 목록은 더 이상 8개 고정이 아니라 jobType별 6개다 — 두 배치 타입
 * (`NEWS_COLLECTION`/`MARKET_SNAPSHOT`)이 서로 다른 파이프라인을 돈다
 * (`src/lib/batch-type.ts`). `jobType`이 알려진 값이 아니면 어떤 단계
 * 목록도 지어내지 않고 이 블록 전체를 렌더하지 않는다.
 *
 * FAILED일 때 실패 stage 추정은 그대로 `errorCode`의 키워드로 최선 추정
 * 한다(이번 pass는 손대지 않았다 — jobType별 단계 목록으로 갈라지면서
 * "키워드 → 이 타입 목록에 있는 stage 이름"으로 조회 방식만 바뀌었다).
 * 매칭되는 키워드가 없거나, 매칭된 stage가 이 jobType의 목록에 없으면
 * "어느 단계인지 알 수 없음"을 그대로 노출한다(허구의 stage를 FAILED로
 * 찍지 않는다).
 */

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
  pending: 'text-[color:var(--text-faint)]',
  unknown: 'text-[color:var(--text-faint)]',
};

// errorCode 키워드 → stage LABEL(index가 아니라 이름). jobType별 6단계
// 목록으로 갈라지면서 예전의 고정 index(1~6, 8단계 기준) 방식은 더 이상
// 안전하지 않다 — 같은 키워드라도 타입에 따라 그 단계가 목록에 아예 없을
// 수 있다(예: NEWS_COLLECTION에는 '클러스터 구성'이 없다). 그래서 이름으로
// 매칭한 뒤, 호출부에서 "이 jobType의 실제 목록에 그 이름이 있는지"를
// `stageNames.indexOf`로 재확인한다 — 없으면 매칭 실패로 취급(§14 최선
// 추정 원칙 그대로).
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

/**
 * `currentStep`을 이 jobType의 단계 목록과 매칭한다.
 *
 * `docs/api_spec.json`이 `currentStep`의 wire 형식을 enum/example로 명시하지
 * 않으므로, 문서화된 두 후보 — snake_case `key`(`load_search_result`)와 한글
 * `label`(`검색 결과 적재`) — 를 **모두** 인정한다. 근거는 `BatchStage`의
 * 주석 참고. 대소문자와 앞뒤 공백만 무시하고, 그 외 느슨한 매칭(부분 일치
 * 등)은 하지 않는다 — 어느 후보와도 안 맞으면 잘못 추측하는 대신 그대로
 * "확인 불가"로 떨어뜨린다.
 */
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
    // currentStep이 없거나 알려진 단계(key/label 어느 쪽과도) 안 맞는 경우:
    // 어느 단계도 "실행 중"으로 찍지 않는다(§14 — 없는 신호를 지어내지
    // 않는다). 작업이 존재하고 RUNNING/PENDING 상태라는 것 자체가 최소한
    // 시작은 됐다는 뜻이므로 1단계(작업 생성)만 성공으로 보고, 나머지는
    // "확인 불가"로 남긴다.
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

  // SUCCESS / READY / PARTIAL 등 — job이 끝까지 실행됐다고 간주.
  return stages.map((stage) => ({ name: stage.label, tone: 'success' }));
}

export type PipelineStagesProps = {
  jobStatus: string;
  /** `BatchJobType` 원본 문자열 — 알려지지 않은 값이면 컴포넌트가 아무것도 렌더하지 않는다(파이프라인 목록을 지어낼 수 없으므로). */
  jobType: string;
  /** 현재/마지막 파이프라인 단계명, 또는 `null`/미제공. */
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
        <h3 className='m-0 text-[15px] font-semibold text-[color:var(--text)]'>
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
            <span className='min-w-0 flex-1 text-[13.5px] font-medium text-[color:var(--text)]'>
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
            <span className='mono shrink-0 text-right text-[12.5px] font-semibold text-[color:var(--text-soft)]'>
              {STAGE_STATUS_LABELS[stage.tone]}
              {/* 소요 시간: 여전히 없다(파일 상단 주석 참고). 이 항상-"-"
                  컬럼은 디자인의 단계 행 모양(상태어 + 그 아래 소요 시간
                  줄)과 레이아웃 패리티를 맞추려고 의도적으로 유지한다 —
                  `docs/design_v2/v2-decisions.md` §10. */}
              <span className='mono block text-[11px] font-normal text-[color:var(--text-faint)]'>
                -
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
