import { cn } from '@/lib/utils';

/**
 * PipelineStages — README §7-6 + §14 "파이프라인 단계 상태" backend gap.
 *
 * 8단계는 `app/batch/steps/` 모듈명 기준(README §7-6)이다. **백엔드는
 * 단계별 status/duration을 반환하지 않는다** — 우리가 아는 건 job 전체의
 * `status`와 (있다면) `errorCode`뿐이다. 그래서:
 *
 * - 헤더 옆에 `PROPOSED · BACKEND` 배지를 항상 보여줘 "이건 관찰이 아니라
 *   추정"임을 명시한다(§14).
 * - 소요 시간은 절대 지어내지 않는다 — 상태어만 보여준다.
 * - 실패 stage는 `errorCode`의 키워드로 최선 추정한다. 매칭되는 키워드가
 *   없으면 "어느 단계인지 알 수 없음"을 그대로 노출한다(허구의 stage를
 *   FAILED로 찍지 않는다) — 이 휴리스틱의 키워드 목록은 실제 백엔드
 *   에러코드 체계를 알기 전까지의 최선 추정이며, 실제 계약이 생기면
 *   `inferFailedStageIndex`만 교체하면 된다.
 */

type PipelineStageTone =
  | 'success'
  | 'running'
  | 'failed'
  | 'skipped'
  | 'pending'
  | 'unknown';

const STAGE_NAMES = [
  '작업 생성',
  '뉴스 수집',
  '지수 수집',
  '중복 제거',
  '클러스터 구성',
  'AI 요약 생성',
  '페이지 스냅샷',
  '작업 종료',
] as const;

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

// errorCode 키워드 → stage index(1~6, 뉴스 수집..페이지 스냅샷 사이).
// 실제 백엔드 에러코드 체계가 확인되면 이 표만 교체하면 된다(§14).
const STAGE_KEYWORD_TABLE: ReadonlyArray<readonly [RegExp, number]> = [
  [/NEWS/, 1],
  [/INDEX|PRICE|MARKET_DATA|QUOTE/, 2],
  [/DEDUP|DUPLICATE/, 3],
  [/CLUSTER/, 4],
  [/SUMMARY|AI|LLM|GPT/, 5],
  [/SNAPSHOT|PAGE/, 6],
];

function inferFailedStageIndex(errorCode: string | null | undefined) {
  if (!errorCode) {
    return null;
  }

  const upper = errorCode.toUpperCase();
  const match = STAGE_KEYWORD_TABLE.find(([pattern]) => pattern.test(upper));
  return match ? match[1] : null;
}

type StageDescriptor = {
  name: string;
  tone: PipelineStageTone;
  note?: string;
};

const UNKNOWN_STAGE_NOTE =
  '어느 단계에서 실패했는지 백엔드가 제공하지 않습니다';
const SKIPPED_NOTE = '이전 단계 실패로 건너뜀';

function deriveStages(
  jobStatus: string,
  errorCode: string | null | undefined
): StageDescriptor[] {
  const normalized = jobStatus.trim().toUpperCase();
  const names = STAGE_NAMES;

  if (normalized === 'FAILED') {
    const failedIndex = inferFailedStageIndex(errorCode);

    if (failedIndex === null) {
      return names.map((name, index) => ({
        name,
        tone: index === 0 ? 'success' : 'unknown',
        note: index === 1 ? UNKNOWN_STAGE_NOTE : undefined,
      }));
    }

    return names.map((name, index) => {
      if (index < failedIndex) {
        return { name, tone: 'success' };
      }
      if (index === failedIndex) {
        return { name, tone: 'failed' };
      }
      return { name, tone: 'skipped', note: SKIPPED_NOTE };
    });
  }

  if (normalized === 'RUNNING' || normalized === 'PENDING') {
    // E6 (parity cycle 2): the design's RUNNING example marks exactly ONE
    // stage "실행 중" (whichever one is actually in flight) — stages before
    // it are 성공, stages after it are 대기. The backend gives us no
    // per-stage signal at all (confirmed PROPOSED · BACKEND), so we can't
    // know which real stage is active; but marking nearly every stage
    // "실행 중" (the previous behavior) was actively misleading, not just a
    // style mismatch. Stage 1 (뉴스 수집) is the one honest guess we can
    // make — a batch job that's still RUNNING has, at minimum, started —
    // and its note says plainly that we don't have real per-stage progress.
    // E6 (parity cycle 3, findings-cycle-3.md "Explicitly NOT to be
    // changed"): the design prototype's RUNNING fixture (job 1042)
    // FABRICATES per-stage completion and elapsed time — 작업 생성 성공/1초
    // · 뉴스 수집 성공/1분 36초 · 지수 수집 성공/12초 · 중복 제거 실행 중—
    // none of which the backend actually returns (this whole block is
    // tagged `PROPOSED · BACKEND` in the design itself). Rendering that
    // fabricated detail here would misrepresent a missing backend
    // capability as working. This divergence from the design capture is
    // deliberate and intentionally preserved — see
    // `docs/design_v2/v2-decisions.md` §10 for the recorded decision. Do
    // NOT "fix" this to match the composite.
    return names.map((name, index) => {
      if (index === 0) {
        return { name, tone: 'success' };
      }
      if (index === 1) {
        return {
          name,
          tone: 'running',
          note: '세부 단계 진행률은 제공되지 않습니다',
        };
      }
      return { name, tone: 'pending' };
    });
  }

  // SUCCESS / READY / PARTIAL 등 — job이 끝까지 실행됐다고 간주.
  return names.map((name) => ({ name, tone: 'success' }));
}

export type PipelineStagesProps = {
  jobStatus: string;
  errorCode?: string | null;
  className?: string;
};

export function PipelineStages({
  jobStatus,
  errorCode,
  className,
}: PipelineStagesProps) {
  const stages = deriveStages(jobStatus, errorCode);

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
              {/* E6: design shows a per-stage duration line below the
                  status word. The backend has no per-stage timing at all
                  (confirmed PROPOSED · BACKEND) — never fabricated, so this
                  is always the same "unknown" dash design itself renders
                  for any stage whose own duration is null.
                  This literal always-"-" column is kept (not dropped)
                  deliberately for layout parity with the design's per-stage
                  row shape (status word + duration line stacked) — see
                  `docs/design_v2/v2-decisions.md` §10. It can never show a
                  real value until the backend adds per-stage timing. */}
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
